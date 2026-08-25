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
    its UUIDv5 id (FK cascades remove paths/steps/path_steps/layers/cells/
    triggers), then reinserted in dependency order
    paths -> steps -> path_steps -> layers -> cells -> cell_triggers;
  * lifecycle/phases are shared across scenarios and therefore UPSERTED
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
    `<lifecycle>/<phase>/<scenario>/<path>/<layer>/<step>`, byte-identical to
    the string this script already hashes into the cell's UUIDv5 and to the
    keys skills/slice/scripts/slice_tools.py writes into
    `slice_items.cell_keys`. Stored, not derived: only the import pipeline
    knows the authored keys (see the cells.cell_key column comment).
  * cells carry `slot_position`. The IR identifies a cell by its
    (path, layer, step) triple, so it CANNOT express two cells in one slot —
    imported cells are always slot_position 0. Slot siblings are an app-side
    concept (`upsert_cell` mints them with '-2'/'-3' key suffixes).
  * Wave-2 spec fields pass through when the IR carries them: cells
    function/form/owner/perceived_owner/value_props; layers kpis/tools.
    Absent IR fields emit null / '[]'::jsonb, matching the column defaults.
    (layers.owner_team, phases.business_impact/operational_requirements and
    cell_triggers label/note have NO IR shape yet — columns stay default.)
  * cell_triggers emit `kind` explicitly as 'trigger': every IR trigger is a
    temporal edge. The IR cannot author kind='needs' edges yet.
  * DERIVED TABLES ARE NEVER SEEDED. slices/slice_items/findings/evidence/
    propositions are runtime outputs of the sb:* skills, not IR-authored
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


def localize_links(links, locale: str, locales) -> list:
    out = []
    for link in links or []:
        localized = {"type": link["type"], "label": pick_text(link.get("label"), locale, locales) or ""}
        if "url" in link:
            localized["url"] = link["url"]
        description = pick_text(link.get("description"), locale, locales)
        if description is not None:
            localized["description"] = description
        if "picture" in link:
            localized["picture"] = link["picture"]
        if "pictures" in link:
            localized["pictures"] = link["pictures"]
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
JSONB_FIELDS = frozenset({"links", "value_props", "kpis", "tools"})
#: Columns emitted as a bare SQL literal (numbers), never quoted.
RAW_FIELDS = frozenset({"slot_position", "row_position"})


def seed_cell_fields(cell: dict, path: dict) -> dict:
    """One cell as `cells` column -> value.

    `slot_position` is always 0: the IR identifies a cell by (path, lane, step)
    and so cannot express slot siblings. `origin` stays at its 'import' column
    default — these rows ARE the import pipeline's.
    """
    return {
        "id": cell["id"],
        "path_id": path["id"],
        "layer_id": cell["layer_id"],
        "step_id": cell["step_id"],
        "slot_position": 0,
        "content": cell["content"],
        "picture": cell["picture"],
        "description": cell["description"],
        "links": cell["links"],
        "cell_key": cell["cell_key"],
        "function": cell["function"],
        "form": cell["form"],
        "value_props": cell["value_props"],
        "owner": cell["owner"],
        "perceived_owner": cell["perceived_owner"],
    }


