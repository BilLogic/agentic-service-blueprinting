#!/usr/bin/env python3
"""Generate a transactional Supabase/Postgres seed from a Service Blueprint IR.

Usage:
    python3 scripts/generate_seed_sql.py <ir-file> --locale <tag>
        [--out supabase/seeds/blueprint.<locale>.sql] [--verify]
        [--skip-validation]

One IR + one locale -> ONE seed SQL file (per-locale artifacts; see
references/adapter-contract.md). The seed conforms to the adapter contract's
transactional scenario-replace semantics:

  * everything runs inside a single BEGIN; ... COMMIT; transaction — a failing
    statement aborts the whole import and leaves the target untouched;
  * scenario-scoped delete-and-reinsert: each scenario in the IR is deleted by
    its UUIDv5 id (FK cascades remove paths/steps/path_steps/lanes/cells/
    triggers), then reinserted in dependency order
    paths -> steps -> path_steps -> lanes -> cells -> cell_dependencies;
  * service/phases are shared across scenarios and therefore UPSERTED
    (`on conflict (id) do update`), never deleted;
  * IDs are UUIDv5 from stable IR keys + locale (NFC-normalized), so
    re-running the same seed is idempotent by construction.

--verify additionally writes `<out>.verify.sql`, a read-back verification
script (adapter contract op 6): per-scenario row counts for every table plus
content spot-checks, raising an exception on any mismatch (so `psql -f`/
`supabase db execute` fails loudly).

Schema coverage (migrations 20260729120000_derived_layer +
20260818000000_authoring_foundation are the schema truth):

  * cells carry `cell_key` — the authored qualified key
    `<service>/<phase>/<scenario>/<path>/<lane>/<step>`, byte-identical to
    the string this script already hashes into the cell's UUIDv5 and to the
    keys skills/slice/scripts/slice_tools.py writes into
    `slides.cell_keys`. Stored, not derived: only the import pipeline
    knows the authored keys (see the cells.cell_key column comment).
  * cells carry `position`. The IR identifies a cell by its
    (path, lane, step) triple, so it CANNOT express two cells in one slot —
    imported cells are always position 0. Slot siblings are an app-side
    concept (`upsert_cell` mints them with '-2'/'-3' key suffixes).
  * Wave-2 spec fields pass through when the IR carries them: cells
    function/form/owner/perceived_owner/value_props; lanes kpis/tools.
    Absent IR fields emit null / '[]'::jsonb, matching the column defaults.
    (lanes.owner_team, phases.business_impact/operational_requirements and
    cell_dependencies label/note have NO IR shape yet — columns stay default.)
  * cell_dependencies carry the IR edge's `kind` ('leads_to' | 'enables';
    absent in the IR means 'leads_to', the column default). The kind is part of the
    edge's IDENTITY, not just its payload: the database's uniqueness key is
    (source_cell_id, target_cell_id, kind), so one pair may carry both an
    arrow and a needs edge, and the UUIDv5 qualified key ends in `#<kind>` so
    the two do not collide. label/note still have no IR shape.
  * DERIVED TABLES ARE NEVER SEEDED. slices/slides/findings/evidence/
    business_models is a runtime output of the sb:* skills, not IR-authored
    content — there is deliberately no IR shape for them. Seeds cannot break
    them either: derived tables reference cells softly (uuid[]/text[], no FK),
    so the scenario-replace delete cannot cascade into them. The --verify
    script REPORTS derived rows touching the seeded scenarios (notice, never
    an exception) so a re-import shows what user-authored content it orphaned.

Stdlib only. Validation runs first via scripts/validate_ir.py (same dir);
a failing IR generates nothing.
"""

from __future__ import annotations

import argparse
import json
import sys
import unicodedata
import uuid
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import validate_ir  # noqa: E402

# UUIDv5 namespace: uuid5(NAMESPACE_URL, repo URL), then per-entity
# uuid5(ns, f"{locale}:{entity_type}:{qualified_key}") with NFC-normalized
# keys — the same derivation in every adapter, so the seed SQL and the
# generated fallback module agree on every id.
NAMESPACE = uuid.uuid5(
    uuid.NAMESPACE_URL, "https://github.com/BilLogic/agentic-service-blueprinting"
)


