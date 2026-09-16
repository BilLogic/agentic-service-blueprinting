---
'agentic-service-blueprinting': patch
---

The identity fill derives from the action fill, with one optional dial per
channel.

`--brand` was its own pair of dials, and the only values that pair ever shipped
were `--brand-lightness: 0.594` at `--brand-chroma: 0` in both theme files — a
mid grey, worn by the cover CTA under a `text-sm` label at 3.89:1, on the
lightness `semantic.css` itself names as the worst ground either polarity of ink
has. It is now `oklch(from var(--primary) var(--brand-lightness, l)
var(--brand-chroma, c) var(--brand-hue, h))`, and neither deleted dial is
declared anywhere.

**The four identity surfaces change appearance.** The cover CTA, the one prose
link, a switch that is on and the path selector's mark were a mid grey and are
now whatever `--primary` resolves to — near-black in light, near-white in dark,
the same colour the filled control wears. An unbranded template has one accent
rather than two set to different greys, and the identity fill now inverts with
the theme because it inherits an accent that has to.

**Customising brand is one dial per channel.** `--brand-hue` for a different
hue, `--brand-chroma` to tint, `--brand-lightness` to move the fill, declared in
both theme blocks; each takes exactly its channel off the accent and the other
two keep following it. Brand also gains a hue dial it never had — the pair it
replaces interpolated `var(--primary-hue)`, so the axis an identity most often
wants to move was the one axis it could not. The recipe is
`references/customization.md` § Theming & branding, and the decision is
`docs/adr/0025-brand-derives-from-primary-with-one-dial-per-channel.md`.

A deployment that had already set the two dials to something of its own keeps
the fill it authored by renaming them: the same numbers, read per channel over
the accent rather than as a triple beside it. Setting a dial then turns four
guards red on purpose, and `references/customization.md` lists them — the
absence guard, the byte-identity assertion, the three "declared in both theme
files" rosters, and the gamut ceiling if the chroma overshoots it. The absence
guard is the point rather than a formality: `var(--brand-lightness, l)` reaches
its fallback only while nothing declares the dial, so a leftover declaration
reinstates the old grey with no error and nothing on screen naming the line that
did it. It holds the three exact dial names on both sides of the seam — every
stylesheet under `src/styles`, and every custom property this app writes from
TypeScript, because an inline property on the root element outranks every
stylesheet selector there is.
