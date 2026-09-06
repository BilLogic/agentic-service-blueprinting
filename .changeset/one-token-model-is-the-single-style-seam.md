---
'agentic-service-blueprinting': patch
---

Style enforcement rides one token model, and three guards that chose their own
sample stop choosing.

`src/lib/tokenModel.ts` is new and is the seam. It answers what the token layer
declares (with the selector, the wrapping at-rules, the file and the line),
what a name resolves to at the root under a named theme (`@media print` set
aside, the `:root`-versus-`.dark` tie broken on the import order read out of
the entry sheet, `var()` chased through), who consumes it — from a stylesheet
or from source, as `var(--x)` or as Tailwind v4's bare-value shorthand, with or
without a fallback — and what the colour is, since the HSL and OKLCH
conversions, the gamut solver and the contrast formula move here too.
`docs/adr/0006-one-token-model-is-the-single-style-seam.md` records why, and
`src/lib/tokenModel.test.ts` asserts the reader itself, sheet by sheet against
the raw text, because a blind spot in one model is a blind spot in everything
at once.

`styles/tokens.test.ts` and `lib/palette.test.ts` are rewritten onto it. Ten of
the twelve rules in the first fold across unchanged in intent; two retire
because `palette.test.ts` now holds a strictly stronger form of each — which
roles exist, and that each declares the full property set, is asserted there
beside the contrast measurements that need the same parse.

**Four of the folded rules could not previously be asked properly, and the
model is what makes them askable.** A dial is now checked for resolving to a
number under each theme, not merely for appearing in a theme file — `print.css`
restates thirteen of them inside `@media print`, and `themes/light.css`
declares most of them under a bare `:root` that matches under dark as well. The
semantic re-derivation rule now asks whether each of the forty-five tokens sits
inside a `:root, .dark, .light` block, rather than whether such a block exists
somewhere in the file. The "no blueprint cell token at the root" rule asks the
cascade instead of grepping one `:root { … }` block, so a declaration under
`.dark` or in a later sheet can no longer pass it. And the "only token
references, never a raw colour" rule now covers the seven touchpoint tone
blocks alongside the eight lane blocks.

**Three defects surfaced, and none of them was failing anything before.**

The reference rule meant to cover Tailwind's bare-value shorthand
(`w-(--anchor-width)`, `origin-(--transform-origin)`) required a letter before
the parenthesis, where every such utility ends in a hyphen — so it matched
nothing the `var()` pattern beside it had not already matched, and nineteen
references in eight files were outside every rule in that file. They resolve
now, against a named allowlist of the nine Base UI positioner properties the
primitives write at runtime.

Every contrast assertion compared two halves of the same primitive ramp, so the
board's divider caption — a `gray` ink on a `slate` ground — ran at 2.64:1 in
light and 2.74:1 in dark inside a file that measures contrast a hundred times.
Step 1100 does not clear it either (4.11:1 light); `BLUEPRINT_THEME.dividerLabel`
moves from step 900 to step 1200, the smallest rung that clears AA in both
themes, and the pair is now measured rather than the step number trusted.

The interaction-state block matched `[data-blueprint-lane]` only, so all seven
touchpoint tones were excluded from every contrast assertion in the file —
seven of fifteen allocated families, setting the same seven properties from the
same ramps and rendering as cell surfaces exactly the way lanes do. They are
inside it now, in both themes, and all seven pass.

Two claims are narrowed rather than widened, because widening the sample proved
them false as written. "Keeps named paths off the lane families" sampled forty
synthetic names all hard-coded to `kind: 'variant'`, which `getPathColor`
short-circuits into the open set — the one family group disjoint from the lanes
by construction — so `happy` and `exception` were structurally unreachable
through it. Extended honestly, `happy` is green against the green `actor` lane
and `variant` is blue against the blue `evidence` lane. Eight lane families plus
seven tones is fifteen and there is no spare hue to move either to, so the file
now names both overlaps and holds what it actually can: each is drawn at step
1100 against a step-500 lane fill, six steps apart. Beside it, the constraint
nobody had written down — the palette is full — is asserted, so a ninth lane
fails before it is drawn.

`themes/dark.css` gains a corrected comment: it claimed `--surface-hue` falls
back to `var(--hue)` there, and the cascade says otherwise. `themes/light.css`
declares it under `:root, .light`, the bare `:root` matches under dark, and
nothing later takes it back — so the dark surfaces run on light's warm 34. Moot
at chroma 0, and exactly the class of claim the old reader could not check.

`lib/tokenDiscipline.test.ts` is deliberately untouched and still carries its
own reader over `src/components/**.tsx`. Converting it changes what it samples,
which is its own change; the ADR's consequences say so rather than letting the
gap go unrecorded.
