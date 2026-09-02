#!/usr/bin/env python3
"""Slice authoring toolkit: IR + a slice file -> validated rows, SQL, docs.

A **slice** is an ordered one-dimensional selection of cells that already
exist in the blueprint. It never creates a cell, never edits one, and never
changes the blueprint's shape — which is what makes it safe to regenerate.

Why this is a script rather than skill prose: the cell-id derivation has to
agree byte-for-byte with `generate_seed_sql.py`, or a slice points at rows
that do not exist. The rule is:

    cell_key = <service>/<phase>/<scenario>/<path>/<lane>/<step>
    cell_id  = uuid5(NAMESPACE, NFC(f"{locale}:cell:{cell_key}"))

`slides` stores **both**: `cell_ids` for the join the frontend actually
runs, and `cell_keys` so a slice survives a re-import (scenario import is
delete-and-reinsert, so ids are stable only while the IR keys are — and a
renamed key must be *reported*, not silently repaired).

Commands:

    slice_tools.py select   --ir IR --scenario K --type T ...   # propose cells
    slice_tools.py validate --ir IR --slices FILE               # gate
    slice_tools.py sql      --ir IR --slices FILE --locale en   # adapter input
    slice_tools.py doc      --ir IR --slices FILE --locale en   # markdown

`select` writes a slice-file skeleton to stdout; the agent edits captions and
narrative, then validates. Nothing here talks to a database.
"""

from __future__ import annotations

import argparse
import json
import sys
import unicodedata
import uuid
from pathlib import Path

SCRIPT_DIR = Path(__file__).resolve().parent
# Shared pipeline scripts live at the plugin root's scripts/, two levels up
# from this skill-owned directory (skills/slice/scripts/).
SHARED_SCRIPTS = SCRIPT_DIR.parents[2] / "scripts"
sys.path.insert(0, str(SHARED_SCRIPTS))

# Same namespace and derivation as every other adapter. Imported rather than
# copied: two definitions of this constant is exactly the bug that would make
# slices point at nothing.
from generate_seed_sql import entity_uuid, pick_text  # noqa: E402

SLICE_KINDS = ("journey", "step", "lane", "cell", "custom")
ORIGINS = ("generated", "customized", "human")


class SliceError(Exception):
    """A problem the agent must surface, never paper over."""


# ---------------------------------------------------------------------------
# IR indexing
# ---------------------------------------------------------------------------


def load_json(path: Path) -> dict:
    with path.open(encoding="utf-8") as handle:
        return json.load(handle)


def index_ir(doc: dict) -> dict:
    """Flatten the IR into lookups keyed the way slices reference things.

    Returns scenarios keyed `<phase>/<scenario>`, each carrying its steps in
    order, its paths, and every cell under `<path>/<lane>/<step>`.
    """
    service = doc["service"]
    service_key = service["key"]
    scenarios: dict[str, dict] = {}

    for phase in service.get("phases", []):
        for scenario in phase.get("scenarios", []):
            scenario_key = f"{phase['key']}/{scenario['key']}"
            steps = {step["key"]: step for step in scenario["steps"]}
            paths = {}

            for path in scenario["paths"]:
                lanes = {lane["key"]: lane for lane in path["lanes"]}
                cells = {}
                for cell in path["cells"]:
                    cells[(cell["lane"], cell["step"])] = cell
                paths[path["key"]] = {
                    "raw": path,
                    "lanes": lanes,
                    # Column order is the path's own; a step the path never
                    # registered has no column and cannot be selected.
                    "step_order": list(path["path_steps"]),
                    "cells": cells,
                    "triggers": path.get("triggers", []),
                }

            scenarios[scenario_key] = {
                "raw": scenario,
                "phase": phase,
                "steps": steps,
                "paths": paths,
                "prefix": f"{service_key}/{scenario_key}",
            }

    return {"service_key": service_key, "scenarios": scenarios, "locales": doc["locales"]}


