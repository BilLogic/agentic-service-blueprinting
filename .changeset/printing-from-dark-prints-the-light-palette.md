---
'agentic-service-blueprinting': patch
---

Printing from dark mode prints the light palette, all of it.

`styles/print.css` forces the light palette onto paper by restating dials
inside `@media print`, under `:root, .dark`. The `.dark` arm is what takes the
dark theme's declarations back, and it can only take back a name it mentions.
The block's header comment said exactly that, in prose, and prose does not run:
the block was written correct and fell **nineteen dials behind** as the theme
files grew.

The reported symptom was the filled control. Dark inverts it to a near-white
fill, `--primary-lightness: 0.922`, and the print ground is `0.968` — so a
primary button printed from a dark page came out as an L=0.922 fill on an
L=0.968 sheet, very nearly invisible. The focus ring (`0.62` instead of `0.58`)
and links (`--brand-link`, 58.3% instead of 26% lightness) went with it.

Measuring it through the token model found seventeen more. The stepped ramps —
`--brand-200`…`--brand-600`, and the five-step warning and destructive ramps —
are per-theme HSL literals rather than derivations, so nothing downstream
re-derives them into the light; `theme.css` and `colors.css` register them as
`hsl(var(--brand-600))` and friends at `:root`, and the dark literal is what
those read on paper. Dark inverts the ordering, 200 darkest, so a printed
badge or subtle plate came out near-black on white. `--field-alpha` printed at
dark's `0.12` rather than `0.015`, putting a grey box round every control. And
`--hue` was pinned in the print block at `177.6`, the upstream brand hue, where
the light theme has said `159` since this repository's theme files were
written — moot while `--chroma` is `0`, and a rebrand away from being the
filled control printing in the wrong hue.

The print block now restates every dial the two themes disagree about, at the
light theme's value. It restates nothing else: dials both themes already agree
on — `--hue`, `--chroma`, `--radius`, `--primary-chroma` — are absent rather
than copied defensively, because a second unheld copy is what caused this.

The rule is an assertion now, not a comment. `lib/tokenModel` gained a `medium`
argument, so the printed cascade can be resolved the way the screen one already
could: on `print` the `@media print` block wins, and `colors.css`'s
`@media screen` dark palette — 216 values print.css therefore never has to
copy — is what gets set aside instead. `styles/tokens.test.ts` holds four
things against it. Every dial resolves to one value whichever mode the page was
in; that value is the light theme's, bar two paper tunings named in the test
with their reason (`--surface` and `--elevation-step`, because light's `0.995`
ground leaves the elevation ladder no room above it and on paper the plates
have to read as plates); the tunings are exactly those two; and nothing is
restated that the dark theme does not take over.

None of it counts entries or names the dials the block should hold. A dial
added to the theme files at differing per-theme values is inside the first rule
the day it is added, which is the one thing a count of thirteen could never do.
