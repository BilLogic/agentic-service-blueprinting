---
'agentic-service-blueprinting': patch
---

The write surface proves the write, instead of reading the catalogue

The policy half of the surface asked `pg_policies` whether a policy existed on
the table, for that command, naming `authenticated` — and a policy that exists
and admits nobody satisfies an existence test. Every one of these fourteen
tables carries one. The service-account tier hangs a RESTRICTIVE
`<table>_update_service_only` on thirteen of them and the rest carry a permissive
policy whose whole predicate is `is_service_account()`, so the question the
surface asked could not tell "an author may write this" from "only a service
account may". That is the one pair whose difference is silent: a session outside
the editing tier meeting a service-only policy matches zero rows and gets a 200
back, and `requireRowsWritten` reports the save as a row somebody else deleted.

So the question is asked as the role. `set local role authenticated`, a
representative claim, attempt the write, roll it back. A policy that refuses
cannot satisfy that, and it subsumes the grant half the issue asked about —
`update t set c = c` is refused on a column the author does not hold, so
`has_column_privilege` and `exists(select 1 from pg_policies …)` collapse into
one question per column and verb, answered by the write itself. 58 grants and 23
policy existence tests become 58 writes an author makes and 22 the same
statement, run as a signed-in reader, must not.

**The second half is what makes the first mean anything.** `authenticated` is one
Postgres role and two audiences — the app says so itself, gating its editors on
`isServiceAccount` and calling the restrictive policies "the wall" — so the probe
runs as both. A check that only ever proved a write succeeded would pass just as
well on a database that let every reader write, which is not a hypothetical: it
found one. `services` is the single surface table the tier never reached. It had
no write policy at all when 20260818002000 swept the others, and when
21000128000000 gave it one it gave it `using (true)`. Any signed-in member can
rewrite a service summary today, which is precisely what the operations guide
says a member outside the editing tier may not do. It is named in
`ANY_SIGNED_IN_USER_MAY_WRITE` with that reason, printed on every green run, and
its author probe still runs — the exception is a smaller claim, not an exemption.
The migration that closes it is owed and is not in this change.

Attempting a write needs a row to write and a role that can evaluate a policy,
and neither was true before. `PROBE_FIXTURES` stands one row up in the four
surface tables the sample seed leaves empty, guarded by `where not exists` so a
seed that starts filling one retires its fixture; a surface table with neither is
a failing test rather than a probe that reads an empty table's zero rows as a
refusal. And the shim was lying by omission: Supabase grants `usage on schema
auth` to `anon` and `authenticated`, and without it every policy predicate
calling `is_service_account()` — which is not `security definer` — answers
`permission denied for schema auth` to the very role it is written about. Nothing
noticed while the checks read the catalogue. The first question asked as the role
found it in one run.

The `cmd = 'ALL'` gap #368 left behind — `pg_policies.cmd` reads `ALL` for a
`for all` policy, so an exact-match existence test reports one as missing — is
gone rather than fixed. Nothing reads `cmd` any more, and a `for all` policy
either admits the write or does not.