def entity_uuid(locale: str, entity_type: str, qualified_key: str) -> str:
    name = unicodedata.normalize("NFC", f"{locale}:{entity_type}:{qualified_key}")
    return str(uuid.uuid5(NAMESPACE, name))


def pick_text(locale_map, locale: str, declared_locales) :
    """Resolve a localeText map for one locale, falling back deterministically
    (requested locale -> declared-locale order -> any) so partially localized
    IRs still generate."""
    if not isinstance(locale_map, dict) or not locale_map:
        return None
    if locale_map.get(locale):
        return locale_map[locale]
    if locale in locale_map:  # present but empty string — honor it
        return locale_map[locale]
    for loc in declared_locales:
        if locale_map.get(loc):
            return locale_map[loc]
    for value in locale_map.values():
        if value:
            return value
    return next(iter(locale_map.values()))


def sql_quote(value) -> str:
    """SQL string literal with single-quote doubling. CJK-safe (UTF-8 file,
    no escaping needed beyond quotes; standard_conforming_strings leaves
    backslashes literal)."""
    if value is None:
        return "null"
    return "'" + str(value).replace("'", "''") + "'"


def localize_resources(resources, locale: str, locales) -> list:
    out = []
    for resource in resources or []:
        localized = {
            "name": pick_text(resource.get("name"), locale, locales) or "",
            "url": resource.get("url"),
            "kind": resource.get("kind") or "link",
            "featured": bool(resource.get("featured", False)),
        }
        out.append(localized)
    return out


def localize_touchpoints(touchpoints, locale: str, locales) -> list:
    out = []
    for touchpoint in touchpoints or []:
        localized = {
            "name": pick_text(touchpoint.get("name"), locale, locales) or "",
            "summary": pick_text(touchpoint.get("summary"), locale, locales),
            "screenshots": list(touchpoint.get("screenshots") or []),
            "url": touchpoint.get("url"),
        }
        out.append(localized)
    return out


def values_rows(rows) -> str:
    return ",\n".join("  (" + ", ".join(row) + ")" for row in rows)


# ---------------------------------------------------------------------------
# The projection both v1 adapters share
# ---------------------------------------------------------------------------
#
# The adapter contract says the SQL adapter and the no-DB adapter are
# behaviourally identical: same IR in, same render out. That claim used to live
# in a docstring while the two generators each wrote out their own field list by
# hand — and they drifted, silently, in the direction that costs an adopter
# their cell specs.
#
# So the field list is written once, here, and both generators read it.
# scripts/adapter_parity.py compares what they produce rather than trusting the
# sentence. A field added below reaches the database and the no-DB module in the
# same change, or the parity check fails.

#: Columns whose Python value is JSON-encoded and cast to jsonb.
JSONB_FIELDS = frozenset({"value_props", "kpis", "tools"})
#: Columns whose Python value is a list of strings, emitted as a text[] literal.
TEXT_ARRAY_FIELDS = frozenset({"screenshots"})
#: Columns emitted as a bare SQL literal (numbers), never quoted.
RAW_FIELDS = frozenset({"position"})
#: Booleans are SQL keywords, not quoted strings.
BOOL_FIELDS = frozenset({"featured"})


def seed_cell_fields(cell: dict, path: dict) -> dict:
    """One cell as `cells` column -> value.

    `position` is always 0: the IR identifies a cell by (path, lane, step)
    and so cannot express slot siblings. `origin` stays at its 'import' column
    default — these rows ARE the import pipeline's.
    """
    return {
        "id": cell["id"],
        "path_id": path["id"],
        "lane_id": cell["lane_id"],
        "step_id": cell["step_id"],
        "position": 0,
        "content": cell["content"],
        "frame": cell["frame"],
        "summary": cell["summary"],
        "cell_key": cell["cell_key"],
        "function": cell["function"],
        "form": cell["form"],
        "value_props": cell["value_props"],
        "owner": cell["owner"],
        "perceived_owner": cell["perceived_owner"],
    }


def seed_lane_fields(lane: dict, path: dict) -> dict:
    """One lane as `lanes` column -> value.

    Lanes were left out of the shared projection when cells and edges got it,
    and the omission immediately produced a false sentence: the contract said
    kpis and tools were carried by neither adapter, when in fact the SQL side
    carried both and the no-DB side carried neither. Same defect as before,
    one aggregate over.
    """
    return {
        "id": lane["id"],
        "path_id": path["id"],
        "name": lane["name"],
        "lane_role": lane["role"],
        "position": lane["row"],
        "kpis": lane["kpis"],
        "tools": lane["tools"],
    }


