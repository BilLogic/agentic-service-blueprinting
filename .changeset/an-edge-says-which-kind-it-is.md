---
'agentic-service-blueprinting': minor
---

A dependency edge in the IR now says which kind it is, so a `needs` edge
survives an export.

The database has checked `cell_dependencies.kind in ('trigger','needs')` since
`20260729120000`, the app draws an arrow for one and a panel row for the other,
and the authoring RPC refuses any third value. The IR was the half that could
not say it: `$defs.trigger` carried `source` and `target` under
`additionalProperties: false`, so a needs edge could not be written down at
all. Exporting a blueprint that had one dropped it silently, and a re-import
could not put it back. That is data loss, not a documentation gap.

`schema_version` 2026.08.26 gives the edge an optional `kind`. Optional, and
absent means `trigger` — the column default, and what every edge authored
before this bump already meant — so every existing file is already a valid
2026.08.26 file.

The kind is part of the edge's **identity**, not just its payload. The
database's uniqueness key is `(source_cell_id, target_cell_id, kind)`: one pair
may carry both an arrow and a needs edge, and those are two rows. So the
validator's duplicate check reads the kind, and the UUIDv5 qualified key ends
in `#<kind>` — without that, the second edge of a pair would be minted with the
first one's id and quietly replace it. Every dependency edge's id therefore
changes across this bump, which is invisible in practice: an import is a
scenario-scoped delete-and-reinsert, and nothing outside `cell_dependencies`
references an edge id.

**The migration, and what it does to sign-off.** The rule holds — the bump
ships its step in the same change — and the step is a version stamp and nothing
else. Sign-off binds to a SHA-256 of a scenario subtree, and a dependency edge
lives inside one, so writing `"kind": "trigger"` into every existing edge would
have re-hashed every signed scenario in every workspace. That would have been
*content-preserving* in the sense the machinery means — no authored value would
have moved, and `--workspace` would have re-anchored each hash — but it would
have put every signed blueprint one forgotten flag away from de-signing itself,
in exchange for saying at length what absence already says. So
`2026.08.25 → 2026.08.26` is `content_preserving = True` and touches nothing:
every scenario hashes to the byte-identical digest afterwards, and `--workspace`
reports each signed scenario as already anchored. The suite checks that, rather
than the changelog asserting it.

Both v1 adapters carry the kind, because both project the same field function —
the SQL seed emits it as a column, the no-DB module serves it on the edge, and
`npm run check:parity` compares them. The test suite covers a `needs` edge
round-tripping through both, a pair carrying both kinds getting two distinct
ids, an unknown kind refused by name, the pre-bump fixture migrating with its
hashes intact, and `2026.08.25` refused as superseded with the upgrade command
in the message.

The database gets a migration too, and it carries no DDL: the columns were
already right. `schema_version` is one contract version across both halves, so
the number moves on both. A target left at `2026.08.25` stays supported and
stays correct.
