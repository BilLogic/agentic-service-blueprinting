---
"agentic-service-blueprinting": minor
---

A lane role is refused where the author can still fix it, not by a constraint
mid-import.

Two documents in this repository said opposite things, and both said them
deliberately. `references/ir-schema.json` and `scripts/validate_ir.py` took any
lane role matching `^[a-z0-9][a-z0-9_]*$` — the schema is an authoring contract
and did not want to be a taxonomy. `references/lane-roles.md` and the
`lanes_lane_role_check` constraint closed the set at eight. So a document
validated and was then refused on import, and the refusal arrived as a Postgres
constraint violation rather than as anything the authoring tools had said
(#204):

    ERROR: new row for relation "lanes" violates check constraint
    "lanes_lane_role_check" … compliance_review

That error at least names the value. Meeting it after validation has passed is
the wrong moment.

**The schema closes.** Of the three answers — close the schema, open the
constraint, or document the gap and live with it — closing is the one the rest
of this repository already assumes. The constraint, the `lanes.lane_role`
column comment, `docs/erd.mmd` and `references/lane-roles.md` all state the set
as closed; `lane_role` is read as exhaustive by code that switches on it, so
opening the column would have meant auditing every such reader for a value none
had ever seen. Closing costs one bump and a step.
`references/ir-schema.json` now carries the eight as an `enum` on
`$defs/lane.properties.role`, `null` included, and `scripts/validate_ir.py`
errors on a ninth with the offending value, the lane carrying it, all eight
legal values and the fact that `null` is the answer for a lane none of them
names.

**⚠ BREAKING for anyone holding an IR file with a role outside the eight.** IR
schema version `2026.09.10`, and `python3 scripts/migrate_ir.py <ir-file>
--workspace blueprint-workspace.json --write` carries a document across it.
`to_2026_09_10` nulls a role outside the set — the generic swimlane it already
drew as, no style of its own and no divider anchored on it, which is also the
answer `21000122000000` gave the rows it found. The lane's `display_name` is
untouched, and that is what makes this a reclassification rather than a
deletion: the meaning of a compliance lane lives in the name a reader sees, and
the role only ever said what the renderer must do about the row. A role is
authored content inside a scenario's subtree, so the step is **not
content-preserving** — the third, after the edge turnaround at `2026.09.01` and
the rename at `2026.09.08`. Watched per scenario as those are: a scenario
holding a nulled role keeps its recorded hash and reads as stale until someone
re-signs it, and a document carrying none — which is every document a target
ever accepted — hashes identically and re-anchors.

No migration stamps `2026.09.10`, and none needs to: nothing in the database
changed, and a target sitting at `2026.09.08` is still one this checkout
speaks. `2026.09.09` set that precedent — a wire-format bump with no DDL behind
it — and this is the second.

**The eight now live in four places, and something holds them together.** The
authority is `lanes_lane_role_check` in `supabase/generated/portable-core.schema.sql`.
JSON Schema cannot import a list and neither can a stdlib-only Python script,
so closing the schema made two more copies of the roster — and a duplicated
list with nothing holding it is exactly how this drift started.
`scripts/tests/lane-role-roster.test.mjs` compares the enum in
`references/ir-schema.json`, `CANONICAL_ROLES` in `scripts/validate_ir.py` and
`CANONICAL_LANE_ROLES` in `src/lib/laneRoles.ts` to the constraint, set for
set, off the committed dump — so it runs on every pull request with no
database, beside the ERD sweep that already holds `docs/erd.mmd` the same way.

`to_2026_09_08` parked this question on purpose and is unchanged; its docstring
now records where the answer landed instead of pointing at an open one.

What moved with it:

  `references/ir-schema.json`         the role `enum`; `2026.09.10` at the
                                      head of the version enum
  `scripts/validate_ir.py`            a ninth role is an error, not a
                                      silent pass; the closed set is
                                      documented where the file states what
                                      it checks
  `scripts/migrate_ir.py`             `to_2026_09_10`, the carry
  `src/lib/backend/schemaVersion.ts`  `2026.09.10` supported and spoken
  `references/lane-roles.md`          says authoring refuses a ninth, and
                                      § Adding a role lists the multi-file
                                      act that adds one
  `references/customization.md`       § Lane roles no longer advises minting
                                      an org-defined role
  `skills/map/…/translate-playbook.md`  a foreign lane the eight do not name
                                      maps to `null`, keeping its own label
  `skills/map/…/crosswalk-schema.json`  the `custom_role` disposition is
                                      `generic_lane`
  `skills/map/…/elicitation-protocol.md`  non-spine actors get `null`

Proven by `scripts/tests/run_tests.sh`: `validator-bad4` asserts the refusal,
`validator-bad4-message` asserts the message says everything the author needs
to fix it without opening another document, and § 8c carries a `2026.09.07`
document holding five retired spellings AND one role from outside the set —
the first five renamed by `to_2026_09_08`, the sixth nulled by
`to_2026_09_10`, its display name intact.