def cell_key(index: dict, scenario_key: str, path_key: str, lane_key: str, step_key: str) -> str:
    """The qualified key that `generate_seed_sql.py` hashes into a cell id."""
    prefix = index["scenarios"][scenario_key]["prefix"]
    return f"{prefix}/{path_key}/{lane_key}/{step_key}"


def cell_id(locale: str, key: str) -> str:
    return entity_uuid(locale, "cell", key)


def slice_id(locale: str, service_key: str, key: str) -> str:
    return entity_uuid(locale, "slice", f"{service_key}/{key}")


def slice_item_id(locale: str, service_key: str, key: str, position: int) -> str:
    return entity_uuid(locale, "slice_item", f"{service_key}/{key}#{position}")


# ---------------------------------------------------------------------------
# Selection rules — one function per slice type
# ---------------------------------------------------------------------------


def _ordered_steps(path: dict) -> list[str]:
    return list(path["step_order"])


def select_lane(index: dict, scenario_key: str, path_key: str, lane_key: str) -> list[list[str]]:
    """A lane read left to right: one frame per step the lane actually fills.

    Empty (lane, step) intersections are skipped rather than framed blank —
    a lane is usually sparse, and blank frames read as missing content.
    """
    scenario = index["scenarios"][scenario_key]
    path = scenario["paths"][path_key]
    if lane_key not in path["lanes"]:
        raise SliceError(f"lane '{lane_key}' is not on path '{path_key}'")

    frames = []
    for step_key in _ordered_steps(path):
        if (lane_key, step_key) in path["cells"]:
            frames.append([cell_key(index, scenario_key, path_key, lane_key, step_key)])
    return frames


def select_step(index: dict, scenario_key: str, path_key: str, step_key: str) -> list[list[str]]:
    """One column, top to bottom — every lane's cell at that moment.

    Ordered by `row`, so the frame reads down the blueprint the way the grid
    does (customer at the top, support at the bottom).
    """
    scenario = index["scenarios"][scenario_key]
    path = scenario["paths"][path_key]
    if step_key not in _ordered_steps(path):
        raise SliceError(f"step '{step_key}' is not a column on path '{path_key}'")

    lanes = sorted(path["lanes"].values(), key=lambda lane: lane["row"])
    keys = [
        cell_key(index, scenario_key, path_key, lane["key"], step_key)
        for lane in lanes
        if (lane["key"], step_key) in path["cells"]
    ]
    return [keys] if keys else []


def select_cell(index: dict, scenario_key: str, path_key: str, lane_key: str, step_key: str) -> list[list[str]]:
    scenario = index["scenarios"][scenario_key]
    path = scenario["paths"][path_key]
    if (lane_key, step_key) not in path["cells"]:
        raise SliceError(f"no cell at ({lane_key}, {step_key}) on path '{path_key}'")
    return [[cell_key(index, scenario_key, path_key, lane_key, step_key)]]


def select_journey(index: dict, scenario_key: str, path_key: str, lane_key: str) -> list[list[str]]:
    """An actor's experience: their own cells plus what they touch.

    "What they touch" is taken from `cell_dependencies` — the arrows the blueprint
    already draws — rather than from a guess about which lanes are adjacent.
    A journey that claimed an interaction the blueprint does not record would
    be an invention, and inventions are the failure mode this whole system is
    built to avoid.

    One frame per step: the actor's cell first (it is the spine), then the
    cells it exchanges with, ordered by lane row.
    """
    scenario = index["scenarios"][scenario_key]
    path = scenario["paths"][path_key]
    if lane_key not in path["lanes"]:
        raise SliceError(f"lane '{lane_key}' is not on path '{path_key}'")

    # Adjacency over the path's dependency edges, undirected: being triggered
    # *by* the actor and triggering *them* are both contact, and so is a
    # `needs` edge either way — the canvas draws no arrow for one, but a cell
    # that this actor's work depends on is still a cell in contact with it.
    touching: dict[tuple[str, str], set[tuple[str, str]]] = {}
    for trigger in path["triggers"]:
        source = (trigger["source"]["lane"], trigger["source"]["step"])
        target = (trigger["target"]["lane"], trigger["target"]["step"])
        touching.setdefault(source, set()).add(target)
        touching.setdefault(target, set()).add(source)

    rows = {lane["key"]: lane["row"] for lane in path["lanes"].values()}
    frames = []
    for step_key in _ordered_steps(path):
        anchor = (lane_key, step_key)
        if anchor not in path["cells"]:
            continue
        companions = sorted(
            (cell for cell in touching.get(anchor, set()) if cell in path["cells"] and cell != anchor),
            key=lambda cell: (rows.get(cell[0], 99), cell[1]),
        )
        keys = [cell_key(index, scenario_key, path_key, *anchor)]
        keys += [cell_key(index, scenario_key, path_key, *cell) for cell in companions]
        frames.append(keys)
    return frames


