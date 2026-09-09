---
'agentic-service-blueprinting': patch
---

The portable shim can hold a claim, so a guarded write can be rehearsed

`supabase/portable/supabase-shim.sql` stood `auth.jwt()` in as `select
'{}'::jsonb` — an empty object, unconditionally, whatever the session had set.
`public.is_service_account()` reads that object, so behind the shim no session
could be a service account, and every write RPC that asserts the guard in its
own body refused. Not a simplification: a different behaviour, in the one file
whose whole job is to answer the way the thing it stands in for answers.

What it cost is measurable rather than theoretical. Two rehearsals of guarded
writes had to redefine `auth.jwt()` inside their own rolled-back transactions
to get any write to run at all, which proves a copy of the function rather than
the function. And `21000209000000`'s embedded proof — a fixture that authors an
edge and re-runs the call the agent tool sends — asked whether the environment
could hold a service claim, found it could not, and skipped with a notice.
That is the right thing for a proof to do when it cannot run, and it meant the
portable replay had been proving less than it looked like it proved.

All three of GoTrue's request-scoped helpers now read `request.jwt.claims`, the
GUC Supabase resolves a request's JWT into: `auth.jwt()` returns the claims or
an empty object, and `auth.uid()` and `auth.role()` read `sub` and `role` out
of it rather than answering null by construction. An unset GUC still answers
"nobody", so a replay that sets nothing is unchanged; a
`set_config('request.jwt.claims', …, true)` inside a rehearsal or a proof block
now does what its author expects. `nullif` before the cast because a GUC that
was set and then cleared reads back as the empty string, and `''::jsonb` is a
syntax error rather than an absent claim — which is exactly the shape the proof
block's own cleanup leaves behind.

`is_service_account()` is untouched. The guard was never the defect; the stub
under it was. The shim is still not a security boundary — a caller who can
`set_config` can claim anything — and it is still not something an adopter
installs. It is a CI harness that now answers the question Supabase answers.

The replay says what changed. Before and after, all 48 migrations apply and
none fails; the two halves and the replay agree on the same inventory. The only
difference in the whole log is one line that is no longer printed: the
omitted-argument proof no longer skips. It runs, behind the shim, and passes.
