---
'agentic-service-blueprinting': patch
---

**The content-coupling sweep reads every file a commit would carry, root
documents included.** It used to narrow its subject to seven directory
prefixes — `src/`, `skills/`, `agents/`, `references/`, `evals/`, `scripts/`,
`docs/` — and no root-level file starts with any of them. So `README.md`,
`CONTEXT.md`, `SETUP.md`, `INDEX.md`, `CONTRIBUTING.md`, `SECURITY.md` and
`AGENTS.md` were outside it entirely, and so were `hooks/` and the changesets.
Measured: a foreign cell id, a cast role and a deployment touchpoint asset
appended to `AGENTS.md` and `SETUP.md` reported `no deployment content in 620
shared files` and exited 0, while the same three lines in
`references/data-model.md` failed at once. `AGENTS.md` is the always-loaded
tier — the one file every session is handed without choosing — so a
deployment's content reaching an adopter through it is the exact leak the
sweep exists to stop.

The list is gone. The subject is what a commit would carry, which is the
subject `check:standalone` already read, and both now take it from
`scripts/commit-subject.mjs` — one description of the shared subject, so the
next reader does not have to diff two `isScanned` functions to find where they
part. What each sweep narrows for itself stays its own, with the reason beside
it: fixtures and `supabase/` for the content sweep, binaries for both, and the
named files that must carry the value to do their job.

Widening found one site in the whole tree, and it is in `CHANGELOG.md`: a
released entry quoting this check's own header, cast and all. History is not
rewritten, so it is one `ALLOWED` entry with that reason rather than an
excluded file — which leaves the rest of the changelog swept and leaves the
changesets it is generated from in subject, where a pasted value now fails
before it can ever be released.

**The prose corpus reads every root document too.** `swept-docs.mjs` listed
three names — README, CONTEXT, AGENTS — so `SETUP.md`, `INDEX.md`,
`CONTRIBUTING.md` and `SECURITY.md` were read by no prose sweep at all, and the
module gave reasons for its other exclusions and none for these four. The root
is discovered now rather than listed, which is also the right shape for a file
both repositories hold byte-identical: which documents sit at the root is each
repository's own fact. `CHANGELOG.md` is the single exclusion and carries its
reason. Widening it reported nothing.

**If you hold a deployment of this template, expect the wider sweep to have
something to say.** `npm run check:content-coupling` now reads your root
documents, your `hooks/`, your changesets and your `CHANGELOG.md` — none of
which it has ever read — so a cell id, a lane actor or a `/touchpoint-logos/`
path that has been sitting in your `AGENTS.md` or your `SETUP.md` since before
you adopted the gate will fail the first run after you pin this release, in a
file the check has never named before. Each failure names the file, the line,
the value and the pattern that caught it. Replace the value with your own
content, or — where a site cannot move without a design decision — add it to
`ALLOWED` with that decision as its `why`, remembering that an entry nothing
matches any more is itself a failure.

This repository's results are otherwise unchanged: 620 files swept became 657,
the four patterns are the same four, and the one finding is the allowed one.
