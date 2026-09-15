---
'agentic-service-blueprinting': patch
---

A database that was never named is unverified; one that was named and not reached is a finding

Two checks need a live database and each answered "there is no database" in its
own words and with its own exit code. `scripts/check-target-schema.mjs` printed
`no target configured` and set **exit 2** by hand, with a comment saying the
verdict module renders four outcomes and none of them is this one.
`scripts/check-retired-identifiers.mjs` went red with `could not sweep a
database` whether or not anybody had named one — correctly in CI, where the
sweep follows the migration replay and an absent catalogue is a real failure,
and wrongly on a laptop with no Postgres, where nothing was ever asked.

**One rule, stated once per file and applied to both.** A database that was
never named is **unverified**: the check says what it could not look at through
the `unverified` register `scripts/sweep.mjs` owns, and the run stays clean. A
database that **was** named and could not be reached is a **finding**: red,
with the connection error quoted. A reachable database is untouched — output
byte-identical, both checks, both modes.

**Naming one is not only `--database`.** libpq reads a connection out of the
environment a piece at a time, and the command at the top of the identifiers
check's own usage block takes no arguments at all. So `PGHOST`, `PGUSER`,
`PGPORT` and `PGSERVICE` each count as naming a server, alongside `--database`
and `PGDATABASE`: the sweep is attempted and a failure is the finding it always
was. Only a run with none of them is the one nobody asked anything.

**The exit codes that changed**, and nothing else did:

| case | before | after |
| --- | --- | --- |
| `check-target-schema.mjs`, no URL and key | 2, printed by hand on stderr | **0**, `::warning::unverified — the target database. …` |
| `check-target-schema.mjs`, named and unreachable | 1 | 1 (unchanged) |
| `check-target-schema.mjs`, reachable | 0 / 1 by answer | unchanged, byte for byte |
| `check-retired-identifiers.mjs`, nothing named — no `--database`, no `PGDATABASE`, no `PGHOST`/`PGUSER`/`PGPORT`/`PGSERVICE` | 1, `could not sweep a database` | **0**, `::warning::unverified — a retired word swept across the database catalogue. …` |
| `check-retired-identifiers.mjs`, `PGHOST`/`PGUSER` only, server unreachable | 1 | 1 (unchanged) |
| `check-retired-identifiers.mjs`, named and unreachable | 1 | 1 |
| `check-retired-identifiers.mjs`, `--database` with no value | 1, as a connection failure | 1, as `--database was given no value` |
| `check-retired-identifiers.mjs`, reachable (sweep and `--self-test`) | 0 / 1 by answer | unchanged, byte for byte |

**CI keeps its red.** `ci.yml` runs both identifier lines with `--database
migration_replay`, so the only case CI can reach is the named one. The rule is
applied once, at the top of `judge()`, which is why `--self-test` obeys it too —
and names what *it* measures, the planted object, rather than the sweep it did
not run.

**`scripts/check-target-schema.mjs` is a shared script.** A deployment holds it
byte-identical (it is on `SHARED_SCRIPTS` in
`scripts/tests/a-shared-script-cites-no-local-path.test.mjs`), so the new branch
imports nothing deployment-specific and cites no local path: it returns a
judgement and lets `scripts/verdict.mjs` — also shared — render and set the
code. A deployment that pins the new version gets the warning line every other
check already gives instead of an exit 2 its own runner had to know about.

The messages keep their text where the case is unchanged. One sentence moved
rather than being copied: `this check compares the CATALOGUE, not the migration
files, and has nothing to say without one` is now a constant both the finding
and the register read, because it is the same fact either way. The finding's
remedy line is the one deliberate rewording — it used to end `Set
PGHOST/PGUSER/PGDATABASE, or pass --database <name>` for a reader who might have
named nothing, and now says a database **was** named and did not answer, which
is the only way that branch is reachable.

`docs/engineering/checks.md` already said all three live guards write to the
unverified register when they look at nothing. That was true of two of them.
Its `check:target` row now says what the third does.

`scripts/tests/a-database-nobody-named-is-unverified.test.mjs` proves the cases
for each check with no live database: a `psql` on PATH that is a shell script, a
port nothing serves, and — for the reachable target — a listener the test stands
up itself. It runs each check as a **command**, because what changed is the exit
code and a judgement object does not carry one.
