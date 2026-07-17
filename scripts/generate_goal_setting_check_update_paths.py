#!/usr/bin/env python3
"""Generate SQL migration for Check Goals and Update Goals paths."""

from __future__ import annotations

import json
from pathlib import Path

SCENARIO_ID = "a0000000-0000-4000-8000-000000000204"

PARTNER_CONTENT = [
    "Circulate and quietly observe the students",
    "Remind students to keep working while waiting",
    "Checks if all students are in the correct breakout room",
    "Receives information that student is absent from session",
    'Alerts lead tutor about unassigned or miss-assigned students using the "ask for help" alert',
    "Handles student tech problems as they arise",
    "Escalates unresolved issues to tutors@tutor.plus promptly",
]

LEAD_CONTENT = [
    "Rename students to match roster name",
    "Add any un-rostered students to attendance list",
    "Manually assign unpaired students to available tutors",
    "Inform Classroom teacher about students that are absent",
    'Respond to classroom teachers "ask for help" request',
]

SUPPORT_DEV_DESIGN = "Dev Team\\nDesign team"

PATHS = [
    {
        "key": "check",
        "path_id": "a0000000-0000-4000-8000-000000000814",
        "name": "Check Goals",
        "description": "Goal already set, but deadline not reached.",
        "layer_prefix": "8b",
        "cell_prefix": "a0",
        "trigger_prefix": "09c",
        "step_keys": ["9b01", "9b02", "9b03", "9b04", "9b05", "9b06", "9b07", "9b08"],
        "step_names": [
            "Join breakout session",
            "Click on 'Check Goals' CTA in the Action Column",
            "Share Screen",
            "Review goals that were set with student",
            "Once goal review is done, clicks on 'Check Goals' button",
            "Finalize checking goal with the student.",
            "Leave breakout room",
            "Move on to the next student in sorted order set by researchers.",
        ],
        "regular": [
            "Join breakout session",
            "Click on 'Check Goals' CTA in the Action Column",
            "Share Screen",
            "Review goals that were set with student",
            "Once goal review is done, clicks on 'Check Goals' button",
            "Finalize checking goal with the student.",
            "Leave breakout room",
            "Move on to the next student in sorted order set by researchers.",
        ],
        "front_stage_tech": [
            "Zoom/Pencil",
            "PLUS App",
            "Zoom/Pencil, PLUS App",
            "Zoom/Pencil",
            "Zoom/Pencil, PLUS App",
            "Zoom/Pencil, PLUS App",
            "Zoom/Pencil",
            "PLUS App",
        ],
        "back_stage": {
            4: "Researchers set goal setting activities",
            5: "Researchers set goal setting activities",
            6: "Researchers set goal setting activities",
            8: "Researchers set student order",
        },
        "support": {
            2: SUPPORT_DEV_DESIGN,
            3: SUPPORT_DEV_DESIGN,
            4: SUPPORT_DEV_DESIGN,
            5: SUPPORT_DEV_DESIGN,
            6: SUPPORT_DEV_DESIGN,
            8: "Researchers set student order, Dev Team, Design team",
        },
        "loop_from": 8,
    },
    {
        "key": "update",
        "path_id": "a0000000-0000-4000-8000-000000000815",
        "name": "Update Goals",
        "description": "First Tutoring Day of a New Goal Cycle after a Personalized Goal Had Been Set.",
        "layer_prefix": "8d",
        "cell_prefix": "b0",
        "trigger_prefix": "09e",
        "step_keys": [
            "9d01",
            "9d02",
            "9d03",
            "9d04",
            "9d05",
            "9d06",
            "9d07",
            "9d08",
            "9d09",
            "9d0a",
            "9d0b",
        ],
        "step_names": [
            "Join breakout session",
            "Click on 'Update Goals' CTA in the Action Column",
            "Share Screen",
            "Review last goal cycle overview and system suggestion",
            "Once student understands, starts updating goal for the next goal cycle while sharing screen",
            "Fills out goal settings and quantity with the student",
            "If prompted, fill out goal achievement strategy with the student",
            "Save goal",
            "Finalize updating goal with the student",
            "Leave breakout room",
            "Move on to the next student in sorted order set by researchers.",
        ],
        "regular": [
            "Join breakout session",
            "Click on 'Update Goals' CTA in the Action Column",
            "Share Screen",
            "Review last goal cycle overview and system suggestion",
            "Once student understands, starts updating goal for the next goal cycle while sharing screen",
            "Fills out goal settings and quantity with the student",
            "If prompted, fill out goal achievement strategy with the student",
            "Save goal",
            "Finalize updating goal with the student",
            "Leave breakout room",
            "Move on to the next student in sorted order set by researchers.",
        ],
        "front_stage_tech": [
            "Zoom/Pencil",
            "PLUS App",
            "Zoom/Pencil, PLUS App",
            "Zoom/Pencil",
            "Zoom/Pencil, PLUS App",
            "Zoom/Pencil, PLUS App",
            "Zoom/Pencil, PLUS App",
            "Zoom/Pencil, PLUS App",
            "Zoom/Pencil, PLUS App",
            "Zoom/Pencil",
            "PLUS App",
        ],
        "back_stage": {
            i: "Researchers set goal setting activities" for i in range(4, 10)
        }
        | {11: "Researchers set student order"},
        "support": {i: SUPPORT_DEV_DESIGN for i in range(2, 9)}
        | {11: "Dev Team, Design team"},
        "loop_from": 11,
    },
    {
        "key": "edge",
        "path_id": "a0000000-0000-4000-8000-000000000816",
        "name": "Set Goals Edge Case",
        "description": (
            "Goal cycle began and deadline not reached, but student did not set goal "
            "last session and student has no prior goals."
        ),
        "layer_prefix": "8e",
        "cell_prefix": "c0",
        "trigger_prefix": "09f",
        "step_keys": [
            "9f01",
            "9f02",
            "9f03",
            "9f04",
            "9f05",
            "9f06",
            "9f07",
            "9f08",
            "9f09",
            "9f0a",
            "9f0b",
            "9f0c",
        ],
        "step_names": [
            "Join breakout session",
            (
                "Sees action color in dashboard is warning and CTA copy is 'Set Goals' "
                "within a mid-cycle goal check-in session."
            ),
            "Click on 'Set Goals' CTA in the action column",
            "Share Screen",
            "Explain to student what goal setting is",
            "Once student understands, starts setting first goal while sharing screen",
            "Fill out goal settings and quantity with the student",
            "If prompted, fill out goal achievement strategy with the student",
            "Save goal",
            "Finalize goal setting with student",
            "Leave breakout room",
            "Move on to the next student in sorted order set by researchers",
        ],
        "regular": [
            "Join breakout session",
            (
                "Sees action color in dashboard is warning and CTA copy is 'Set Goals' "
                "within a mid-cycle goal check-in session."
            ),
            "Click on 'Set Goals' CTA in the action column",
            "Share Screen",
            "Explain to student what goal setting is",
            "Once student understands, starts setting first goal while sharing screen",
            "Fill out goal settings and quantity with the student",
            "If prompted, fill out goal achievement strategy with the student",
            "Save goal",
            "Finalize goal setting with student",
            "Leave breakout room",
            "Move on to the next student in sorted order set by researchers",
        ],
        "front_stage_tech": [
            "Zoom/Pencil",
            "PLUS App",
            "PLUS App",
            "Zoom/Pencil, PLUS App",
            "Zoom/Pencil",
            "Zoom/Pencil, PLUS App",
            "Zoom/Pencil, PLUS App",
            "Zoom/Pencil, PLUS App",
            "Zoom/Pencil, PLUS App",
            "Zoom/Pencil, PLUS App",
            "Zoom/Pencil",
            "PLUS App",
        ],
        "back_stage": {i: "Researchers set goal setting activities" for i in range(5, 11)}
        | {12: "Researchers set student order"},
        "support": {i: SUPPORT_DEV_DESIGN for i in range(2, 11)}
        | {12: SUPPORT_DEV_DESIGN},
        "loop_from": 12,
    },
    {
        "key": "updated_edge",
        "path_id": "a0000000-0000-4000-8000-000000000817",
        "name": "Update Goals Edge Case",
        "description": (
            "Goal cycle began and deadline not reached, but student did not set goal "
            "last session and has prior goals."
        ),
        "layer_prefix": "8f",
        "cell_prefix": "d0",
        "trigger_prefix": "09e",
        "step_keys": [
            "9e01",
            "9e02",
            "9e03",
            "9e04",
            "9e05",
            "9e06",
            "9e07",
            "9e08",
            "9e09",
            "9e0a",
            "9e0b",
            "9e0c",
        ],
        "step_names": [
            "Join breakout session",
            (
                "Sees action color in dashboard is warning and CTA copy is 'Update Goals' "
                "within a mid-cycle goal check-in session."
            ),
            "Click on 'Update Goals' CTA in the action column",
            "Share Screen",
            "Review last goal cycle overview and system suggestion",
            (
                "Once student understands, starts updating goal for the next goal cycle "
                "while sharing screen"
            ),
            "Fills out goal settings and quantity with the student",
            "If prompted, fill out goal achievement strategy with the student",
            "Save goal",
            "Finalize updating goal with student",
            "Leave breakout room",
            "Move on to the next student in sorted order set by researchers",
        ],
        "regular": [
            "Join breakout session",
            (
                "Sees action color in dashboard is warning and CTA copy is 'Update Goals' "
                "within a mid-cycle goal check-in session."
            ),
            "Click on 'Update Goals' CTA in the action column",
            "Share Screen",
            "Review last goal cycle overview and system suggestion",
            (
                "Once student understands, starts updating goal for the next goal cycle "
                "while sharing screen"
            ),
            "Fills out goal settings and quantity with the student",
            "If prompted, fill out goal achievement strategy with the student",
            "Save goal",
            "Finalize updating goal with student",
            "Leave breakout room",
            "Move on to the next student in sorted order set by researchers",
        ],
        "front_stage_tech": [
            "Zoom/Pencil",
            "PLUS App",
            "PLUS App",
            "Zoom/Pencil, PLUS App",
            "Zoom/Pencil, PLUS App",
            "Zoom/Pencil, PLUS App",
            "Zoom/Pencil, PLUS App",
            "Zoom/Pencil, PLUS App",
            "Zoom/Pencil, PLUS App",
            "Zoom/Pencil, PLUS App",
            "Zoom/Pencil",
            "PLUS App",
        ],
        "back_stage": {i: "Researcher sets goal setting activities" for i in range(5, 11)}
        | {12: "Researcher sets goal setting activities"},
        "support": {i: SUPPORT_DEV_DESIGN for i in range(2, 10)} | {12: SUPPORT_DEV_DESIGN},
        "loop_from": 12,
    },
]

