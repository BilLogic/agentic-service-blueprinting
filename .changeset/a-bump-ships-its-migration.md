---
'agentic-service-blueprinting': minor
---

A schema_version bump now ships the migration that carries existing
`blueprint.json` files across it, in the same change.

The IR has stated its own `schema_version` since the field existed, and the
enum in `references/ir-schema.json` has listed the versions this template
knows — but "knows" was doing two jobs. `2026.07.16` is in that list and an IR
carrying it validated cleanly, then failed on the first renamed field, because
the lane-vocabulary bump moved `lifecycle` → `service`, `layers` → `lanes`,
`layer` → `lane` and `description` → `summary`. Being in the list means
migratable, not current.

`validate_ir.py` now refuses an IR that is not at the version the template
speaks, with one error naming the command that fixes it, and stops before the
body — otherwise every renamed field is reported as an unknown key and the one
actionable line is buried. An unknown version says no migration carries it and
where the steps that exist live.

`scripts/migrate_ir.py` is that command. Steps chain, so a file two bumps
behind is carried through both; the 2026.07.16 → 2026.08.25 step walks the
tree by shape rather than rewriting text, so a link's `description` — prose
about the link, still called `description` — is left alone.

Sign-off is the reason this exists. It binds to a SHA-256 of a scenario
subtree, and the renames land inside that subtree, so every recorded hash
would stop matching and every signed scenario would silently de-sign.
`--workspace blueprint-workspace.json` re-anchors each signed scenario's
`content_hash` onto its migrated subtree and keeps `signed_at`/`signed_by` —
sound because a step renames field names only, and a step that ever edits
authored content declares itself non-content-preserving and gets refused. A
hash matching neither side was already stale before the migration ran; it is
reported and left, because that is a re-review, not a rename.

The rule, in `references/customization.md` and next to the enum it governs:
every future bump ships its migration in the same change. Consumers hold
signed-off data that cannot be re-derived, so a bump with no step is a bump
with no answer.