def select_custom(index: dict, scenario_key: str, path_key: str, cells: list[str]) -> list[list[str]]:
    """User-listed `lane:step` pairs, in the order given — one frame each."""
    scenario = index["scenarios"][scenario_key]
    path = scenario["paths"][path_key]
    frames = []
    for entry in cells:
        if ":" not in entry:
            raise SliceError(f"custom cell '{entry}' must be written 'lane:step'")
        lane_key, step_key = entry.split(":", 1)
        if (lane_key, step_key) not in path["cells"]:
            raise SliceError(f"no cell at ({lane_key}, {step_key}) on path '{path_key}'")
        frames.append([cell_key(index, scenario_key, path_key, lane_key, step_key)])
    return frames


# ---------------------------------------------------------------------------
# Validation
# ---------------------------------------------------------------------------


def validate_slices(index: dict, doc: dict) -> list[str]:
    """Every rule a slice must satisfy before it may be imported.

    Returns human-readable problems; empty list means the file is importable.
    """
    problems: list[str] = []
    known_keys = set()
    for scenario_key, scenario in index["scenarios"].items():
        for path_key, path in scenario["paths"].items():
            for lane_key, step_key in path["cells"]:
                known_keys.add(cell_key(index, scenario_key, path_key, lane_key, step_key))

    seen_slice_keys = set()
    for position, entry in enumerate(doc.get("slices", [])):
        label = entry.get("key", f"#{position}")

        if not entry.get("key"):
            problems.append(f"slice {label}: missing 'key'")
        elif entry["key"] in seen_slice_keys:
            problems.append(f"slice {label}: duplicate key")
        else:
            seen_slice_keys.add(entry["key"])

        if entry.get("type") not in SLICE_KINDS:
            problems.append(f"slice {label}: type must be one of {', '.join(SLICE_KINDS)}")
        if entry.get("origin", "generated") not in ORIGINS:
            problems.append(f"slice {label}: origin must be one of {', '.join(ORIGINS)}")
        if not entry.get("title"):
            problems.append(f"slice {label}: missing 'title'")

        frames = entry.get("frames", [])
        if not frames:
            problems.append(f"slice {label}: needs at least one frame")

        # v1 is single-scenario: the frontend resolves a slice's canvas from
        # its cells, and cells from two scenarios have no shared canvas.
        scenarios_touched = set()
        seen_cells = set()
        for frame_index, frame in enumerate(frames):
            keys = frame.get("cells", [])
            if not keys:
                problems.append(f"slice {label} frame {frame_index}: no cells")
            for key in keys:
                if key not in known_keys:
                    problems.append(
                        f"slice {label} frame {frame_index}: cell key not in IR — {key}"
                    )
                    continue
                if key in seen_cells:
                    problems.append(
                        f"slice {label} frame {frame_index}: cell appears twice — {key}"
                    )
                seen_cells.add(key)
                # <service>/<phase>/<scenario>/<path>/<lane>/<step>
                scenarios_touched.add("/".join(key.split("/")[:3]))

        if len(scenarios_touched) > 1:
            problems.append(
                f"slice {label}: spans {len(scenarios_touched)} scenarios; v1 slices are "
                "single-scenario (" + ", ".join(sorted(scenarios_touched)) + ")"
            )

    return problems


# ---------------------------------------------------------------------------
# Emitters
# ---------------------------------------------------------------------------


