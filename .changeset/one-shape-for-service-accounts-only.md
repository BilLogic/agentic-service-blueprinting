---
'agentic-service-blueprinting': patch
---

One shape for "service accounts only", and it is written down

Fourteen tables are on the write surface — the ones the panels reach directly,
under the caller's own privileges, rather than through the definer RPCs. Twelve
of them said "only the editing tier may write this" as a pair of policies: a
permissive `<table>_<verb>_auth` with `using (true)`, and a RESTRICTIVE
`<table>_<verb>_service_only` calling `public.is_service_account()`.
`stakeholders` and `cell_touchpoints` said it as a single permissive policy
whose whole predicate was that same call.

**Nothing about who may write anything changes.** Both spellings admit exactly a
service account and refuse exactly everyone else; there was no hole and this
release closes none. The posture before and the posture after are the same
posture, on every database this replays against, and the migration says so in
its own header so it cannot be read as a patch.

What changes is that one rule stops being written two ways. 20260818002000, the
optional service-account tier, hung the restrictive half on the thirteen tables
that already had a permissive write policy for it to narrow. The two above
joined the surface afterwards and each was written from scratch, so each reached
for the shortest thing that was correct. Both authors were right about the rule;
neither had anywhere to read the shape, because nothing stated it.

21000213000000 gives both tables the pair, for insert, update and delete. The
pair wins over collapsing the other twelve for three reasons. It is what a
reader meets twelve times before meeting the exception. It keeps two decisions
apart that have two different owners — the permissive half is the base
template's ("this table is edited from the browser rather than through an RPC"),
the restrictive half is the optional recipe's ("and only by the editing tier"),
and the single-policy form fuses them, staying correct only because the core
seam's default body is `select true`, which nothing at the call site shows. And
it makes a *missing* restriction legible: a surface table with an `_auth` policy
and no `_service_only` beside it is now unambiguously a gap, which is what
`services` turned out to be one release ago.

The convention is now recorded where row-level security is documented —
`docs/connectors/supabase/database.md` § Row Level Security — because a
convention nobody writes down is how the second spelling arrived in the first
place.

The migration's proof is the post-condition, asked as the role: it becomes
`authenticated` twice, once holding a service claim and once not, attempts the
writes the panels make, and asserts that the answer is the seam's both ways. It
counts nothing in `pg_policies` — a census of the database it happened to meet
is not a post-condition, and reading the catalogue is exactly what could not
tell these two spellings apart. Where the optional tier recipe was never applied
the seam is still `select true`, so the policies admit every signed-in session
and the proof says so in a notice rather than failing. Independently,
`npm run check:seed-load` attempts every one of these writes against a seeded
database as an author who must succeed and as a viewer who must change nothing:
58 writes an author made and 23 a signed-in reader was refused, unchanged across
the rewrite.
