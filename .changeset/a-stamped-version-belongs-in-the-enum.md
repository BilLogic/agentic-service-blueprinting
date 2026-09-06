---
"agentic-service-blueprinting": patch
---

A schema version a migration stamps belongs in the list of versions this
template speaks.

`21000122000000` stamps a migrated database with `2026.09.08`, and so does the
generated portable core. The value was never added to the enum in
`references/ir-schema.json`, to `scripts/migrate_ir.py`, or to
`src/lib/backend/schemaVersion.ts`. So a target that had run every migration in
order read as INCOMPATIBLE to `scripts/check-target-schema.mjs` — a check
written to catch a target that is BEHIND, failing the one that was exactly
right, for two releases (#197).

**The step is not an identity bump, and reading the migration is what settles
it.** `21000122000000` closed `lanes.lane_role` to eight values with a CHECK
constraint, renaming the roles it retired on the way in. The IR's
`lanes[].role` IS that column: the schema field says `lanes.lane_role` in as
many words, and `seed_lane_fields` writes the authored string straight into it
with nothing in between that normalises anything. A document authored at
`2026.09.07` may therefore carry a role by its retired spelling, and that
document now meets a database that refuses the word. `to_2026_09_08` renames
it — five pairs, transcribed from `scripts/retired-vocabulary.mjs`, which is
the one list this repository keeps of what a retired word became:

  `frontstage_tech`   →  `frontstage_touchpoints`
  `backstage_tech`    →  `backstage_touchpoints`
  `support_systems`   →  `backstage_touchpoints`
  `visual`            →  `storyboard`
  `step_visual`       →  `storyboard`

A lane's role is authored content inside a scenario's subtree, so the step
declares itself **not content-preserving** — the second step ever to do so,
after the edge turnaround at `2026.09.01`. That declaration is watched per
scenario: a file carrying one of the five keeps its recorded sign-off hash and
reads as stale until someone re-signs it, and a file carrying none of them
hashes identically on both sides and re-anchors as usual. Most files are the
second kind.

**What the step deliberately does not do.** The migration also sets to null
every role outside the closed eight, an adopter's own word included; it had to,
because `add constraint` validates every existing row as it is added. A
document being carried forward is under no such duress, and at the IR level a
custom role is still legal — the schema admits any `^[a-z0-9][a-z0-9_]*$`, and
`scripts/validate_ir.py` passes a role far from every canonical one in silence,
on purpose. Nulling one here would delete authored content the validator had
just blessed, and would settle by deletion a question nobody has asked: whether
the IR closes the set the way the database does. A file that keeps a custom
role is refused by the target's CHECK, loudly and with the value named, which
is a better answer than a classification that quietly disappears.

**Added, never moved.** The stamp sits inside an applied migration and inside
the generated portable core, and an applied record keeps the spelling it was
written with. `2026.09.09` stays where it is, so the chain now runs `.07` →
`.08` → `.09` — ordered, continuous, and still a chain in which each step knows
only its own predecessor.

What moved with it:

  `references/ir-schema.json`         `2026.09.08` in the enum, and the
                                      description states why it arrived late
  `scripts/migrate_ir.py`             `RETIRED_LANE_ROLES` and
                                      `to_2026_09_08`; `to_2026_09_09` steps
                                      from `.08` and records what closed
                                      the hole it left
  `src/lib/backend/schemaVersion.ts`  the version, with the reason
  `references/customization.md`       § The versioning rule now records how
                                      the debt was paid, not only that it was
                                      owed

Proven by `scripts/tests/run_tests.sh` § 8c (`migrate-lane-roles`): a
`2026.09.07` document carrying one lane per retired spelling carries forward,
validates, lands every role inside the closed set, and leaves the custom role
beside them untouched. `scripts/tests/target-schema.test.mjs` adds the
regression the issue was found by — a target reporting `2026.09.08` is
compatible. `scripts/tests/run_tests.sh` § 8 asserts both hops of the chain
rather than the one that used to skip.