def seed_trigger_fields(trigger: dict) -> dict:
    """One edge as `cell_dependencies` column -> value.

    `kind` is emitted explicitly even though 'leads_to' is the column default,
    because an IR edge can now be either kind and the row should say which.
    label and note still have no IR shape and stay at their defaults on both
    adapters, which is parity by absence rather than by accident.
    """
    return {
        "id": trigger["id"],
        "source_cell_id": trigger["source_cell_id"],
        "target_cell_id": trigger["target_cell_id"],
        "kind": trigger["kind"],
    }


def seed_touchpoint_fields(touchpoint: dict, cell: dict) -> dict:
    """One placement as `cell_touchpoints` column -> value.

    `position` is 1-based and contiguous within the cell, which is what the
    table's deferred unique assumes and what the migration that created it
    wrote. `origin` stays at 'import' — these rows ARE the import pipeline's.
    """
    return {
        "id": touchpoint["id"],
        "cell_id": cell["id"],
        "name": touchpoint["name"],
        "position": touchpoint["position"],
        "summary": touchpoint["summary"],
        "screenshots": touchpoint["screenshots"],
        "url": touchpoint["url"],
        "origin": "import",
    }


def seed_resource_fields(resource: dict, cell: dict) -> dict:
    """One resource as `resources` column -> value.

    `cell_id` and never `cell_touchpoint_id`: every row carries its cell, and
    an import cannot know which of a cell's resources documents one of its
    touchpoints without guessing once per row. Attaching one is an authoring
    act, and the IR has no way to say it.
    """
    return {
        "id": resource["id"],
        "cell_id": cell["id"],
        "cell_touchpoint_id": None,
        "kind": resource["kind"],
        "name": resource["name"],
        "url": resource["url"],
        "position": resource["position"],
        "featured": resource["featured"],
        "origin": "import",
    }


def sql_row(fields: dict) -> list:
    """Column values as SQL literals, in the order the insert names them."""
    out = []
    for column, value in fields.items():
        if column in JSONB_FIELDS:
            out.append(sql_quote(json.dumps(value, ensure_ascii=False)) + "::jsonb")
        elif column in TEXT_ARRAY_FIELDS:
            out.append(
                "array[" + ", ".join(sql_quote(v) for v in value or []) + "]::text[]"
            )
        elif column in RAW_FIELDS:
            out.append(str(value))
        elif column in BOOL_FIELDS:
            out.append("true" if value else "false")
        else:
            out.append(sql_quote(value))
    return out


# ---------------------------------------------------------------------------
# IR -> flat, id-resolved model (per locale)
# ---------------------------------------------------------------------------


