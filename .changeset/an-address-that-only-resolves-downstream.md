---
'agentic-service-blueprinting': patch
---

Two sentences in shared source stop naming an address that resolves only in a
deployment, and the surface is measured rather than asserted.

`src/styles/semantic.css` said "Sidebar selection language (nav plan D8)". D8
is a row of a plan document in the deployment this vocabulary was ported from;
nothing here resolves it. The sentence now states the decision — hover and
selected are distinguished, and this is how — which is what a reader of the
token needs and what the paragraph beneath it already explains.

`src/lib/sliceValidation.ts` had the opposite defect: the deployment's copy
carries an explanation this one lacked, that `slices.origin` became
`slices.authorship` and why the validator therefore reads what it reads. Both
halves are true here. Only the migration filename was unportable, so the
explanation arrives stated without one, pointing at
`scripts/retired-vocabulary.mjs` — the durable place a reader goes for the
history, which is the pattern the fold-migration citation established.

The wording was checked against the deployment's copy rather than assumed: with
this comment in place the two files differ in nothing else, so the deployment
can adopt it verbatim and hold the file.

THE SWEEP, because four instances of one shape is a pattern and the count is
what says whether it needs a guard. Over the adoption surface — 199 files this
repository ships that the deployment also has and has not yet held to this copy
— there are 244 addresses: 80 bare issue numbers, and 25 that resolve to
nothing here. Twenty-two of the 25 are test fixtures (`docs/a.md`,
`docs/gone.md`, planted SVG paths) or deliberate cross-repo statements about
the deployment's own database, correctly framed as such. Exactly one was the
defect, and it is the one fixed above.

A GUARD IS NOT WORTH IT, on that measurement. The standing backlog is one file:
of the 199, exactly one is already byte-identical and unheld, and it is
`semantic.css`. A rule refusing repo-local addresses in shared source would
return 80 issue-number findings on its first run, nearly all of them in
`scripts/` — this repository's own checks, citing this repository's own issues,
correctly. Eighty exemptions on a first run is a list of sites, not a rule.

The asymmetry is real and it is closed elsewhere: this repository cannot know
which of its files a deployment will hold, and the deployment's reconciled list
already records each blocked file with its reason. That is where the discovery
happens, and filing it back is how it gets fixed — which is what happened here.
