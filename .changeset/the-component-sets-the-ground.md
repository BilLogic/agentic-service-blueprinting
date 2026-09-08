---
'agentic-service-blueprinting': patch
---

A role's pale tint is measured from the surface it is drawn on instead of from
the page, and the component that paints a surface is what says which one it is.

The tint is six percent of the signed canvas-to-ink span, and an elevation rung
is a step of the same size. Derived from the page it therefore landed on top of
anything raised off the page: all seven roles measured 1.02:1 against a card in
dark, where the card itself sits 1.09:1 off the canvas. The role edge was
carrying the entire shape and the tint was contributing nothing. Light read 1.18
only because its span runs the other way and the two distances happened to add —
the same arithmetic, hidden behind a sign.

`--ground` is the lightness a tint is measured from. At the root it is the page
and that is the whole of the default. A component that establishes a surface
carries `data-ground`, `semantic.css` re-derives at that scope for the same
reason it already re-derives under a themed subtree — custom properties
substitute before they inherit — and the seven tints and the seven edges that
step off them follow. One new name, one selector, three ground rules, and no
second name for any job.

The grounds are named for their surfaces rather than for their elevation
ratios, because that is what a component knows about itself: a card knows it is
a card and does not know it is one and a half steps up. `src/lib/ground.ts`
holds the vocabulary the components spread, and the rule holds it against the
scopes the stylesheet declares, so neither tier can drift from the other.

THE CLAMP IS NOT A SAFETY RAIL, and it was the thing that would have made light
worse. Light's canvas sits at 0.995 with a step of 0.024, so every rung of its
ladder runs past 1 and the browser holds all three at white. A ground computed
without that ceiling measures a card that is not on the screen: the light tint
lands at 1.07:1 against the card it is drawn on, below the floor and worse than
the 1.19 the defect it replaces was already reaching. Clamped, it reads 1.17.
Dark is unaffected either way, which is exactly why this could have shipped
unnoticed. Reading the same ceiling the browser reads is what keeps the
measurement and the pixel the same thing.

WHAT MOVES IN THE COMPILED CSS, built before and after rather than reasoned
about. The semantic block gains the ground scope in its selector list and one
declaration; the seven tints swap which name they read; three ground rules
arrive. On the page the ground resolves to the page, so every value the app
draws outside a declared surface is unchanged. Inside one, the tint moves and
its edge moves with it. The two washes of a solid fill leave the artifact along
with their `@supports` fallbacks, the ink that sat on one of them goes with
them, and one ink utility arrives. Sixty-seven bytes.

MEASURED THROUGH THE TOKEN MODEL, on every ground the stylesheet offers, for
all seven roles, in both themes. A tint now clears its ground at 1.10 to 1.18
everywhere, against 1.02 on a dark card before. The rule is two invariants
rather than a table: a tint clears its ground, and the choice of ground may move
that distance a little and may not decide it. Both go red on a single role
regressed to the page, and a third rule reproduces the original defect so a
guard that could never fail is not mistaken for a clean tree.

The model gained the scope to ask. It answered at the root and nowhere else,
which was the right shape while every colour here was a property of the page;
`resolveValue`, `resolveColorValue`, `resolveColor` and `winningDeclaration`
now take the subtree, spelled as the selectors that match it, so a rule reads
the cascade's own answer for an element instead of re-deriving a subtree's
arithmetic in TypeScript beside the CSS.

THE EDGE BAND WIDENS, and the file's own claim about it was corrected rather
than left standing. A fixed lightness travel does not buy a fixed ratio at every
point on the axis, so the same role edge reads 1.24 on the dark canvas and 1.32
on a dark popover. The prose promised 1.22 to 1.28; across every ground and both
modes the spread is 1.22 to 1.32. Four hundredths, at a distance nobody can see,
and still far below the 3:1 that paragraph is defending against.

The comparison surface's two verdict markers move onto the tint and the ink cut
for it. They wore the solid fill as ink on a ten-percent wash of itself, which
is the weakest pairing this vocabulary allows — the fill is tuned for ink to sit
on it, and an alpha has no ground until it is painted.

WHAT THIS DOES NOT DO. A surface that never says what it is still hands its
children the page, silently, which is the failure mode the defect had. That is
inherent to a value only the component can know, and it is why the ground is
declared once by each surface primitive rather than at each tinted element: an
alert does not know what it was dropped into, and now it does not have to.

`src/styles/semantic.css` is enrolled in the deployment's reconciled-files list
and was byte-identical to its copy, so that gate stays red until the next pin
bump.