def build_model(doc: dict, locale: str) -> dict:
    locales = doc["locales"]
    lc = doc["service"]
    lc_q = lc["key"]

    def text(m):
        return pick_text(m, locale, locales)

    model = {
        "locale": locale,
        "service": {
            "id": entity_uuid(locale, "service", lc_q),
            "key": lc["key"],
            "name": text(lc["name"]),
            "summary": text(lc.get("summary")),
        },
        "phases": [],
        "scenarios": [],
    }

    phase_ids = {}
    for phase in lc["phases"]:
        ph_q = f"{lc_q}/{phase['key']}"
        ph_id = entity_uuid(locale, "phase", ph_q)
        phase_ids[phase["key"]] = ph_id
        model["phases"].append(
            {
                "id": ph_id,
                "key": phase["key"],
                "name": text(phase["name"]),
                "summary": text(phase.get("summary")),
                "order": phase["order"],
                "loops_to": phase.get("loops_to"),
            }
        )

        for scenario in phase.get("scenarios", []):
            sc_q = f"{ph_q}/{scenario['key']}"
            sc_id = entity_uuid(locale, "scenario", sc_q)
            steps = []
            step_ids = {}
            for step in scenario["steps"]:
                st_id = entity_uuid(locale, "step", f"{sc_q}/{step['key']}")
                step_ids[step["key"]] = st_id
                steps.append({"id": st_id, "key": step["key"], "name": text(step["name"])})

            paths = []
            for path in scenario["paths"]:
                pa_q = f"{sc_q}/{path['key']}"
                pa_id = entity_uuid(locale, "path", pa_q)
                lane_ids = {}
                lanes = []
                for lane in path["lanes"]:
                    la_id = entity_uuid(locale, "lane", f"{pa_q}/{lane['key']}")
                    lane_ids[lane["key"]] = la_id
                    lanes.append(
                        {
                            "id": la_id,
                            "key": lane["key"],
                            "name": text(lane["display_name"]),
                            "role": lane.get("role"),
                            "row": lane["row"],
                            # Wave-2 lane spec fields (locale-independent
                            # string arrays); absent -> [] = column default.
                            "kpis": lane.get("kpis") or [],
                            "tools": lane.get("tools") or [],
                        }
                    )

                path_steps = [
                    {"step_id": step_ids[key], "position": index}
                    for index, key in enumerate(path["path_steps"])
                ]

                cells = []
                cell_ids = {}
                for cell in path["cells"]:
                    ce_q = f"{pa_q}/{cell['lane']}/{cell['step']}"
                    ce_id = entity_uuid(locale, "cell", ce_q)
                    cell_ids[(cell["lane"], cell["step"])] = ce_id
                    cells.append(
                        {
                            "id": ce_id,
                            # The authored key, stored verbatim in
                            # cells.cell_key: the SAME qualified-key string
                            # hashed into the UUIDv5 above and used by
                            # slice_tools.cell_key() — service/phase/
                            # scenario/path/lane/step. Locale-independent
                            # (IR keys are ASCII slugs by schema; the NFC
                            # normalization in entity_uuid is a no-op here).
                            "cell_key": ce_q,
                            "lane_id": lane_ids[cell["lane"]],
                            "step_id": step_ids[cell["step"]],
                            "content": text(cell.get("content")) or "",
                            "frame": cell.get("frame"),
                            "summary": text(cell.get("summary")),
                            # Two lists where there was one array, because
                            # the column they came from is now two tables.
                            # Ids are UUIDv5 over the cell's qualified key
                            # plus the row's own name, so a re-import lands on
                            # the same row rather than a duplicate — the same
                            # construction every other entity here uses.
                            "resources": [
                                {
                                    **resource,
                                    "id": entity_uuid(
                                        locale, "resource",
                                        f"{ce_q}#{resource['name']}@{index}",
                                    ),
                                    "position": index,
                                }
                                for index, resource in enumerate(
                                    localize_resources(
                                        cell.get("resources"), locale, locales
                                    ),
                                    start=1,
                                )
                            ],
                            "touchpoints": [
                                {
                                    **touchpoint,
                                    "id": entity_uuid(
                                        locale, "touchpoint",
                                        f"{ce_q}#{touchpoint['name']}",
                                    ),
                                    "position": index,
                                }
                                for index, touchpoint in enumerate(
                                    localize_touchpoints(
                                        cell.get("touchpoints"), locale, locales
                                    ),
                                    start=1,
                                )
                            ],
                            # Wave-2 spec fields (locale-independent strings /
                            # {for, value} array); absent -> null / [] =
                            # column defaults.
                            "function": cell.get("function"),
                            "form": cell.get("form"),
                            "owner": cell.get("owner"),
                            "perceived_owner": cell.get("perceived_owner"),
                            "value_props": cell.get("value_props") or [],
                        }
                    )

                triggers = []
                for trigger in path.get("triggers", []):
                    src = (trigger["source"]["lane"], trigger["source"]["step"])
                    tgt = (trigger["target"]["lane"], trigger["target"]["step"])
                    # Absent kind means 'leads_to' — the column default, and
                    # what every edge authored before 2026.08.26 meant.
                    kind = trigger.get("kind", "leads_to")
                    # The kind is in the qualified key because it is in the
                    # identity: cell_dependencies is unique on
                    # (source, target, kind), so the same pair can hold an
                    # arrow AND an enables edge and they need distinct ids.
                    tr_q = f"{pa_q}/{src[0]}/{src[1]}->{tgt[0]}/{tgt[1]}#{kind}"
                    triggers.append(
                        {
                            # The namespace label stays "trigger" through the
                            # 2026.09.01 rename. It is UUIDv5 input, not
                            # vocabulary: changing it would give every existing
                            # edge a new id and stop re-imports being
                            # idempotent, which is the one property this
                            # derivation exists for.
                            "id": entity_uuid(locale, "trigger", tr_q),
                            "source_cell_id": cell_ids[src],
                            "target_cell_id": cell_ids[tgt],
                            "kind": kind,
                        }
                    )

                paths.append(
                    {
                        "id": pa_id,
                        "key": path["key"],
                        "name": text(path["name"]),
                        "summary": text(path.get("summary")),
                        "note": text(path.get("note")),
                        "kind": path["kind"],
                        "lanes": lanes,
                        "path_steps": path_steps,
                        "cells": cells,
                        "triggers": triggers,
                    }
                )

            model["scenarios"].append(
                {
                    "id": sc_id,
                    # Qualified key (service/phase/scenario): the prefix of
                    # every cell_key under this scenario — --verify uses it to
                    # report derived rows referencing the seeded scenario.
                    "qualified_key": sc_q,
                    "key": scenario["key"],
                    "phase_id": ph_id,
                    "name": text(scenario["name"]),
                    "summary": text(scenario.get("summary")),
                    "order": scenario["order"],
                    "layout": scenario["layout"],
                    "steps": steps,
                    "paths": paths,
                }
            )

    model["phase_ids"] = phase_ids
    return model


