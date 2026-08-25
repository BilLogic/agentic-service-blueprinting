#!/usr/bin/env python3
"""Check that the two v1 adapters really are behaviourally identical.

Usage:
    python3 scripts/adapter_parity.py [<ir-file> ...] [--locale <tag>]

references/adapter-contract.md names two adapters — the SQL one and the no-DB
one — and says the second is "not a degraded mode". That sentence was untrue
for months in the direction that costs an adopter the most: the no-DB adapter
dropped cell_key, slot_position, every cell spec field, and the edge kind,
because each generator wrote out its own field list by hand. Nothing failed. A
reader following a normative contract simply lost their cell specs.

So the claim gets a check rather than a sentence. One IR goes in; both adapters
project it; every field one of them carries is compared against the other. A
field either reaches both or is declared as reaching neither.

A checklist was the alternative and was rejected: its items are IDE-skill
behaviours that a no-DB import satisfies trivially, so it would have reported
green through the whole drift.

Exit code 0 when the adapters agree, 1 when they do not — with the offending
cell, the field, and both values.

Stdlib only.
"""

from __future__ import annotations

import argparse
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import validate_ir  # noqa: E402
from generate_fallbacks import IMPLIED_BY_NESTING, blueprint_data_for_path  # noqa: E402
from generate_seed_sql import (  # noqa: E402
    build_model,
    seed_cell_fields,
    seed_trigger_fields,
)

DEFAULT_IR = Path(__file__).resolve().parent / "tests" / "sample-ir.json"


def sql_adapter_rows(model: dict) -> tuple[dict, dict]:
    """What the SQL adapter would write, keyed by row id."""
    cells, triggers = {}, {}
    for scenario in model["scenarios"]:
        for path in scenario["paths"]:
            for cell in path["cells"]:
                cells[cell["id"]] = seed_cell_fields(cell, path)
            for trigger in path["triggers"]:
                triggers[trigger["id"]] = seed_trigger_fields(trigger)
    return cells, triggers


def fallback_adapter_rows(model: dict) -> tuple[dict, dict]:
    """What the no-DB adapter would serve, keyed by the same row ids."""
    cells, triggers = {}, {}
    for scenario in model["scenarios"]:
        for path in scenario["paths"]:
            data = blueprint_data_for_path(scenario, path)
            for cell in data["cells"]:
                cells[cell["id"]] = cell
            for trigger in data["triggers"]:
                triggers[trigger["id"]] = trigger
    return cells, triggers


def compare(kind: str, sql: dict, fallback: dict, implied: frozenset) -> list[str]:
    """Every disagreement between the two adapters, as readable lines."""
    problems = []
    for missing in sorted(set(sql) - set(fallback)):
        problems.append(f"{kind} {missing}: written to the database, absent without one")
    for extra in sorted(set(fallback) - set(sql)):
        problems.append(f"{kind} {extra}: served without a database, never written to one")

    for row_id in sorted(set(sql) & set(fallback)):
        expected, actual = sql[row_id], fallback[row_id]
        for field in expected:
            if field in implied:
                if field in actual:
                    problems.append(
                        f"{kind} {row_id}: {field} is implied by the nested shape "
                        f"but the no-DB adapter emits it anyway"
                    )
                continue
            if field not in actual:
                problems.append(
                    f"{kind} {row_id}: {field} reaches the database and not the "
                    f"no-DB adapter (would be {expected[field]!r})"
                )
            elif actual[field] != expected[field]:
                problems.append(
                    f"{kind} {row_id}: {field} differs — "
                    f"database {expected[field]!r} vs no-DB {actual[field]!r}"
                )
        for field in actual:
            if field not in expected and field not in implied:
                problems.append(
                    f"{kind} {row_id}: {field} is served without a database and "
                    f"stored nowhere ({actual[field]!r})"
                )
    return problems


def check(ir_path: Path, locale: str | None) -> list[str]:
    doc, load_error = validate_ir.load_ir(ir_path)
    if load_error is not None:
        return [f"{ir_path}: {load_error}"]
    report = validate_ir.Report(ir_path.name)
    validate_ir.validate_document(doc, report)
    if report.errors:
        return [f"{ir_path}: IR does not validate — {report.errors[0]}"]

    locales = [locale] if locale else list(doc["locales"])
    problems = []
    for tag in locales:
        model = build_model(doc, tag)
        sql_cells, sql_triggers = sql_adapter_rows(model)
        fb_cells, fb_triggers = fallback_adapter_rows(model)
        if not sql_cells:
            problems.append(f"{ir_path} [{tag}]: no cells to compare — vacuous parity")
        problems += [
            f"{ir_path} [{tag}]: {line}"
            for line in compare("cell", sql_cells, fb_cells, IMPLIED_BY_NESTING)
            + compare("edge", sql_triggers, fb_triggers, frozenset())
        ]
    return problems


def main(argv=None) -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("ir", nargs="*", type=Path, default=[DEFAULT_IR])
    parser.add_argument("--locale", help="check one locale (default: every locale in the IR)")
    args = parser.parse_args(argv)

    problems = []
    for ir_path in args.ir or [DEFAULT_IR]:
        problems += check(ir_path, args.locale)

    if problems:
        print("The two v1 adapters disagree:\n", file=sys.stderr)
        for line in problems:
            print(f"  {line}", file=sys.stderr)
        print(
            "\nBoth adapters project the same model through "
            "generate_seed_sql.seed_cell_fields / seed_trigger_fields. "
            "A field belongs in that projection or in neither adapter.",
            file=sys.stderr,
        )
        return 1
    print("the SQL and no-DB adapters agree on every field")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
