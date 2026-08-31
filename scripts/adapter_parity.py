#!/usr/bin/env python3
"""Check that the two v1 adapters really are behaviourally identical.

Usage:
    python3 scripts/adapter_parity.py [<ir-file> ...] [--locale <tag>]

references/adapter-contract.md names two adapters — the SQL one and the no-DB
one — and says the second is "not a degraded mode". That sentence was untrue
for months in the direction that costs an adopter the most: the no-DB adapter
dropped cell_key, position, every cell spec field, and the edge kind,
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
from generate_fallbacks import (  # noqa: E402
    FALLBACK_FIELD_NAMES,
    IMPLIED_BY_NESTING,
    IMPLIED_ON_RESOURCE,
    IMPLIED_ON_TOUCHPOINT,
    NESTED_UNDER_CELL,
    blueprint_data_for_path,
)
from generate_seed_sql import (  # noqa: E402
    build_model,
    seed_cell_fields,
    seed_lane_fields,
    seed_resource_fields,
    seed_touchpoint_fields,
    seed_trigger_fields,
)

DEFAULT_IR = Path(__file__).resolve().parent / "tests" / "sample-ir.json"


#: The aggregates compared, and what each treats as implied by nesting.
#: Every aggregate is compared: cells and edges were compared first and lanes
#: were not, so a lane field could be carried by one adapter only and the
#: harness still reported agreement — which it did.
KINDS = {
    "lane": (IMPLIED_BY_NESTING, frozenset()),
    "cell": (IMPLIED_BY_NESTING, NESTED_UNDER_CELL),
    "edge": (IMPLIED_BY_NESTING, frozenset()),
    "resource": (IMPLIED_ON_RESOURCE, frozenset()),
    "touchpoint": (IMPLIED_ON_TOUCHPOINT, frozenset()),
}


def sql_adapter_rows(model: dict) -> dict:
    """What the SQL adapter would write, per aggregate, keyed by row id."""
    rows = {kind: {} for kind in KINDS}
    for scenario in model["scenarios"]:
        for path in scenario["paths"]:
            for lane in path["lanes"]:
                rows["lane"][lane["id"]] = seed_lane_fields(lane, path)
            for cell in path["cells"]:
                rows["cell"][cell["id"]] = seed_cell_fields(cell, path)
                for resource in cell["resources"]:
                    rows["resource"][resource["id"]] = seed_resource_fields(
                        resource, cell
                    )
                for touchpoint in cell["touchpoints"]:
                    rows["touchpoint"][touchpoint["id"]] = seed_touchpoint_fields(
                        touchpoint, cell
                    )
            for trigger in path["triggers"]:
                rows["edge"][trigger["id"]] = seed_trigger_fields(trigger)
    return rows


def fallback_adapter_rows(model: dict, sql: dict) -> dict:
    """What the no-DB adapter would serve, keyed by the same row ids.

    A resource is served with no id — the fallback shape nests it under its
    cell and the app rewrites the list as a whole — so it is keyed here by the
    id the SQL adapter gives the row in the same position of the same cell.
    That is a real comparison rather than a tautology: the two adapters agree
    on which cell holds how many resources in what order, or the zip below
    lines up rows that do not correspond and every field disagrees.
    """
    rows = {kind: {} for kind in KINDS}
    sql_by_cell = {"resource": {}, "touchpoint": {}}
    for kind in sql_by_cell:
        for row_id, fields in sql[kind].items():
            sql_by_cell[kind].setdefault(fields["cell_id"], []).append(row_id)

    for scenario in model["scenarios"]:
        for path in scenario["paths"]:
            data = blueprint_data_for_path(scenario, path)
            for kind, key in (("lane", "lanes"), ("cell", "cells"), ("edge", "triggers")):
                for row in data[key]:
                    rows[kind][row["id"]] = row
            for cell in data["cells"]:
                for kind, key in (("resource", "resources"), ("touchpoint", "touchpoints")):
                    ids = sql_by_cell[kind].get(cell["id"], [])
                    served = cell[key]
                    if len(ids) != len(served):
                        # Reported as a missing/extra row by compare() below,
                        # which is where a count disagreement belongs.
                        continue
                    for row_id, row in zip(ids, served):
                        rows[kind][row_id] = row
    return rows


def compare(
    kind: str,
    sql: dict,
    fallback: dict,
    implied: frozenset,
    nested: frozenset = frozenset(),
) -> list[str]:
    """Every disagreement between the two adapters, as readable lines."""
    problems = []
    for missing in sorted(set(sql) - set(fallback)):
        problems.append(f"{kind} {missing}: written to the database, absent without one")
    for extra in sorted(set(fallback) - set(sql)):
        problems.append(f"{kind} {extra}: served without a database, never written to one")

    for row_id in sorted(set(sql) & set(fallback)):
        expected, actual = sql[row_id], fallback[row_id]
        for field in expected:
            served = FALLBACK_FIELD_NAMES.get(field, field)
            if field in implied:
                if served in actual:
                    problems.append(
                        f"{kind} {row_id}: {field} is implied by the nested shape "
                        f"but the no-DB adapter emits it anyway"
                    )
                continue
            if served not in actual:
                problems.append(
                    f"{kind} {row_id}: {field} reaches the database and not the "
                    f"no-DB adapter (would be {expected[field]!r})"
                )
            elif actual[served] != expected[field]:
                problems.append(
                    f"{kind} {row_id}: {field} differs — "
                    f"database {expected[field]!r} vs no-DB {actual[served]!r}"
                )
        served_names = {FALLBACK_FIELD_NAMES.get(name, name) for name in expected}
        for field in actual:
            if field in nested:
                continue
            if field not in served_names and field not in implied:
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
        sql = sql_adapter_rows(model)
        fallback = fallback_adapter_rows(model, sql)
        for kind in KINDS:
            if not sql[kind]:
                problems.append(f"{ir_path} [{tag}]: no {kind} rows — vacuous parity")
        problems += [
            f"{ir_path} [{tag}]: {line}"
            for kind, (implied, nested) in KINDS.items()
            for line in compare(kind, sql[kind], fallback[kind], implied, nested)
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