LAYER_NAMES = [
    ("0", "Visual"),
    ("1", "Partner Action: Teacher"),
    ("2", "Lead Tutor"),
    ("3", "Regular Tutor"),
    ("4", "Front Stage Tech"),
    ("5", "Front Stage Actions"),
    ("6", "Back Stage Actions"),
    ("7", "Back Stage Tech"),
    ("8", "Support Actions"),
]


def sid(key: str) -> str:
    return f"a0000000-0000-4000-8000-00000000{key}"


def layer_id(prefix: str, slot: str) -> str:
    return f"a0000000-0000-4000-8000-000000000{prefix}{slot}"


def cell_id(prefix: str, step: int, suffix: str) -> str:
    return f"a0000000-0000-4000-8000-000000{prefix}{step:02d}{suffix}"


def trigger_id(prefix: str, slot: str) -> str:
    return f"a0000000-0000-4000-8000-000000{prefix}{slot}"


def sql_str(value: str) -> str:
    if "\n" in value and not value.startswith("E'"):
        return "E'" + value.replace("'", "''") + "'"
    return "'" + value.replace("'", "''") + "'"


def build_path_sql(path: dict) -> list[str]:
    lines: list[str] = []
    pid = path["path_id"]
    lp = path["layer_prefix"]
    cp = path["cell_prefix"]
    tp = path["trigger_prefix"]
    n = len(path["step_keys"])

    lines.append(f"-- {path['name']}")
    lines.append(
        f"insert into public.paths (id, service_scenario_id, name, description, path_type)\n"
        f"values ({sql_str(pid)}, {sql_str(SCENARIO_ID)}, {sql_str(path['name'])}, "
        f"{sql_str(path['description'])}, 'alternative')\n"
        f"on conflict (id) do update set service_scenario_id = excluded.service_scenario_id, "
        f"name = excluded.name, description = excluded.description, path_type = excluded.path_type;"
    )
    lines.append(
        f"delete from public.cell_triggers where source_cell_id in "
        f"(select id from public.cells where path_id = {sql_str(pid)});"
    )
    lines.append(f"delete from public.cells where path_id = {sql_str(pid)};")
    lines.append(f"delete from public.layers where path_id = {sql_str(pid)};")
    lines.append(f"delete from public.path_steps where path_id = {sql_str(pid)};")

    layer_rows = []
    for slot, name in LAYER_NAMES:
        layer_rows.append(
            f"  ({sql_str(layer_id(lp, slot))}, {sql_str(pid)}, {sql_str(name)}, {int(slot)})"
        )
    lines.append(
        "insert into public.layers (id, path_id, name, row_position)\nvalues\n"
        + ",\n".join(layer_rows)
        + "\non conflict (id) do update set name = excluded.name, row_position = excluded.row_position, path_id = excluded.path_id;"
    )

    step_rows = []
    for key, name in zip(path["step_keys"], path["step_names"]):
        step_rows.append(
            f"  ({sql_str(sid(key))}, {sql_str(SCENARIO_ID)}, {sql_str(name)})"
        )
    lines.append(
        "insert into public.steps (id, service_scenario_id, name)\nvalues\n"
        + ",\n".join(step_rows)
        + "\non conflict (id) do update set name = excluded.name, service_scenario_id = excluded.service_scenario_id;"
    )

    ps_rows = []
    for i, key in enumerate(path["step_keys"], start=1):
        ps_rows.append(f"  ({sql_str(pid)}, {sql_str(sid(key))}, {i})")
    lines.append(
        "insert into public.path_steps (path_id, step_id, column_position)\nvalues\n"
        + ",\n".join(ps_rows)
        + "\non conflict (path_id, step_id) do update set column_position = excluded.column_position;"
    )

    cells = []
    for i, key in enumerate(path["step_keys"], start=1):
        cells.append(
            (cell_id(cp, i, "10"), layer_id(lp, "0"), sid(key), "")
        )

    for col in range(1, len(PARTNER_CONTENT) + 1):
        if col > n:
            break
        cells.append(
            (
                cell_id(cp, col, "01"),
                layer_id(lp, "1"),
                sid(path["step_keys"][col - 1]),
                PARTNER_CONTENT[col - 1],
            )
        )

    for col in range(1, len(LEAD_CONTENT) + 1):
        cells.append(
            (
                cell_id(cp, col, "02"),
                layer_id(lp, "2"),
                sid(path["step_keys"][col - 1]),
                LEAD_CONTENT[col - 1],
            )
        )

    for i, content in enumerate(path["regular"], start=1):
        cells.append(
            (cell_id(cp, i, "03"), layer_id(lp, "3"), sid(path["step_keys"][i - 1]), content)
        )

    for i, content in enumerate(path["front_stage_tech"], start=1):
        cells.append(
            (cell_id(cp, i, "06"), layer_id(lp, "4"), sid(path["step_keys"][i - 1]), content)
        )

    for step_num, content in path["back_stage"].items():
        cells.append(
            (
                cell_id(cp, step_num, "07"),
                layer_id(lp, "6"),
                sid(path["step_keys"][step_num - 1]),
                content,
            )
        )

    for step_num, content in path["support"].items():
        cells.append(
            (
                cell_id(cp, step_num, "09"),
                layer_id(lp, "8"),
                sid(path["step_keys"][step_num - 1]),
                content.replace("\\n", "\n"),
            )
        )

    cell_rows = []
    for cid, lid, step, content in cells:
        cell_rows.append(
            f"  ({sql_str(cid)}, {sql_str(pid)}, {sql_str(lid)}, {sql_str(step)}, {sql_str(content)})"
        )
    lines.append(
        "insert into public.cells (id, path_id, layer_id, step_id, content)\nvalues\n"
        + ",\n".join(cell_rows)
        + "\non conflict (id) do update set path_id = excluded.path_id, layer_id = excluded.layer_id, step_id = excluded.step_id, content = excluded.content;"
    )

    triggers = []
    slot = 1
    for col in range(1, len(PARTNER_CONTENT)):
        if col >= n:
            break
        triggers.append(
            (
                trigger_id(tp, f"{slot:03d}"),
                cell_id(cp, col, "01"),
                cell_id(cp, col + 1, "01"),
            )
        )
        slot += 1

    slot = 20
    for col in range(1, len(LEAD_CONTENT)):
        triggers.append(
            (
                trigger_id(tp, f"{slot:03d}"),
                cell_id(cp, col, "02"),
                cell_id(cp, col + 1, "02"),
            )
        )
        slot += 1

    for slot_name, fr, fl, ts, tl in [
        ("033", "04", "02", "04", "01"),
        ("034", "04", "01", "04", "02"),
        ("035", "05", "02", "05", "01"),
        ("036", "05", "01", "05", "02"),
    ]:
        triggers.append(
            (
                trigger_id(tp, slot_name),
                cell_id(cp, int(fr), fl),
                cell_id(cp, int(ts), tl),
            )
        )

    triggers.append(
        (
            trigger_id(tp, "041"),
            cell_id(cp, len(PARTNER_CONTENT), "01"),
            cell_id(cp, 1, "01"),
        )
    )
    triggers.append(
        (
            trigger_id(tp, "042"),
            cell_id(cp, len(LEAD_CONTENT), "02"),
            cell_id(cp, 1, "02"),
        )
    )

    slot = 50
    for i in range(1, n):
        triggers.append(
            (
                trigger_id(tp, f"{slot:03d}"),
                cell_id(cp, i, "03"),
                cell_id(cp, i + 1, "03"),
            )
        )
        slot += 1

    slot = 70
    for i in range(1, n + 1):
        triggers.append(
            (
                trigger_id(tp, f"{slot:03d}"),
                cell_id(cp, i, "03"),
                cell_id(cp, i, "06"),
            )
        )
        slot += 1

    loop_from = path["loop_from"]
    triggers.append(
        (
            trigger_id(tp, "062"),
            cell_id(cp, loop_from, "03"),
            cell_id(cp, 1, "03"),
        )
    )

    trig_rows = []
    for tid, src, tgt in triggers:
        trig_rows.append(f"  ({sql_str(tid)}, {sql_str(src)}, {sql_str(tgt)})")
    lines.append(
        "insert into public.cell_triggers (id, source_cell_id, target_cell_id)\nvalues\n"
        + ",\n".join(trig_rows)
        + "\non conflict (id) do update set source_cell_id = excluded.source_cell_id, target_cell_id = excluded.target_cell_id;"
    )
    lines.append("")
    return lines


