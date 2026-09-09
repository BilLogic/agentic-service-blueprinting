---
'agentic-service-blueprinting': patch
---

A restriction needs something to restrict

Twenty RESTRICTIVE policies, over eleven tables, stood for a verb that no
permissive policy opens. Under row level security a restrictive policy narrows
and never admits, so a verb in that position matches zero rows for everyone the
restriction names — a lock hung on a door that was never cut into the wall.
`21000214000000` removes them.

**Nothing about who may write anything changes.** Every one of the twenty verbs
was refused before this release and is refused after it, and refused for the
same reason: `authenticated` holds no grant for it at all, so an attempt is
turned away with a permission error before row level security is ever
consulted. There was no hole and this release closes none. Read as a patch it
would say the opposite of what is true, so the migration says so in its own
header.

The verbs are `insert` and `delete` on `cells`, `lanes`, `paths`, `phases`,
`scenarios` and `steps`; all three write verbs on `cell_dependencies` and
`path_steps`; and `delete` on `audit_findings` and `business_models`. Every one
of them is reached only through the `SECURITY DEFINER` authoring RPCs —
`upsert_cell`, `delete_cell`, `add_lane`, `create_path`, `set_path_steps` and
their siblings — which run as the function owner and never meet a policy at all.
That was checked rather than assumed, in both directions: the verbs the app
writes directly come from the scan of the source that the write-surface check
already runs, and the definer flag comes from the catalogue of a replayed
database.

One loop is the whole cause. `20260818002000`, the optional service-account
tier, walks thirteen tables and creates all three write policies on each,
unconditionally. Its own comment says what it assumed — "they AND with the
permissive policies" — and for nineteen of the thirty-nine there was a
permissive policy to AND with. It was written table-wide over a surface that is
verb-wide.

This is the other half of the convention `21000213000000` recorded. That one
established that a write policy is a pair, and the reading that makes the pair
worth having: a permissive `_auth` policy with no restrictive `_service_only`
beside it is a hole. Twenty lone restrictions blunted the same reading from the
other side, because a rule of the form "these come in pairs" is worth what its
exceptions cost. Now the two halves appear together or not at all, and an empty
policy list for a verb means one thing: the direct write path is closed, and
the RPC is the way in. `docs/connectors/supabase/database.md` § Row Level
Security carries both halves — write both policies when a table joins the write
surface, and write neither when it does not.

The migration's proof asks three questions rather than counting anything. It
asserts the invariant this file makes true: no restrictive policy in `public`
stands for a command that no permissive policy opens to a role it names. It
asserts, per verb it removed a restriction from, that no permissive policy
stands for that verb — which is what makes the removal a no-op rather than a
widening, and which raises and names the table on a deployment that has opened
one of them directly. And it becomes `authenticated` holding a service claim
and attempts each of the twenty, requiring the write to be refused. Every
attempt is a bare `default values` or a `where false`, so no deployment's rows
are read or written even where a grant exists.