def seed_lane_fields(lane: dict, path: dict) -> dict:
    """One lane as `layers` column -> value.

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
        "layer_role": lane["role"],
        "row_position": lane["row"],
        "kpis": lane["kpis"],
        "tools": lane["tools"],
    }


def seed_trigger_fields(trigger: dict) -> dict:
    """One edge as `cell_triggers` column -> value.

    `kind` is emitted explicitly even though 'trigger' is the column default:
    every IR edge is a temporal one, because the IR has no shape for
    kind='needs', nor for label or note. Those columns stay at their defaults
    on both adapters, which is parity by absence rather than by accident.
    """
    return {
        "id": trigger["id"],
        "source_cell_id": trigger["source_cell_id"],
        "target_cell_id": trigger["target_cell_id"],
        "kind": "trigger",
    }


def sql_row(fields: dict) -> list:
    """Column values as SQL literals, in the order the insert names them."""
    out = []
    for column, value in fields.items():
        if column in JSONB_FIELDS:
            out.append(sql_quote(json.dumps(value, ensure_ascii=False)) + "::jsonb")
        elif column in RAW_FIELDS:
            out.append(str(value))
        else:
            out.append(sql_quote(value))
    return out


# ---------------------------------------------------------------------------
# IR -> flat, id-resolved model (per locale)
# ---------------------------------------------------------------------------


def build_model(doc: dict, locale: str) -> dict:
    locales = doc["locales"]
    lc = doc["lifecycle"]
    lc_q = lc["key"]

    def text(m):
        return pick_text(m, locale, locales)

    model = {
        "locale": locale,
        "lifecycle": {
            "id": entity_uuid(locale, "lifecycle", lc_q),
            "key": lc["key"],
            "name": text(lc["name"]),
            "description": text(lc.get("description")),
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
                "description": text(phase.get("description")),
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
                layer_ids = {}
                layers = []
                for layer in path["layers"]:
                    la_id = entity_uuid(locale, "layer", f"{pa_q}/{layer['key']}")
                    layer_ids[layer["key"]] = la_id
                    layers.append(
                        {
                            "id": la_id,
                            "key": layer["key"],
                            "name": text(layer["display_name"]),
                            "role": layer.get("role"),
                            "row": layer["row"],
                            # Wave-2 lane spec fields (locale-independent
                            # string arrays); absent -> [] = column default.
                            "kpis": layer.get("kpis") or [],
                            "tools": layer.get("tools") or [],
                        }
                    )

                path_steps = [
                    {"step_id": step_ids[key], "column_position": index}
                    for index, key in enumerate(path["path_steps"])
                ]

                cells = []
                cell_ids = {}
                for cell in path["cells"]:
                    ce_q = f"{pa_q}/{cell['layer']}/{cell['step']}"
                    ce_id = entity_uuid(locale, "cell", ce_q)
                    cell_ids[(cell["layer"], cell["step"])] = ce_id
                    cells.append(
                        {
                            "id": ce_id,
                            # The authored key, stored verbatim in
                            # cells.cell_key: the SAME qualified-key string
                            # hashed into the UUIDv5 above and used by
                            # slice_tools.cell_key() — lifecycle/phase/
                            # scenario/path/layer/step. Locale-independent
                            # (IR keys are ASCII slugs by schema; the NFC
                            # normalization in entity_uuid is a no-op here).
                            "cell_key": ce_q,
                            "layer_id": layer_ids[cell["layer"]],
                            "step_id": step_ids[cell["step"]],
                            "content": text(cell.get("content")) or "",
                            "picture": cell.get("picture"),
                            "description": text(cell.get("description")),
                            "links": localize_links(cell.get("links"), locale, locales),
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
                    src = (trigger["source"]["layer"], trigger["source"]["step"])
                    tgt = (trigger["target"]["layer"], trigger["target"]["step"])
                    tr_q = f"{pa_q}/{src[0]}/{src[1]}->{tgt[0]}/{tgt[1]}"
                    triggers.append(
                        {
                            "id": entity_uuid(locale, "trigger", tr_q),
                            "source_cell_id": cell_ids[src],
                            "target_cell_id": cell_ids[tgt],
                        }
                    )

                paths.append(
                    {
                        "id": pa_id,
                        "key": path["key"],
                        "name": text(path["name"]),
                        "description": text(path.get("description")),
                        "note": text(path.get("note")),
                        "path_type": path["path_type"],
                        "layers": layers,
                        "path_steps": path_steps,
                        "cells": cells,
                        "triggers": triggers,
                    }
                )

            model["scenarios"].append(
                {
                    "id": sc_id,
                    # Qualified key (lifecycle/phase/scenario): the prefix of
                    # every cell_key under this scenario — --verify uses it to
                    # report derived rows referencing the seeded scenario.
                    "qualified_key": sc_q,
                    "key": scenario["key"],
                    "phase_id": ph_id,
                    "name": text(scenario["name"]),
                    "description": text(scenario.get("description")),
                    "order": scenario["order"],
                    "view_type": scenario["view_type"],
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
    lc = model["lifecycle"]
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
--     children), reinsert paths -> steps -> path_steps -> layers -> cells ->
--     cell_triggers;
--   * lifecycle/phases are shared across scenarios: upserted, not replaced;
--   * UUIDv5 ids from IR keys + locale => idempotent re-import.

begin;

-- Lifecycle (shared, upserted) ------------------------------------------------

insert into public.service_lifecycles (id, name, description) values
  ({q(lc['id'])}, {q(lc['name'])}, {q(lc['description'])})
on conflict (id) do update
  set name = excluded.name, description = excluded.description;

-- Phases (shared, upserted; loops_to applied after all phases exist) ----------

insert into public.phases (id, service_lifecycle_id, name, description, order_position) values
{values_rows(
    [
        [q(ph['id']), q(lc['id']), q(ph['name']), q(ph['description']), str(ph['order'])]
        for ph in model['phases']
    ]
)}
on conflict (id) do update
  set service_lifecycle_id = excluded.service_lifecycle_id,
      name = excluded.name,
      description = excluded.description,
      order_position = excluded.order_position;
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
-- Scenario-replace: delete (cascades to paths, steps, path_steps, layers,
-- cells, cell_triggers), then reinsert in dependency order.

delete from public.service_scenarios where id = {q(scenario['id'])};

insert into public.service_scenarios (id, phase_id, name, description, order_position, view_type) values
  ({q(scenario['id'])}, {q(scenario['phase_id'])}, {q(scenario['name'])}, {q(scenario['description'])}, {scenario['order']}, {q(scenario['view_type'])});

insert into public.paths (id, service_scenario_id, name, description, note, path_type) values
{values_rows(
    [
        [q(p['id']), q(scenario['id']), q(p['name']), q(p['description']), q(p['note']), q(p['path_type'])]
        for p in scenario['paths']
    ]
)};

insert into public.steps (id, service_scenario_id, name) values
{values_rows([[q(s['id']), q(scenario['id']), q(s['name'])] for s in scenario['steps']])};

insert into public.path_steps (path_id, step_id, column_position) values
{values_rows(
    [
        [q(p['id']), q(ps['step_id']), str(ps['column_position'])]
        for p in scenario['paths']
        for ps in p['path_steps']
    ]
)};

insert into public.layers ({', '.join(seed_lane_fields(scenario['paths'][0]['layers'][0], scenario['paths'][0]))}) values
{values_rows(
    [
        sql_row(seed_lane_fields(l, p))
        for p in scenario['paths']
        for l in p['layers']
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

        trigger_fields = [
            seed_trigger_fields(t) for p in scenario["paths"] for t in p["triggers"]
        ]
        if trigger_fields:
            parts.append(
                f"\ninsert into public.cell_triggers ({', '.join(trigger_fields[0])}) values\n"
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
            "layers": sum(len(p["layers"]) for p in scenario["paths"]),
            "cells": sum(len(p["cells"]) for p in scenario["paths"]),
            "cell_triggers": sum(len(p["triggers"]) for p in scenario["paths"]),
        }
        counts = {
            "scenario rows": f"select count(*) from public.service_scenarios where id = {sid}",
            "paths": f"select count(*) from public.paths where service_scenario_id = {sid}",
            "steps": f"select count(*) from public.steps where service_scenario_id = {sid}",
            "path_steps": (
                "select count(*) from public.path_steps ps join public.paths p "
                f"on p.id = ps.path_id where p.service_scenario_id = {sid}"
            ),
            "layers": (
                "select count(*) from public.layers l join public.paths p "
                f"on p.id = l.path_id where p.service_scenario_id = {sid}"
            ),
            "cells": (
                "select count(*) from public.cells c join public.paths p "
                f"on p.id = c.path_id where p.service_scenario_id = {sid}"
            ),
            "cell_triggers": (
                "select count(*) from public.cell_triggers t "
                "join public.cells c on c.id = t.source_cell_id "
                "join public.paths p on p.id = c.path_id "
                f"where p.service_scenario_id = {sid}"
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
            f"  where p.service_scenario_id = {sid}\n"
            f"    and (c.cell_key is null or c.cell_key not like {q(prefix + '/%')});\n"
            "  if n <> 0 then\n"
            f"    raise exception 'scenario {label}: % cell(s) missing the authored cell_key prefix {prefix}/', n;\n"
            "  end if;"
        )

        # Content spot-checks: scenario name, each path name, and the first
        # non-empty cell content per path.
        checks.append(
            f"  select name into t from public.service_scenarios where id = {sid};\n"
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
    # propositions are user- and skill-authored at runtime, NOT seeded, and
    # they soft-reference cells — so rows referencing a just-replaced scenario
    # are legitimate (that is the recovery design), but worth surfacing after
    # a re-import. Guarded by to_regclass so the verify script still runs
    # against a database without the derived-layer migration.
    lc_id = q(model["lifecycle"]["id"])
    derived = []
    for scenario in model["scenarios"]:
        pat = q(scenario["qualified_key"] + "/%")
        label = scenario["key"]
        derived.append(
            "  if to_regclass('public.slice_items') is not null then\n"
            "    select count(*) into n from public.slice_items si\n"
            f"    where exists (select 1 from unnest(si.cell_keys) k where k like {pat});\n"
            f"    raise notice 'derived (reported, not verified): % slice_items reference scenario {label}', n;\n"
            "  end if;\n"
            "  if to_regclass('public.findings') is not null then\n"
            "    select count(*) into n from public.findings f\n"
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
        f"    select count(*) into n from public.slices where service_lifecycle_id = {lc_id};\n"
        "    raise notice 'derived (reported, not verified): % slices on this lifecycle', n;\n"
        "  end if;\n"
        "  if to_regclass('public.propositions') is not null then\n"
        f"    select count(*) into n from public.propositions where service_lifecycle_id = {lc_id};\n"
        "    raise notice 'derived (reported, not verified): % propositions rows on this lifecycle', n;\n"
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
-- Derived-layer rows (slices/findings/evidence/propositions) are REPORTED via
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