def sql_quote(value) -> str:
    if value is None:
        return "null"
    return "'" + str(value).replace("'", "''") + "'"


def sql_array(values: list[str], cast: str) -> str:
    if not values:
        return f"'{{}}'::{cast}"
    inner = ",".join(sql_quote(value) for value in values)
    return f"array[{inner}]::{cast}"


def emit_sql(index: dict, doc: dict, locale: str, service_id: str) -> str:
    """Transactional replace, per slice — same semantics as scenario import.

    Deleting the slice row cascades its items, so a regenerated slice never
    leaves stale frames behind.
    """
    service_key = index["service_key"]
    locales = index["locales"]
    lines = [
        "-- Generated by skills/slice/scripts/slice_tools.py — do not edit by hand.",
        f"-- locale: {locale}",
        "begin;",
        "",
    ]

    for entry in doc["slices"]:
        sid = slice_id(locale, service_key, entry["key"])
        title = pick_text(entry["title"], locale, locales)
        description = pick_text(entry.get("description"), locale, locales)
        lines.append(f"-- slice: {entry['key']} ({entry['type']})")
        lines.append(f"delete from public.slices where id = {sql_quote(sid)};")
        lines.append(
            "insert into public.slices "
            "(id, service_id, kind, title, description, actor, locale, origin, position) values ("
            f"{sql_quote(sid)}, {sql_quote(service_id)}, {sql_quote(entry['type'])}, "
            f"{sql_quote(title)}, {sql_quote(description)}, {sql_quote(entry.get('actor'))}, "
            f"{sql_quote(locale)}, {sql_quote(entry.get('origin', 'generated'))}, {int(entry.get('order', 0))});"
        )

        for position, frame in enumerate(entry["frames"]):
            keys = frame["cells"]
            ids = [cell_id(locale, key) for key in keys]
            title = pick_text(frame.get("title"), locale, locales)
            narrative = pick_text(frame.get("narrative"), locale, locales)
            illustration = frame.get("illustration")
            lines.append(
                "insert into public.slides "
                "(id, slice_id, position, cell_ids, cell_keys, title, narrative, illustration) values ("
                f"{sql_quote(slice_item_id(locale, service_key, entry['key'], position))}, "
                f"{sql_quote(sid)}, {position}, {sql_array(ids, 'uuid[]')}, "
                f"{sql_array(keys, 'text[]')}, {sql_quote(title)}, {sql_quote(narrative)}, "
                + (f"{sql_quote(json.dumps(illustration, ensure_ascii=False))}::jsonb" if illustration else "null")
                + ");"
            )
        lines.append("")

    lines.append("commit;")
    return "\n".join(lines)


def emit_doc(index: dict, doc: dict, locale: str) -> str:
    """The markdown companion — the artifact a human reads in a review.

    Cells are cited by key, never by quoted evidence: derived artifacts must
    not reproduce excerpts (see the skill's hard rules).
    """
    locales = index["locales"]
    out: list[str] = []

    for entry in doc["slices"]:
        title = pick_text(entry["title"], locale, locales)
        description = pick_text(entry.get("description"), locale, locales)
        out.append(f"# {title}")
        out.append("")
        out.append(f"`{entry['key']}` · **{entry['type']}**" + (f" · {entry['actor']}" if entry.get("actor") else ""))
        out.append("")
        if description:
            out.append(description)
            out.append("")

        for position, frame in enumerate(entry["frames"], start=1):
            title = pick_text(frame.get("title"), locale, locales) or f"Frame {position}"
            out.append(f"## {position}. {title}")
            out.append("")
            narrative = pick_text(frame.get("narrative"), locale, locales)
            if narrative:
                out.append(narrative)
                out.append("")
            for key in frame["cells"]:
                path_key, lane_key, step_key = key.split("/")[3:6]
                out.append(f"- `{lane_key}` @ `{step_key}` — `{key}`")
            out.append("")

    return "\n".join(out)


# ---------------------------------------------------------------------------
# CLI
# ---------------------------------------------------------------------------


