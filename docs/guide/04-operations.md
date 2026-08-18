# Operations

**For** whoever runs a deployed blueprint.
**Answers** who may do what, and what happens when it changes?

## 1. Who may do what

Capability follows the account a surface uses, not the surface itself.

| Account | Can |
| --- | --- |
| no account, published blueprint | read what is published |
| a signed-in member | read, and author through the app or its agent |
| the service account used by an import | write a whole blueprint transactionally |

The keys behind those rows are handled by rule, not convention: the
publishable key may be written to `.env` only after the skill verifies the
file is git-ignored, and the service-role key is never written to disk and
never pasted into a session
([adapter-contract.md §"Secrets"](../../references/adapter-contract.md)).

A chat bot holding only the published key can therefore answer questions
and link to cells, and cannot change anything, without anyone having to
remember that rule.

## 2. The schema

The schema migrations live in
[`supabase/migrations/`](../../supabase/migrations/), with a DDL snapshot at
[`supabase/schema.reference.sql`](../../supabase/schema.reference.sql) and an
attribute-level ERD at [`docs/erd.mmd`](../erd.mmd).

Import order is enforced by the `cells_validate_path_match` trigger:
`paths → steps → path_steps → layers → cells → cell_triggers`.

## 3. Changing a live blueprint

Every change goes through one guarded path. Imports are idempotent: the
same content hash re-imported is a no-op, which is what makes re-running an
import safe after a failed deploy.

Slices survive re-import because they refer to cells by key. Findings carry their own
lifecycle — `open`, `resolved`, `dismissed` — so triage is not lost when the
blueprint underneath them moves.

## 4. Deploying

`netlify.toml` carries the build command, the `dist/` publish directory, the
node version and the SPA redirect. Any static host works. Live-database
mode needs `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` **at build
time**. Blueprint-specific gotchas are in
[`skills/map/references/deploy-notes.md`](../../skills/map/references/deploy-notes.md).
