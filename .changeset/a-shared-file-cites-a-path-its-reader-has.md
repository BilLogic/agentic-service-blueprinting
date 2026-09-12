---
'agentic-service-blueprinting': patch
---

**Six shared scripts can now be enrolled, and two of them were lying before
anyone had met them.** A deployment that holds a file byte-identical to this
package's also promises the file cites no identity local to one repository,
and every one of these six broke that promise with a `docs/` path. A sweep
that set out to enrol them enrolled none.

They are `check-glossary-only.mjs`, `check-negation-ratchet.mjs`,
`check-target-schema.mjs`, `generate-agent-account.mjs`, `swept-docs.mjs` and
`tests/the-router-is-a-router.test.mjs`. Enrol them at the version that
carries this note; the deployment's own `check:reconciled` returns no citation
finding on any of them.

**Two were wrong, not merely unenrollable.** `check-target-schema.mjs` told a
reader to run `npm run check:target` and to open a connector document under
`docs/connectors/supabase/` — neither of which a deployment has; its usage
block now names the script by its path, which is the same on both sides, and
says the alias is each repository's own. `generate-agent-account.mjs` wrote
its ratchet baseline to a path only one tree ever had.

**Two values move to `scripts/repo-config.mjs`, so this release needs two
fields added there.** That file is never shared and every field in it is
required, so a deployment bumping the pin adds both before the scripts run:

- `datedRecords` — the trees whose markdown no sweep rewrites, because they
  keep the words of the day they were written. `['docs/adr']` in both
  repositories today; it was hard-coded in `swept-docs.mjs`.
- `agentAccount: { document, baseline }` — where `generate-agent-account.mjs`
  renders the account and records the ratchet. A deployment's are its own; it
  was writing to this package's spelling of them.

**The rule, recorded rather than re-litigated.** A `docs/` path in a shared
file is a defect when it reaches an adopter as a **dangling reference**, and
not otherwise. `src/citations.ts` carries it, `src/citations.test.ts` holds it
over all of `src/`, and a new suite holds it over the published shared
scripts. Four subjects under `src/` are exempt with the reason beside each:
the vendored rulebook (read out of this package, where `docs/` ships beside
it), the sample cover and its suite (replaced whole through
`DeploymentConfig.cover`, and linked through this package's own repository URL
where it is not), and `src/types/database.ts` (this package's own schema
declaration — a deployment writes its own, header included).

Naming a documentation **tree** is not a dangling reference; a shared file
still says "the decision records" rather than spelling the path, because the
sentence never needed it and the gate reading these files is line-based over
bytes. A **fixture** path is not a citation either — the router suite creates
and deletes the files it names — but for the same reason those fixtures now
sit under `notes/`, with the reason in the suite's header.

**`check:doc-paths` and the citation guard no longer contradict each other.**
One required the plugin surface's paths to resolve here and the other would
have forbidden naming them at all. The line is which reader the document is
written for: `check:doc-paths` is the authority over `skills/`,
`references/`, `agents/`, `hooks/` and their vendored copy, which an agent
reads out of this package's own installed tree; the citation guard is the
authority everywhere else. Both headers say so.
