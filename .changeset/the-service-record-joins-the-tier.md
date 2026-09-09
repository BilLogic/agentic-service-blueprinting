---
'agentic-service-blueprinting': patch
---

The service record joins the tier every other table already answers to

`public.services` was the one table on the write surface a plain signed-in
member could UPDATE. Every other table there admits only a service account, and
the operations guide says a member outside the editing tier may read and not
write — of this table that was never true. Anyone who could open a deployed
board could rewrite a service summary.

It was an oversight with two authors, neither of them wrong on its own.
20260818002000 introduced the service-account tier and hung a RESTRICTIVE
`*_service_only` policy on the tables that had a write policy to restrict.
`services` was read-only then — the intermediate representation builds a
service, nothing edited one — so it had nothing to restrict and got nothing.
21000128000000 then gave it the write policy the Service panel needed,
`using (true)` to `authenticated`, and did not add the restrictive counterpart
the earlier migration would have. Nothing anywhere argues that the service
record should be the one row an ordinary member may rewrite.

21000212000000 hangs `services_update_service_only`: RESTRICTIVE, UPDATE,
`authenticated`, `public.is_service_account()` as both its USING and its WITH
CHECK — the shape the tier built for its thirteen tables. Restrictive is the
whole of the fix, because a permissive policy naming the tier would OR with
`using (true)` and change nothing at all. UPDATE only, and deliberately:
`services` carries no INSERT or DELETE policy for `authenticated`, so both
verbs already match zero rows, and a restrictive policy over a write nobody is
admitted to make asserts nothing while reading as though it did. A single-tier
deployment is untouched — `is_service_account()` is the CORE seam whose default
body is `select true`, so where the optional tier recipe was never applied the
new policy admits every signed-in session, exactly as that deployment chose.

The proof is the post-condition, and it is asked as the role. A migration
applies as an owner, an owner bypasses row level security, and a policy that
refuses does not raise — it matches zero rows and returns success — so a proof
that read the catalogue, or wrote as the owner, would be satisfied by the
database this migration exists to change. It becomes `authenticated` instead,
holds a viewer claim and then a service claim, attempts the write the Service
panel makes, and ends each attempt in a sentinel exception so no row, claim or
role survives it. What it asserts is agreement with the seam: a service claim
writes, a session without one writes only where the seam still says
`select true`. Never a count of the policies that happen to exist. Where it
cannot get an answer — a session that cannot become `authenticated`, or an
`authenticated` without the platform's SELECT on the table — it names what was
missing and asks nothing, rather than reporting the platform's absence as this
policy refusing.

The check that found this is the check that proves it. The write surface has
attempted every write twice since #369, once as an author and once as a
signed-in reader, and `services` was the single table whose reader half was
declared off — with its reason, in `ANY_SIGNED_IN_USER_MAY_WRITE`, printed on
every green run. Deleting that entry re-arms it: twenty-three reader probes
instead of twenty-two, and `viewer update services` reporting `zero`. Drop the
new policy and the same probe reports `wrote`, which is what makes the green
mean anything.
