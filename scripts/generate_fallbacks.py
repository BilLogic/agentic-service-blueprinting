#!/usr/bin/env python3
"""Generate the no-DB fallback data module from a Service Blueprint IR.

Usage:
    python3 scripts/generate_fallbacks.py <ir-file> --locale <tag>
        [--out src/data/generatedBlueprints.ts] [--register]
        [--skip-validation]

This is the no-DB fallback adapter (references/adapter-contract.md): "import"
means regenerating the app's data module from the IR for ONE locale. It emits
a TypeScript module exporting `BlueprintData` per path, keyed by scenario
UUID, with the SAME UUIDv5 ids as scripts/generate_seed_sql.py — the two
adapters must stay behaviorally identical (same IR in -> same render out).

Registration: src/data/blueprintFallbacks.ts derives its lookup registry
(FALLBACK_BY_PATH / FALLBACK_PATHS_BY_SCENARIO / FALLBACK_BY_SCENARIO) from a
marker-delimited block:

    // GENERATED-BLUEPRINT-REGISTRY:BEGIN …
    // GENERATED-BLUEPRINT-REGISTRY:END

  * With --register, this script rewrites the block in place to import from
    the generated module (transactional: the registry is only rewritten after
    the generated module has been written successfully; re-running is
    idempotent).
  * Without --register (or if the markers are missing), it prints the exact
    block to paste, so nothing is guessed about a hand-modified registry.

Output is tsc-clean by construction: all literals are emitted through JSON
serialization (double-quoted, control characters escaped, U+2028/U+2029
escaped), so CJK text, quotes, backticks, and newlines in content are safe.
Verify with `npx tsc -p tsconfig.app.json` after generation — the adapter
contract's read-back step for this adapter.

Stdlib only. Validation runs first via scripts/validate_ir.py (same dir);
a failing IR generates nothing (the module is replaced wholesale and only
written if generation fully succeeds).
"""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import validate_ir  # noqa: E402
from generate_seed_sql import build_model  # noqa: E402

MARKER_BEGIN = "GENERATED-BLUEPRINT-REGISTRY:BEGIN"
MARKER_END = "GENERATED-BLUEPRINT-REGISTRY:END"
DEFAULT_OUT = Path("src/data/generatedBlueprints.ts")
REGISTRY_FILE = Path("src/data/blueprintFallbacks.ts")


def ts_literal(value) -> str:
    """Serialize a value as a TS expression via JSON (valid TS object-literal
    syntax). ensure_ascii=False keeps CJK readable; U+2028/U+2029 are the only
    JSON-legal-but-JS-hostile characters, so escape them explicitly."""
    text = json.dumps(value, ensure_ascii=False, indent=2)
    return text.replace(" ", "\\u2028").replace(" ", "\\u2029")


def indent_block(text: str, prefix: str) -> str:
    lines = text.splitlines()
    return "\n".join(lines[0:1] + [prefix + line if line else line for line in lines[1:]])


# ---------------------------------------------------------------------------
# Model -> BlueprintData (mirrors src/types/blueprint.ts)
# ---------------------------------------------------------------------------


def blueprint_data_for_path(scenario: dict, path: dict) -> dict:
    step_by_id = {step["id"]: step for step in scenario["steps"]}
    return {
        "path": {
            "id": path["id"],
            "name": path["name"],
            "description": path["description"],
            "note": path["note"],
            "path_type": path["path_type"],
        },
        "layers": [
            {
                "id": layer["id"],
                "name": layer["name"],
                "role": layer["role"],
                "row_position": layer["row"],
            }
            for layer in path["layers"]
        ],
        # Steps in this path's column order (array index = column_position).
        "steps": [
            {
                "id": ps["step_id"],
                "name": step_by_id[ps["step_id"]]["name"],
                "column_position": ps["column_position"],
            }
            for ps in path["path_steps"]
        ],
        "cells": [
            {
                "id": cell["id"],
                "layer_id": cell["layer_id"],
                "step_id": cell["step_id"],
                "content": cell["content"],
                "picture": cell["picture"],
                "description": cell["description"],
                "links": cell["links"],
            }
            for cell in path["cells"]
        ],
        "triggers": [
            {
                "id": trigger["id"],
                "source_cell_id": trigger["source_cell_id"],
                "target_cell_id": trigger["target_cell_id"],
            }
            for trigger in path["triggers"]
        ],
    }


