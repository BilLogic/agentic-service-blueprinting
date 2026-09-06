---
summary: Style enforcement rides one queryable token model instead of a reader per test file, because a guard that chooses its own sample chooses the region where its property already holds — so a new style rule is an assertion against declarations, the cascade and consumers, never a fourth file walker.
---

# 6. One token model is the single seam for style enforcement

**Status** Accepted — 2026-09-06
**Context** `src/lib/tokenModel.ts`, `src/styles/tokens.test.ts`,
`src/lib/palette.test.ts`

## Context

The style rules in this repository were enforced by three test files, and each
one carried its own reader.

`styles/tokens.test.ts` concatenated every stylesheet into a single string and
swept the result for `--name:`. That reading can answer one question — is this
name written down somewhere in the tree — and no other. It cannot say which
selector a declaration sits under, whether an `@media print` block wraps it, or
what the property resolves to once the cascade has run. `lib/palette.test.ts`
opened `colors.css`, `semantic.css` and both theme files itself, and read a
theme dial by taking the first `--name:` match in one file.
`lib/tokenDiscipline.test.ts` walked `src/components/**.tsx` with a third
reader again.

Three readers, three samples. The consequences were not hypothetical:

- **A rule that was quietly dead.** `tokens.test.ts` meant to cover Tailwind
  v4's bare-value shorthand — `w-(--anchor-width)`,
  `origin-(--transform-origin)` — alongside `var()`. Its pattern required a
  letter immediately before the parenthesis, and every such utility ends in a
  hyphen. It matched nothing the `var()` pattern beside it had not already
  matched. Nineteen references across eight files sat outside every rule in
  that file for as long as the file has existed.
- **A rule that could only be approximated.** "The semantic layer re-derives
  under `.dark` and `.light` subtree scopes" was checked by asserting that a
  block with that selector existed *somewhere* in `semantic.css`. Whether each
  of the forty-five semantic tokens was inside such a block is the question it
  meant to ask, and a reader with no notion of a selector cannot ask it.
- **A rule that measured the wrong thing.** "No blueprint cell token is
  declared at `:root`" was a grep for `:root { … }` blocks in one file. A
  declaration under `.dark`, or under `html.light`, or in a later stylesheet
  would have passed while breaking the app in precisely the way the rule was
  written to prevent.
- **A sample that excluded what it was about.** Every contrast assertion in
  `palette.test.ts` compared two halves of the SAME primitive ramp. The board's
  divider caption is a `gray` ink on a `slate` ground, and it rendered at
  2.64:1 in light and 2.74:1 in dark — small uppercase text, against the 4.5:1
  it needs — inside a file that measures contrast a hundred times. The same
  file's `[data-blueprint-lane]` regex excluded all seven touchpoint tone
  blocks, which set the same seven properties from the same ramps: seven of
  fifteen allocated families were exempt from every check in it.

None of that failed. A rule only fails on what it can read, so a reader's blind
spot presents as a green build.

We are therefore replacing the three readers with assertions against one model
that reads the authored token layer, the cascade over it, and the source tree
that consumes it.

## Considered Options

**Widening each reader in place** was cheaper and preserved three passing test
files. It was rejected: three guards that each choose their own sample cannot
be trusted to say whether a rename touching hundreds of sites broke something,
however wide each one gets. The sampling gap is a property of having three
seams, not of any one guard's scope — and a fourth style rule would have
arrived with a fourth reader and a fourth blind spot.

**A CSS parser dependency** was rejected for a narrower reason. The model needs
the selector, the wrapping at-rules and the source order, and it needs to run
under `vitest` against files it does not compile. That is a character scanner
of about ninety lines against a build-time dependency whose output would still
need the same cascade layer written on top of it.

## Decision

**`src/lib/tokenModel.ts` is the single seam for style enforcement.** It is
test-time only, and it answers four questions:

1. **What is declared, and where.** Every custom property under `src/styles`,
   with its value, the selector it sits under, the at-rules wrapping it, its
   file, its line and its layer.
2. **What it resolves to.** `winningDeclaration` and `resolveValue` run the
   root cascade under a named theme — setting `@media print` aside, breaking
   the `:root`-versus-`.dark` tie on the import order read out of the entry
   sheet, and chasing `var()` through, fallbacks included.
3. **Who consumes it.** Every read, from a stylesheet or from source, in either
   the `var()` or the bare-value form, and whether a fallback was supplied.
4. **What the colour is.** The HSL and OKLCH conversions, the gamut solver and
   the contrast formula, so a colour rule measures rather than trusts a step
   number.

**A new style rule is an assertion against those answers.** Not a new file
reader, and not a new regex over a hand-picked subset.

**The sample is widened here, once.** `sourceFiles()` reads every non-test
`.ts`/`.tsx` under `src`, deliberately rather than a tidier list of roots: the
rule this model absorbed already read the whole tree, and a model sampling less
while claiming to generalise would have narrowed a live guard.

## Consequences

- **Every rule inherits a widening, and a defect.** Absorbing the dead
  shorthand rule surfaced nineteen live references to Base UI's positioner
  properties, now named in a runtime allowlist. Sharing the ramp reader put the
  seven touchpoint tones inside every contrast assertion they had been outside
  of. Measuring the cross-family board chrome caught the 2.64:1 divider
  caption, whose ink moved from step 900 to step 1200. A port that had left the
  readers alone would have carried all three defects across untouched.
- **The compiled artifact is not in the model, and its prerequisite is
  unmet.** Liveness — "does this name still have a consumer" — cannot be read
  off the stylesheets alone: `--colors-white` is declared in `global.css` and
  read exactly once, from a JSX attribute. Nothing asserted today needs the
  compiled output; a token-deletion pass would. That pass has to do one thing
  first. Tailwind v4 scans non-gitignored markdown, so a class name written in
  a document under `docs/` generates that class in the compiled CSS and would
  stand as the evidence that the token it names is live.
  `styles/tailwind.config.css` carries no `@source` exclusion for `docs/`, so
  adding one is step one of that phase rather than a detail inside it.
- **`lib/tokenDiscipline.test.ts` still carries its own reader.** It is the one
  guard not converted here, and it is the remaining instance of the shape this
  record retires: it walks `src/components/**.tsx`, so anything a class string
  in `lib/`, `hooks/` or `contexts/` says is outside it. Converting it is a
  change to what it samples and therefore its own change, not a rider on this
  one. Until it lands, the claim above holds for three of four style guards.
- **A rule can now be wrong in a new way.** The model is code, and a blind spot
  in it is a blind spot in everything at once — which is the trade against
  three readers failing independently. `src/lib/tokenModel.test.ts` is the
  answer: it asserts the reader directly, sheet by sheet, against the raw text,
  rather than waiting for the next blind spot to appear as a wrong answer
  somewhere else.
- **A fork inherits the seam, not the numbers.** The measurements in
  `palette.test.ts` are written against this template's neutral brand seam and
  hold at chroma 0; a fork that raises the dials keeps every assertion and gets
  the ones about gamut headroom and ramp-hue agreement biting for the first
  time, which is when they matter.
