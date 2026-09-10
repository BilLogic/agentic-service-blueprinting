---
'agentic-service-blueprinting': patch
---

The palette suite measures a brand it does not name: identity and action are
two colours by a perceptual distance, and a status signal stays clear of the
accent.

**A test a fork has to edit is a test that does not travel.** `palette.test.ts`
held `contrast(brand, primary) > 1.5` as its "these are two colours" floor, and
both halves of that were this template's greyscale talking. Contrast is a
function of lightness alone, so it cannot see either of the ways a branded
palette separates the two fills — a hue apart and a chroma apart both measure
1:1 — and 1.5 was read off a neutral seam that stands a near-black control
beside a mid-grey identity. A deployment that gives both fills one accent and
separates them by lightness alone measures 1.27 and fails a floor it has not
violated. It was the last assertion in the file an adopter had to edit to get a
green suite, which is the habit this repo spends real effort discouraging
everywhere else.

**What replaces it is the claim the ratio was standing in for.** Identity and
action are TWO fills, held as a Euclidean distance in OKLab — the space these
are authored in — against a floor of one just-noticeable difference. Hue and
chroma count as separation now, and the colours measured are the gamut-mapped
ones, because two triples the browser reduces onto each other are one colour on
the screen whatever the dials said. The floor is a fact about eyes rather than
about a palette: no brand is named by it and none can be tuned around it. This
template clears it at 0.39 and 0.33, a branded deployment at 0.07, and a
palette that dials one fill onto the other lands at 0.

**The reason `semantic.css` already gave, now held.** `--success-hue` is pinned
rather than pulled toward the accent, and the comment beside it says why: a
brand-relative green would collide with `--primary`, and a success state has to
stay distinguishable from a brand fill. Nothing asserted it. Warning,
destructive, info and success are each measured against both accents at the
same just-noticeable floor, in both themes — so an accent moved onto a category
anchor fails here rather than shipping a destructive fill that is the brand
fill and carries no signal at all.

**Demonstrated rather than claimed.** With a real deployment's dials in the
theme files — one accent, both modes, chroma 0.135 — the file passes 279 of 279
with no assertion edited. Deliberately broken palettes still fail: the identity
dialled onto the action fill (0), the identity a hundredth of a lightness step
off it (0.01), a focus ring dialled into the canvas (1.11:1), and a green brand
dialled onto the success anchor (0).
