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
                            "layer_id": layer_ids[cell["layer"]],
                            "step_id": step_ids[cell["step"]],
                            "content": text(cell.get("content")) or "",
                            "picture": cell.get("picture"),
                            "description": text(cell.get("description")),
                            "links": localize_links(cell.get("links"), locale, locales),
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

insert into public.layers (id, path_id, name, layer_role, row_position) values
{values_rows(
    [
        [q(l['id']), q(p['id']), q(l['name']), q(l['role']), str(l['row'])]
        for p in scenario['paths']
        for l in p['layers']
    ]
)};
"""
        )

        cell_rows = [
            [
                q(c["id"]), q(p["id"]), q(c["layer_id"]), q(c["step_id"]),
                q(c["content"]), q(c["picture"]), q(c["description"]),
                q(json.dumps(c["links"], ensure_ascii=False)) + "::jsonb",
            ]
            for p in scenario["paths"]
            for c in p["cells"]
        ]
        if cell_rows:
            parts.append(
                "insert into public.cells (id, path_id, layer_id, step_id, content, picture, description, links) values\n"
                + values_rows(cell_rows)
                + ";\n"
            )

        trigger_rows = [
            [q(t["id"]), q(t["source_cell_id"]), q(t["target_cell_id"])]
            for p in scenario["paths"]
            for t in p["triggers"]
        ]
        if trigger_rows:
            parts.append(
                "\ninsert into public.cell_triggers (id, source_cell_id, target_cell_id) values\n"
                + values_rows(trigger_rows)
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

    body = "\n".join(checks)
    scenario_list = ", ".join(s["key"] for s in model["scenarios"])
    return f"""-- GENERATED by scripts/generate_seed_sql.py --verify — read-back verification.
--
-- Source IR: {ir_name} (locale: {model['locale']})
-- Run AFTER the seed commits. Verifies per-scenario row counts for every
-- table plus content spot-checks for: {scenario_list}.
-- Any mismatch raises an exception, so psql/supabase execution fails loudly.

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