def emit_module(model: dict, ir_name: str) -> str:
    fallbacks_by_scenario = {
        scenario["id"]: [blueprint_data_for_path(scenario, path) for path in scenario["paths"]]
        for scenario in model["scenarios"]
    }
    scenario_ids = [scenario["id"] for scenario in model["scenarios"]]
    dimensions = "\n".join(
        f"//   {scenario['key']} ({scenario['id']}): "
        f"{len(scenario['paths'])} paths, {len(scenario['steps'])} steps, "
        f"{sum(len(p['cells']) for p in scenario['paths'])} cells, "
        f"{sum(len(p['triggers']) for p in scenario['paths'])} triggers"
        for scenario in model["scenarios"]
    )
    return f"""// GENERATED by scripts/generate_fallbacks.py — edit the IR and regenerate; do not hand-edit.
//
// Source IR: {ir_name}
// Locale:    {model['locale']} (one generated module per locale; never mix locales in one build)
//
// No-DB fallback adapter output (references/adapter-contract.md): BlueprintData
// per path, keyed by scenario UUID. Ids are UUIDv5 from IR keys + locale —
// identical to the ids scripts/generate_seed_sql.py writes to the database,
// so fallback and live-DB modes render the same content.
//
// Dimensions:
{dimensions}

import type {{ BlueprintData }} from '@/types/blueprint'

/** Locale this module was generated for. */
export const GENERATED_BLUEPRINT_LOCALE = {ts_literal(model['locale'])}

/** Scenario UUIDs in IR order; the first is the default sample scenario. */
export const GENERATED_SCENARIO_IDS: readonly string[] = {ts_literal(scenario_ids)}

/** The default scenario rendered offline without a database. */
export const GENERATED_PRIMARY_SCENARIO_ID = {ts_literal(scenario_ids[0])}

/** BlueprintData per path, keyed by scenario UUID, in picker order. */
export const GENERATED_PATH_FALLBACKS_BY_SCENARIO: Record<string, BlueprintData[]> =
  {indent_block(ts_literal(fallbacks_by_scenario), '  ')}
"""


# ---------------------------------------------------------------------------
# Registry block (src/data/blueprintFallbacks.ts between the markers)
# ---------------------------------------------------------------------------


def module_specifier(out_path: Path, repo_root: Path) -> str | None:
    """'@/…' import specifier for the generated module, or None if the module
    is outside src/ (then --register cannot wire it up)."""
    try:
        rel = out_path.resolve().relative_to((repo_root / "src").resolve())
    except ValueError:
        return None
    return "@/" + rel.with_suffix("").as_posix()


def registry_block(specifier: str) -> str:
    return f"""// {MARKER_BEGIN} — managed by scripts/generate_fallbacks.py --register.
// Everything between the BEGIN/END markers is replaced wholesale on
// registration; do not hand-edit. Current content: generated blueprint
// registry derived from {specifier}.
import {{
  GENERATED_PATH_FALLBACKS_BY_SCENARIO,
  GENERATED_PRIMARY_SCENARIO_ID,
}} from '{specifier}'

/** The generated primary scenario (rendered offline without a database). */
export const SAMPLE_SCENARIO_ID = GENERATED_PRIMARY_SCENARIO_ID

const FALLBACK_BY_PATH: Record<string, BlueprintData> = {{}}
const FALLBACK_PATHS_BY_SCENARIO: Record<string, FallbackPathListItem[]> = {{}}
const FALLBACK_BY_SCENARIO: Record<string, BlueprintData> = {{}}
for (const [scenarioId, fallbacks] of Object.entries(
  GENERATED_PATH_FALLBACKS_BY_SCENARIO,
)) {{
  FALLBACK_PATHS_BY_SCENARIO[scenarioId] = fallbacks.map((fallback) => ({{
    id: fallback.path.id,
    name: fallback.path.name,
    description: fallback.path.description,
    note: fallback.path.note,
    path_type: fallback.path.path_type,
  }}))
  for (const fallback of fallbacks) {{
    FALLBACK_BY_PATH[fallback.path.id] = fallback
  }}
  if (fallbacks.length > 0) {{
    FALLBACK_BY_SCENARIO[scenarioId] = fallbacks[0]
  }}
}}

/** Paths hidden from pickers/grids until ready in the UI (generated: none). */
const UI_HIDDEN_PATH_IDS_BY_SCENARIO: Record<string, readonly string[]> = {{}}
// {MARKER_END}"""


