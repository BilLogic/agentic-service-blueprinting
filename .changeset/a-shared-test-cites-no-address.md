---
'agentic-service-blueprinting': patch
---

A portable contract test states the fold without naming an address — or a
history that is not shared.

`pathKindContract.test.ts` asserts that each array-shaped path-kind roster holds
each of its members once, deliberately not a census, and it is the only consumer
of `BLUEPRINT_ARROW_PATH_KINDS`. Every symbol it imports exists in the
deployment, and it passes there unchanged: it is exactly the test that would
have caught the roster that read `['happy', 'exception', 'exception',
'variant', 'variant']` — five entries for three kinds, absorbed by
`Object.fromEntries` so nothing rendered wrong, and found by hand. The
deployment refused to copy it, and was right to: its header named the fold
migration `21000116000000`, a filename that resolves to nothing on the other
side, and one of the repo-local identities the reconciled allowlist exists to
keep out of shared prose.

Replacing the address with the fact it stood for would have been the obvious
fix and would have been worse. The fold is not the same fact in the two
repositories. Here `21000116000000` runs one statement and sends both `unhappy`
and `alternative` to `variant`; the deployment's `one_spelling_each` ran two
updates and sent `unhappy` to `exception` and `alternative` and `custom` to
`variant`. Both rename maps say so, each about its own database. A sentence
reading "`unhappy` and `alternative` collapsed into `variant`" is true in this
tree and false in the next one — and a wrong address misleads nobody for long,
while a wrong fact is believed.

So the header states what both databases share and nothing more: `paths.kind` is
a CHECK constraint, `paths_kind_check check (kind in ('happy', 'variant',
'exception'))` on both sides, and `variant` is a fold destination on both sides.
Which older spelling went where is left to `scripts/retired-vocabulary.mjs`,
read against the migrations that ran in the repository the reader is standing
in — which is what that map's own comment already says a reader has to do. The
file now carries no repo-local citation at all, by the deployment's own scanner,
and can be adopted verbatim.

The sweep the ticket asked for was run, in the direction the enrolment gate
measures: the deployment's tree against the pinned template package, over 924
in-scope paths with 338 already enrolled. Fourteen unenrolled files are
byte-identical or differ by prose alone. **Three** are held back by exactly one
repo-local citation — `MobileNavSheet.tsx` (`plan 2026-08-16-002`),
`findingFingerprint.ts` (`§2`) and `sliceValidation.ts` (migration
`20260830190000`) — and none by more than one. All three citations are in the
deployment's copy; this template's copies are already clean, so all three are
deployment-side edits and none of them is this repository's to make. Eleven more
carry no citation and are enrollable now for the cost of the allowlist line.
