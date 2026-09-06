---
"agentic-service-blueprinting": minor
---

An edge list is `dependencies`, in the wire format too.

**⚠ BREAKING for anyone holding an IR file.** A path's `triggers` array is now
its `dependencies`, at IR schema version `2026.09.09`. An IR authored against
`2026.09.07` no longer validates and is refused by name;
`python3 scripts/migrate_ir.py <ir-file> --workspace blueprint-workspace.json
--write` carries it across, in one hop, and re-anchors sign-off. The field is
renamed in place, so the diff a reviewer reads is the one line whose name
changed rather than everything below it. Nothing authored moves, so the step is
content-preserving and every signed scenario re-anchors rather than de-signing.

The word was settled in three estates and this is the third. The database has
said `cell_dependencies` since `21000103000000`. The app's domain layer took
`dependency` at 1.5.0 — `BlueprintData.dependencies`,
`remapMergedPathDependencies`, and the prose around the arrows. The
interchange format was the estate left over, which meant the retired word
survived in exactly the file a person hand-edits (#159).

What moved with it:

  `references/ir-schema.json`      `path.triggers` → `path.dependencies`,
                                   `$defs/trigger` → `$defs/dependency`,
                                   and `2026.09.09` at the head of the enum
  `scripts/validate_ir.py`         reads and reports the new name; the
                                   cross-path message says "edges"
  `scripts/generate_seed_sql.py`   `seed_trigger_fields` →
                                   `seed_dependency_fields`
  `scripts/generate_fallbacks.py`  follows the field function
  `scripts/adapter_parity.py`      follows the field function
  `skills/slice/scripts/slice_tools.py`  journey adjacency reads the new name
  `scripts/migrate_ir.py`          `to_2026_09_09`, the carry
  `src/lib/backend/schemaVersion.ts`  `2026.09.09` supported and spoken
  `references/adapter-contract.md`  the parity claim names the new function

`seed_dependency_fields` is a rename on a published surface: the adapter
contract's parity claim names the two field functions, so a consumer that calls
it changes one import.

The UUIDv5 namespace label stays the string `"trigger"`. It is derivation
input rather than vocabulary — changing it would give every existing edge a new
id and stop a re-import being idempotent, which is the one property the
derivation exists for. `generate_seed_sql.py` says so where it is used.

`2026.09.08` is skipped, and it is spent rather than free: `21000122000000`
stamps a migrated database with it for the lane-role vocabulary and never
taught the IR enum or `migrate_ir.py` the value. Spending it here would give
one stamp two shapes. Closing that gap means writing the lane-role step that
migration never shipped, and `references/customization.md` § The versioning
rule now records the debt where the rule is stated.

Proven by `scripts/tests/run_tests.sh`: `migrate-triggers-refusal` asserts a
document spelling the array `triggers` is refused with one error naming the
upgrade, and `migrate-triggers` asserts it then carries forward — validating,
landing on the current fixture exactly, and keeping the array in the slot the
old name held. The two older fixtures keep the spelling they were written
with, which is what makes the carry a real round trip.
