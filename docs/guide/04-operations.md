---
summary: Running a deployed blueprint — which account may do what, how a change reaches the board, what is published to anonymous readers, and what to check after a deploy.
---

# Operations

**For** whoever runs a deployed blueprint.
**Answers** who may do what, and what happens when it changes?

## 1. Who may do what

Capability follows the account a surface uses, not the surface itself.

| Account | Can |
| --- | --- |
| no account, published blueprint | read what is published |
| a signed-in member outside the editing tier | read, and chat to the agent read-only |
| a signed-in member in the editing tier | read, and author through the app or its agent |
| the service account used by an import | write a whole blueprint transactionally |

Whether those middle two rows are one row or two is the deployment's choice.
The optional service-account tier is what splits them, and applying every
shipped migration applies it; a deployment that deletes that migration gives
every signed-in member the editing tier. The app asks the database which of
those it is talking to, so neither posture needs a build of its own.

The keys behind those rows are handled by rule, not convention: the
publishable key may be written to `.env` only after the skill verifies the
file is git-ignored, and the service-role key is never written to disk and
never pasted into a session
([adapter-contract.md §"Secrets"](../../references/adapter-contract.md)).

The Slack bot, holding only the published key, can therefore answer
questions and link to cells, and cannot change anything, without anyone
having to remember that rule.

## 2. The schema

The schema migrations live in
[`supabase/migrations/`](../../supabase/migrations/). They carry `-- @recipe` /
`-- @core` marks, and
[`supabase/generated/`](../../supabase/generated/) holds the two halves those
marks emit: the portable Postgres core, which CI applies to a stock
`postgres:17`, and the Supabase recipe applied on top of it. Both are
generated — edit a migration, then run `npm run generate:portable-core`. The
attribute-level ERD is at [`docs/erd.mmd`](../erd.mmd).

Import order is enforced by the `cells_validate_path_match` trigger:
`paths → steps → path_steps → lanes → cells → cell_dependencies`.

## 3. Changing a live blueprint

Every change goes through one guarded path. Imports are idempotent: the
same content hash re-imported is a no-op, which is what makes re-running an
import safe after a failed deploy.

Slices survive re-import because they refer to cells by key. Findings carry their own
service — `open`, `resolved`, `dismissed` — so triage is not lost when the
blueprint underneath them moves.

## 4. Deploying

Two files tell the host what to do, and nothing in a build, a test or a page
load reads either of them.

`netlify.toml` carries the build command, the `dist/` publish directory, the
node version, and the redirect table: a 404 for `/assets/*`, then the SPA
fallback for everything else. The 404 is first on purpose — a host takes the
first rule that matches — so a hashed chunk a deploy no longer ships says it is
missing instead of being answered with the app shell.

`public/_headers` carries the CSP for every path, and the one-year immutable
cache for `/assets/*` alone. The file's own comments say which origins the CSP
has to name and why nothing unhashed may be cached that long.

Both the order and the cache are held by `npm run check:hosting` — what its
failure means is in [engineering/checks.md](../engineering/checks.md).

Any static host works; the same two rules have an equivalent everywhere.
Live-database mode needs `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` **at
build time**. Blueprint-specific gotchas are in
[`skills/map/references/deploy-notes.md`](../../skills/map/references/deploy-notes.md).