def register(registry_path: Path, specifier: str) -> bool:
    """Rewrite the marker block. Returns True on success, False if markers are
    missing/malformed (caller prints manual instructions)."""
    text = registry_path.read_text(encoding="utf-8")
    lines = text.splitlines(keepends=True)
    begin = end = None
    for index, line in enumerate(lines):
        if MARKER_BEGIN in line and begin is None:
            begin = index
        elif MARKER_END in line and begin is not None:
            end = index
            break
    if begin is None or end is None:
        return False
    new_text = "".join(lines[:begin]) + registry_block(specifier) + "\n" + "".join(lines[end + 1:])
    registry_path.write_text(new_text, encoding="utf-8")
    return True


# ---------------------------------------------------------------------------
# CLI
# ---------------------------------------------------------------------------


def main(argv=None) -> int:
    parser = argparse.ArgumentParser(
        description="Generate the no-DB fallback TS module from a blueprint IR (one locale per run)."
    )
    parser.add_argument("ir_file", help="IR file (.json native; .yaml if PyYAML is installed)")
    parser.add_argument("--locale", required=True, help="locale to generate (must be declared in the IR)")
    parser.add_argument("--out", default=str(DEFAULT_OUT),
                        help=f"output module path (default: {DEFAULT_OUT})")
    parser.add_argument("--register", action="store_true",
                        help="rewrite the marker-delimited registry block in src/data/blueprintFallbacks.ts")
    parser.add_argument("--skip-validation", action="store_true",
                        help="skip the validate_ir.py pre-flight (not recommended)")
    args = parser.parse_args(argv)

    repo_root = Path(__file__).resolve().parent.parent
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
                "(the module is only replaced when generation fully succeeds).",
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
    module_text = emit_module(model, ir_path.name)

    out_path = Path(args.out)
    out_path.parent.mkdir(parents=True, exist_ok=True)
    out_path.write_text(module_text, encoding="utf-8")
    print(f"Wrote {out_path}")
    for scenario in model["scenarios"]:
        cells = sum(len(p["cells"]) for p in scenario["paths"])
        triggers = sum(len(p["triggers"]) for p in scenario["paths"])
        print(
            f"  scenario {scenario['key']} ({scenario['id']}): "
            f"{len(scenario['paths'])} paths, {len(scenario['steps'])} steps, {cells} cells, {triggers} triggers"
        )

    specifier = module_specifier(out_path, repo_root)
    registry_path = repo_root / REGISTRY_FILE

    if args.register:
        if specifier is None:
            print(
                f"ERROR: --register requires the output module to live under src/ "
                f"(got {out_path}); cannot derive an '@/…' import specifier.",
                file=sys.stderr,
            )
            return 1
        if register(registry_path, specifier):
            print(f"Registered: rewrote the marker block in {registry_path}")
            print("Verify with: npx tsc -p tsconfig.app.json")
            return 0
        print(
            f"ERROR: could not find the {MARKER_BEGIN} … {MARKER_END} markers in "
            f"{registry_path} — the registry looks hand-modified. Replace its "
            "import + SAMPLE_SCENARIO_ID + FALLBACK_* + UI_HIDDEN_PATH_IDS_BY_SCENARIO "
            "definitions with this block (and keep the markers for next time):\n",
            file=sys.stderr,
        )
        print(registry_block(specifier), file=sys.stderr)
        return 1

    if specifier is not None:
        print(
            "\nNot registered (dry run). To wire the app to this module either re-run "
            "with --register, or replace the marker block in "
            f"{REGISTRY_FILE} with:\n\n{registry_block(specifier)}\n\n"
            "Then verify with: npx tsc -p tsconfig.app.json"
        )
    return 0


if __name__ == "__main__":
    sys.exit(main())
