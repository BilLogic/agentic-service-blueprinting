---
'agentic-service-blueprinting': patch
---

A deployment's own seed, loaded onto this template's portable core.

`check:seed-load` proves the loop closes on content this repository generated
itself, which the generator and the schema can hardly disagree about. The
question a reconciliation ticket actually asks is whether the portable core is
SUFFICIENT for the content a real deployment holds, and only a deployment's own
seed answers it.

`npm run check:deployment-seed-load` stands up the same fresh stack — shim,
platform default, core, recipe — and loads a deployment's seed in place of this
one's, in the order the deployment itself states under `[db.seed]` in its
`supabase/config.toml`. Then the same anon reads: every table the seed writes
comes back non-empty to the key a browser holds, and the blueprint grid and the
service hierarchy return rows.

It applies the seed with `ON_ERROR_STOP` off on purpose. Here the failing
statements are the deliverable, not a bug to stop at, so every one is collected
and grouped by reason with counts and examples — and knock-on failures (a
foreign key whose row an earlier failure never inserted, the core's own
row-validation raises, an aborted transaction block) are reported separately, so
the root cause is not buried under the forty rows it caused.

Point it at a deployment with `--seed <path>` or `DEPLOYMENT_SEED=<path>`; with
neither it finds a checkout beside this one that ships a `supabase/seed.sql` and
declares a different package name, and skips with a message when there is none
or more than one. CI checks out one repository, so it would skip on every run —
it is documented as a local guard instead, and its parsing and skip logic are
held by `scripts/tests/deployment-seed-load.test.mjs`, which does run in CI.

`SETUP.md` now carries the path it guards as a five-step checklist — clone, run
with no database, set the two variables, replay, your own content — each step
ending in something to check rather than something to look at, because this app
renders bundled content whenever it cannot reach a database and every step after
a silent failure still looks like it worked.