def main() -> None:
    check_update = PATHS[:2]
    set_goals_edge = [PATHS[2]]
    updated_goals_edge = [PATHS[3]]

    check_update_out = [
        "-- Goal Setting scenario — Check Goals and Update Goals paths",
        "-- Stable keys map to src/data/goalSettingCheckGoalsPathFallback.ts and goalSettingUpdateGoalsPathFallback.ts",
        "",
    ]
    for path in check_update:
        check_update_out.extend(build_path_sql(path))

    set_edge_out = [
        "-- Goal Setting scenario — Set Goals Edge Case path",
        "-- Stable keys map to src/data/goalSettingSetGoalsEdgeCasePathFallback.ts",
        "",
    ]
    for path in set_goals_edge:
        set_edge_out.extend(build_path_sql(path))

    updated_edge_out = [
        "-- Goal Setting scenario — Update Goals Edge Case path",
        "-- Stable keys map to src/data/goalSettingUpdatedGoalsEdgeCasePathFallback.ts",
        "",
    ]
    for path in updated_goals_edge:
        updated_edge_out.extend(build_path_sql(path))

    root = Path(__file__).resolve().parents[1]
    check_migration = root / "supabase/migrations/20250629170000_goal_setting_check_update_paths.sql"
    check_seed = root / "supabase/seeds/in_session_goal_setting_check_update_paths.sql"
    set_edge_migration = root / "supabase/migrations/20250629180000_goal_setting_set_goals_edge_case.sql"
    set_edge_seed = root / "supabase/seeds/in_session_goal_setting_set_goals_edge_case.sql"
    updated_edge_migration = (
        root / "supabase/migrations/20250629190000_goal_setting_updated_goals_edge_case.sql"
    )
    updated_edge_seed = (
        root / "supabase/seeds/in_session_goal_setting_updated_goals_edge_case.sql"
    )

    check_text = "\n".join(check_update_out)
    set_edge_text = "\n".join(set_edge_out)
    updated_edge_text = "\n".join(updated_edge_out)

    check_migration.write_text(check_text)
    check_seed.write_text(check_text)
    set_edge_migration.write_text(set_edge_text)
    set_edge_seed.write_text(set_edge_text)
    updated_edge_migration.write_text(updated_edge_text)
    updated_edge_seed.write_text(updated_edge_text)

    print(f"Wrote {check_migration}")
    print(f"Wrote {check_seed}")
    print(f"Wrote {set_edge_migration}")
    print(f"Wrote {set_edge_seed}")
    print(f"Wrote {updated_edge_migration}")
    print(f"Wrote {updated_edge_seed}")
    print(json.dumps({"paths": [p["path_id"] for p in PATHS]}))


if __name__ == "__main__":
    main()