# ---------------------------------------------------------------------------
# SQL emission
# ---------------------------------------------------------------------------


def emit_seed_sql(model: dict, ir_name: str) -> str:
    q = sql_quote
    lc = model["service"]
    parts = []
    parts.append(
        f"""-- GENERATED by scripts/generate_seed_sql.py — edit the IR and regenerate; do not hand-edit.
--
-- Source IR: {ir_name}
-- Locale:    {model['locale']} (one seed file per locale; never mix locales in one target)
-- Scenarios: {', '.join(s['key'] for s in model['scenarios'])}
--
-- Adapter-contract semantics (references/adapter-contract.md):
--   * single transaction — a failing statement leaves the target untouched;
--   * scenario-replace: delete each scenario by UUIDv5 id (cascades remove
--     children), reinsert paths -> steps -> path_steps -> lanes -> cells ->
--     cell_dependencies;
--   * service/phases are shared across scenarios: upserted, not replaced;
--   * UUIDv5 ids from IR keys + locale => idempotent re-import.

begin;

-- Service (shared, upserted) ------------------------------------------------

insert into public.services (id, name, summary) values
  ({q(lc['id'])}, {q(lc['name'])}, {q(lc['summary'])})
on conflict (id) do update
  set name = excluded.name, summary = excluded.summary;

-- Phases (shared, upserted; loops_to applied after all phases exist) ----------

insert into public.phases (id, service_id, name, summary, position) values
{values_rows(
    [
        [q(ph['id']), q(lc['id']), q(ph['name']), q(ph['summary']), str(ph['order'])]
        for ph in model['phases']
    ]
)}
on conflict (id) do update
  set service_id = excluded.service_id,
      name = excluded.name,
      summary = excluded.summary,
      position = excluded.position;
"""
    )

    for ph in model["phases"]:
        loops_to_id = model["phase_ids"][ph["loops_to"]] if ph.get("loops_to") else None
        parts.append(
            f"update public.phases set loops_to_phase_id = {q(loops_to_id)} where id = {q(ph['id'])};\n"
        )

    for scenario in model["scenarios"]:
        parts.append(
            f"""
-- Scenario '{scenario['key']}' ({scenario['id']}) --------------------------------
-- Scenario-replace: delete (cascades to paths, steps, path_steps, lanes,
-- cells, cell_dependencies), then reinsert in dependency order.

delete from public.scenarios where id = {q(scenario['id'])};

insert into public.scenarios (id, phase_id, name, summary, position, layout) values
  ({q(scenario['id'])}, {q(scenario['phase_id'])}, {q(scenario['name'])}, {q(scenario['summary'])}, {scenario['order']}, {q(scenario['layout'])});

insert into public.paths (id, scenario_id, name, summary, note, kind) values
{values_rows(
    [
        [q(p['id']), q(scenario['id']), q(p['name']), q(p['summary']), q(p['note']), q(p['kind'])]
        for p in scenario['paths']
    ]
)};

insert into public.steps (id, scenario_id, name) values
{values_rows([[q(s['id']), q(scenario['id']), q(s['name'])] for s in scenario['steps']])};

insert into public.path_steps (path_id, step_id, position) values
{values_rows(
    [
        [q(p['id']), q(ps['step_id']), str(ps['position'])]
        for p in scenario['paths']
        for ps in p['path_steps']
    ]
)};

insert into public.lanes ({', '.join(seed_lane_fields(scenario['paths'][0]['lanes'][0], scenario['paths'][0]))}) values
{values_rows(
    [
        sql_row(seed_lane_fields(l, p))
        for p in scenario['paths']
        for l in p['lanes']
    ]
)};
"""
        )

        # Columns come from the projection itself, so the insert cannot name a
        # field list the projection no longer produces.
        cell_fields = [
            seed_cell_fields(c, p) for p in scenario["paths"] for c in p["cells"]
        ]
        if cell_fields:
            parts.append(
                f"insert into public.cells ({', '.join(cell_fields[0])}) values\n"
                + values_rows([sql_row(fields) for fields in cell_fields])
                + ";\n"
            )

        # Placements before resources, because a resource may hang off one.
        touchpoint_fields = [
            seed_touchpoint_fields(t, c)
            for p in scenario["paths"]
            for c in p["cells"]
            for t in c["touchpoints"]
        ]
        if touchpoint_fields:
            parts.append(
                f"\ninsert into public.cell_touchpoints ({', '.join(touchpoint_fields[0])}) values\n"
                + values_rows([sql_row(fields) for fields in touchpoint_fields])
                + ";\n"
            )

        resource_fields = [
            seed_resource_fields(r, c)
            for p in scenario["paths"]
            for c in p["cells"]
            for r in c["resources"]
        ]
        if resource_fields:
            parts.append(
                f"\ninsert into public.resources ({', '.join(resource_fields[0])}) values\n"
                + values_rows([sql_row(fields) for fields in resource_fields])
                + ";\n"
            )

        trigger_fields = [
            seed_trigger_fields(t) for p in scenario["paths"] for t in p["triggers"]
        ]
        if trigger_fields:
            parts.append(
                f"\ninsert into public.cell_dependencies ({', '.join(trigger_fields[0])}) values\n"
                + values_rows([sql_row(fields) for fields in trigger_fields])
                + ";\n"
            )

    parts.append("\ncommit;\n")
    return "".join(parts)