def build_skeleton(args, index: dict) -> dict:
    scenario_key = args.scenario
    if scenario_key not in index["scenarios"]:
        raise SliceError(
            f"unknown scenario '{scenario_key}' — known: {', '.join(sorted(index['scenarios']))}"
        )
    scenario = index["scenarios"][scenario_key]
    path_key = args.path or next(iter(scenario["paths"]))
    if path_key not in scenario["paths"]:
        raise SliceError(f"unknown path '{path_key}' in scenario '{scenario_key}'")

    if args.type == "lane":
        frames = select_lane(index, scenario_key, path_key, _require(args.lane, "--lane"))
    elif args.type == "step":
        frames = select_step(index, scenario_key, path_key, _require(args.step, "--step"))
    elif args.type == "cell":
        frames = select_cell(
            index, scenario_key, path_key, _require(args.lane, "--lane"), _require(args.step, "--step")
        )
    elif args.type == "journey":
        frames = select_journey(index, scenario_key, path_key, _require(args.lane, "--lane"))
    else:
        frames = select_custom(index, scenario_key, path_key, args.cell or [])

    if not frames:
        raise SliceError("selection matched no cells — check the lane/step keys")

    steps = index["scenarios"][scenario_key]["steps"]
    skeleton_frames = []
    for frame in frames:
        step_key = frame[0].split("/")[5]
        title = steps[step_key]["name"] if step_key in steps else {"en": ""}
        skeleton_frames.append({"title": title, "narrative": {"en": ""}, "cells": frame})

    return {
        "schema_version": "1.0.0",
        "slices": [
            {
                "key": args.key,
                "type": args.type,
                "scenario": scenario_key,
                "path": path_key,
                "title": {"en": args.key.replace("-", " ").capitalize()},
                "description": {"en": ""},
                "actor": args.actor,
                "origin": "generated",
                "order": 0,
                "frames": skeleton_frames,
            }
        ],
    }


def _require(value, flag: str):
    if not value:
        raise SliceError(f"{flag} is required for this slice type")
    return value


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    sub = parser.add_subparsers(dest="command", required=True)

    select = sub.add_parser("select", help="propose a slice skeleton from the IR")
    select.add_argument("--ir", required=True, type=Path)
    select.add_argument("--scenario", required=True, help="<phase>/<scenario> key")
    select.add_argument("--path", help="defaults to the scenario's first path")
    select.add_argument("--type", required=True, choices=SLICE_KINDS)
    select.add_argument("--key", required=True, help="stable slice key")
    select.add_argument("--lane", help="lane key (journey, lane, cell)")
    select.add_argument("--step", help="step key (step, cell)")
    select.add_argument("--actor", help="actor label recorded on the slice")
    select.add_argument("--cell", action="append", help="custom: 'lane:step', repeatable")

    for name, helptext in (
        ("validate", "check a slice file against the IR"),
        ("sql", "emit the import SQL"),
        ("doc", "emit the markdown companion"),
    ):
        command = sub.add_parser(name, help=helptext)
        command.add_argument("--ir", required=True, type=Path)
        command.add_argument("--slices", required=True, type=Path)
        if name != "validate":
            command.add_argument("--locale", required=True)
        if name == "sql":
            command.add_argument("--service-id", required=True, help="target services.id")

    args = parser.parse_args()

    try:
        index = index_ir(load_json(args.ir))

        if args.command == "select":
            print(json.dumps(build_skeleton(args, index), ensure_ascii=False, indent=2))
            return 0

        doc = load_json(args.slices)
        problems = validate_slices(index, doc)
        if problems:
            for problem in problems:
                print(f"error: {problem}", file=sys.stderr)
            return 1

        if args.command == "validate":
            count = sum(len(entry["frames"]) for entry in doc["slices"])
            print(f"ok: {len(doc['slices'])} slice(s), {count} frame(s)")
        elif args.command == "sql":
            print(emit_sql(index, doc, args.locale, args.service_id))
        else:
            print(emit_doc(index, doc, args.locale))
        return 0

    except SliceError as error:
        print(f"error: {error}", file=sys.stderr)
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
