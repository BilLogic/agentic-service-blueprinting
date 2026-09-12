---
'agentic-service-blueprinting': patch
---

**No file in this package cites an issue number, and a check now holds that.**
An issue number in a shared file's prose resolves against the READER's tracker,
not this one, so a deployment that enrols the file lands on a different piece of
work or on nothing at all. Until now the rule was held only on the files some
deployment had already enrolled, which meant a contributor here met it by
turning a downstream build red: the previous release shipped two such files and
did exactly that.

Enrollment is not a property of a file. It is a property of whichever deployment
has adopted it, and adopting the next file is what each release does — so the
rule covers everything under `src/`, and `src/citations.test.ts` fails the build
here instead of a deployment's `check:reconciled` failing one tag later. It
reads prose only: a comment or a document, never a colour in a declaration or a
label the product shows. The matchers live in `src/citations.ts` beside the
vendored-component guard that already used them, so there is one definition of
what a citation is.

Thirty-eight sentences were rewritten to name their decision instead, plus two
in the vendored agent rulebook, fixed at their source under `references/` and
`skills/`. Almost none of them lost anything, because the number was never
carrying the meaning — "the fallback #622 retired" is "the retired fallback".
Where a number was load-bearing, the fact is written in: the nav "used to be
`SAMPLE_NAV`", the lane-role enum closed with the `2026.09.10` schema version.

`src/lib/backend/schemaVersion.ts` held a dozen of them and is the one worth
reading, because a version history is exactly the place identifiers earn their
keep. It keeps them. Every entry is still headed by the schema version it
describes and still names the migration that stamped it — `2026.09.10`,
`21000122000000` — and both resolve in a deployment's own database. Those are
schema versions and migration stamps, not issue numbers; what left was a pointer
into a queue, sitting beside a sentence that had already said what changed.

Record numbers (`ADR 0012`) are a separate matter and are still held only across
the vendored component tree. Eleven remain elsewhere under `src/`, in files that
cite an ADR this package publishes; whether they travel is not settled here.