def emit_verify_sql(model: dict, ir_name: str) -> str:
    """Read-back verification (adapter contract op 6): per-scenario row counts
    for every table + content spot-checks. Raises on any mismatch."""
    q = sql_quote
    checks = []
    for scenario in model["scenarios"]:
        sid = q(scenario["id"])
        label = scenario["key"]
        expected = {
            "paths": len(scenario["paths"]),
            "steps": len(scenario["steps"]),
            "path_steps": sum(len(p["path_steps"]) for p in scenario["paths"]),
            "lanes": sum(len(p["lanes"]) for p in scenario["paths"]),
            "cells": sum(len(p["cells"]) for p in scenario["paths"]),
            "cell_dependencies": sum(len(p["triggers"]) for p in scenario["paths"]),
            "cell_touchpoints": sum(
                len(c["touchpoints"]) for p in scenario["paths"] for c in p["cells"]
            ),
            "resources": sum(
                len(c["resources"]) for p in scenario["paths"] for c in p["cells"]
            ),
        }
        counts = {
            "scenario rows": f"select count(*) from public.scenarios where id = {sid}",
            "paths": f"select count(*) from public.paths where scenario_id = {sid}",
            "steps": f"select count(*) from public.steps where scenario_id = {sid}",
            "path_steps": (
                "select count(*) from public.path_steps ps join public.paths p "
                f"on p.id = ps.path_id where p.scenario_id = {sid}"
            ),
            "lanes": (
                "select count(*) from public.lanes l join public.paths p "
                f"on p.id = l.path_id where p.scenario_id = {sid}"
            ),
            "cells": (
                "select count(*) from public.cells c join public.paths p "
                f"on p.id = c.path_id where p.scenario_id = {sid}"
            ),
            "cell_dependencies": (
                "select count(*) from public.cell_dependencies t "
                "join public.cells c on c.id = t.source_cell_id "
                "join public.paths p on p.id = c.path_id "
                f"where p.scenario_id = {sid}"
            ),
            "cell_touchpoints": (
                "select count(*) from public.cell_touchpoints ct "
                "join public.cells c on c.id = ct.cell_id "
                "join public.paths p on p.id = c.path_id "
                f"where p.scenario_id = {sid}"
            ),
            "resources": (
                "select count(*) from public.resources r "
                "join public.cells c on c.id = r.cell_id "
                "join public.paths p on p.id = c.path_id "
                f"where p.scenario_id = {sid}"
            ),
        }
        expected_full = {"scenario rows": 1, **expected}
        for name, query in counts.items():
            want = expected_full[name]
            checks.append(
                f"  select ({query}) into n;\n"
                f"  if n <> {want} then\n"
                f"    raise exception 'scenario {label}: {name} expected {want}, got %', n;\n"
                "  end if;"
            )

        # Every imported cell must carry its authored cell_key (slice recovery
        # depends on it), and each key embeds this scenario's qualified prefix.
        prefix = scenario["qualified_key"]
        checks.append(
            "  select count(*) into n from public.cells c "
            "join public.paths p on p.id = c.path_id\n"
            f"  where p.scenario_id = {sid}\n"
            f"    and (c.cell_key is null or c.cell_key not like {q(prefix + '/%')});\n"
            "  if n <> 0 then\n"
            f"    raise exception 'scenario {label}: % cell(s) missing the authored cell_key prefix {prefix}/', n;\n"
            "  end if;"
        )

        # Content spot-checks: scenario name, each path name, and the first
        # non-empty cell content per path.
        checks.append(
            f"  select name into t from public.scenarios where id = {sid};\n"
            f"  if t is distinct from {q(scenario['name'])} then\n"
            f"    raise exception 'scenario {label}: name mismatch — got %', t;\n"
            "  end if;"
        )
        for p in scenario["paths"]:
            checks.append(
                f"  select name into t from public.paths where id = {q(p['id'])};\n"
                f"  if t is distinct from {q(p['name'])} then\n"
                f"    raise exception 'scenario {label}: path {p['key']} name mismatch — got %', t;\n"
                "  end if;"
            )
            spot = next((c for c in p["cells"] if c["content"]), None)
            if spot is not None:
                checks.append(
                    f"  select content into t from public.cells where id = {q(spot['id'])};\n"
                    f"  if t is distinct from {q(spot['content'])} then\n"
                    f"    raise exception 'scenario {label}: path {p['key']} spot-check cell content mismatch — got %', t;\n"
                    "  end if;"
                )
                checks.append(
                    f"  select cell_key into t from public.cells where id = {q(spot['id'])};\n"
                    f"  if t is distinct from {q(spot['cell_key'])} then\n"
                    f"    raise exception 'scenario {label}: path {p['key']} spot-check cell_key mismatch — got %', t;\n"
                    "  end if;"
                )

    # Derived-layer report (never a failure): slices/findings/evidence/
    # business_models are user- and skill-authored at runtime, NOT seeded, and
    # they soft-reference cells — so rows referencing a just-replaced scenario
    # are legitimate (that is the recovery design), but worth surfacing after
    # a re-import. Guarded by to_regclass so the verify script still runs
    # against a database without the derived-layer migration.
    lc_id = q(model["service"]["id"])
    derived = []
    for scenario in model["scenarios"]:
        pat = q(scenario["qualified_key"] + "/%")
        label = scenario["key"]
        derived.append(
            "  if to_regclass('public.slides') is not null then\n"
            "    select count(*) into n from public.slides si\n"
            f"    where exists (select 1 from unnest(si.cell_keys) k where k like {pat});\n"
            f"    raise notice 'derived (reported, not verified): % slides reference scenario {label}', n;\n"
            "  end if;\n"
            "  if to_regclass('public.audit_findings') is not null then\n"
            "    select count(*) into n from public.audit_findings f\n"
            f"    where exists (select 1 from unnest(f.cell_keys) k where k like {pat});\n"
            f"    raise notice 'derived (reported, not verified): % findings reference scenario {label}', n;\n"
            "  end if;\n"
            "  if to_regclass('public.evidence') is not null then\n"
            f"    select count(*) into n from public.evidence where cell_key like {pat};\n"
            f"    raise notice 'derived (reported, not verified): % evidence rows reference scenario {label}', n;\n"
            "  end if;"
        )
    derived.append(
        "  if to_regclass('public.slices') is not null then\n"
        f"    select count(*) into n from public.slices where service_id = {lc_id};\n"
        "    raise notice 'derived (reported, not verified): % slices on this service', n;\n"
        "  end if;\n"
        "  if to_regclass('public.business_models') is not null then\n"
        f"    select count(*) into n from public.business_models where service_id = {lc_id};\n"
        "    raise notice 'derived (reported, not verified): % business_models rows on this service', n;\n"
        "  end if;"
    )

    body = "\n".join(checks + derived)
    scenario_list = ", ".join(s["key"] for s in model["scenarios"])
    return f"""-- GENERATED by scripts/generate_seed_sql.py --verify — read-back verification.
--
-- Source IR: {ir_name} (locale: {model['locale']})
-- Run AFTER the seed commits. Verifies per-scenario row counts for every
-- table plus content and cell_key spot-checks for: {scenario_list}.
-- Any mismatch raises an exception, so psql/supabase execution fails loudly.
-- Derived-layer rows (slices/findings/evidence/business_models) are REPORTED via
-- notices, never failed: they are runtime skill/user output, not seed output.

do $$
declare
  n bigint;
  t text;
begin
{body}
  raise notice 'read-back verification passed for locale {model['locale']}: {scenario_list}';
end
$$;
"""


