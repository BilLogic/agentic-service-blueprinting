---
'agentic-service-blueprinting': patch
---

**Every check that measures the application now finds it wherever it is, and
refuses a subject that is not there.** A deployment installs this package and
reads the application out of `node_modules/agentic-service-blueprinting/src`,
with no `src` of its own. Measured in a truthfully staged deployment — no
`src`, the package installed by copy rather than linked — **30 of the 60 test
files this package ships failed there**, and six checks with them. They divided
into two failures, and the quiet one is the worse one: alongside the walks that
crashed on a directory that was not there were walks that swept an empty set,
found nothing, and printed the same clean line they print after reading four
hundred files. That line goes on being printed every run after, and the run
that would have caught the defect looks exactly like the run before it.

`scripts/app-source.mjs` already stated where the application is; it now
answers at the granularity the checks actually use — the package root a finding
is reported relative to, one named file, and a whole walk — and every one of
those refuses an absent subject rather than returning an empty answer.
Everything that measures the application resolves through it: the agent's tool
surface and the write boundary, the generated database types, the component
walks, the documents' claimed paths, the router's pointers, the offline board,
the harness's `@/…` alias, and the five test files that imported application
source as `../../src/…` and could not even load in a deployment.

What is NOT the application says so in one place. `scripts/repository-only.mjs`
lists the five scripts whose subject is this repository itself — the two
generators that write into its own `src/data`, the skills vendoring sync, and
the two `git ls-files` sweeps that ask what THIS commit would carry — each with
the reason, so the next sweep through these files does not re-decide them. A
new guard holds the two halves apart: a script that names an application path
and neither resolves it nor appears on that list fails at the moment it is
written.

And the test that holds the statements of the two roots equal now DISCOVERS
them instead of naming four files. A fifth had already been written without it.
The four that must state the pair are asserted to be among what the sweep found,
so a sweep that stops matching anything fails instead of agreeing with
everything.

This repository's results are unchanged throughout — the same subjects, the
same counts, the same verdicts, and `identifiers.json` byte-identical.