# ---------------------------------------------------------------------------
# CLI
# ---------------------------------------------------------------------------


def main(argv=None) -> int:
    parser = argparse.ArgumentParser(
        description="Generate a transactional seed SQL file from a blueprint IR (one locale per run)."
    )
    parser.add_argument("ir_file", help="IR file (.json native; .yaml if PyYAML is installed)")
    parser.add_argument("--locale", required=True, help="locale to generate (must be declared in the IR)")
    parser.add_argument("--out", help="output path (default: supabase/seeds/blueprint.<locale>.sql)")
    parser.add_argument("--verify", action="store_true",
                        help="also write <out stem>.verify.sql with read-back verification checks")
    parser.add_argument("--skip-validation", action="store_true",
                        help="skip the validate_ir.py pre-flight (not recommended)")
    args = parser.parse_args(argv)

    ir_path = Path(args.ir_file)
    doc, load_error = validate_ir.load_ir(ir_path)
    if load_error is not None:
        print(f"ERROR: {load_error}", file=sys.stderr)
        return 1

    if not args.skip_validation:
        rep = validate_ir.Report(ir_path.name)
        validate_ir.validate_document(doc, rep)
        for line in rep.errors + rep.warnings:
            print(line, file=sys.stderr)
        if rep.errors:
            print(
                f"ERROR: IR failed validation ({len(rep.errors)} error(s)) — nothing generated "
                "(a deliberately-invalid IR must leave the target untouched).",
                file=sys.stderr,
            )
            return 1

    if args.locale not in doc.get("locales", []):
        print(
            f"ERROR: locale '{args.locale}' is not declared in the IR "
            f"(declared: {', '.join(doc.get('locales', []))})",
            file=sys.stderr,
        )
        return 1

    model = build_model(doc, args.locale)
    seed_sql = emit_seed_sql(model, ir_path.name)

    out_path = Path(args.out) if args.out else Path("supabase/seeds") / f"blueprint.{args.locale}.sql"
    out_path.parent.mkdir(parents=True, exist_ok=True)
    out_path.write_text(seed_sql, encoding="utf-8")
    print(f"Wrote {out_path}")
    for scenario in model["scenarios"]:
        cells = sum(len(p["cells"]) for p in scenario["paths"])
        triggers = sum(len(p["triggers"]) for p in scenario["paths"])
        print(
            f"  scenario {scenario['key']} ({scenario['id']}): "
            f"{len(scenario['paths'])} paths, {len(scenario['steps'])} steps, {cells} cells, {triggers} triggers"
        )

    if args.verify:
        verify_path = out_path.parent / (out_path.stem + ".verify.sql")
        verify_path.write_text(emit_verify_sql(model, ir_path.name), encoding="utf-8")
        print(f"Wrote {verify_path} (run after the seed to verify read-back)")

    return 0


if __name__ == "__main__":
    sys.exit(main())
