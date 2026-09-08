---
'agentic-service-blueprinting': patch
---

Every coloured role now offers the same seven names, so an author picks a
colour by naming the job rather than by reading a number off a ramp.

Seven roles — `primary`, `brand`, `warning`, `destructive`, `info`, `success`,
`secondary` — and seven names each. The fill (`--{role}`), ink on that fill
(`--{role}-foreground`), the resting tint (`--surface-{role}`), ink on that
tint (`--text-on-surface-{role}`), role ink on the neutral page
(`--text-{role}`), the edge (`--border-{role}`) and the transient state
(`--wash-{role}`). Roughly seventeen of the forty-nine existed; this fills the
rest and publishes a Tailwind utility for each.

**What a reader sees change.** Almost nothing, and that is deliberate: this is
the expand half of a migration, so the new names land beside the old ones and
the call sites move separately. Two things do move on screen.

The info and success alerts are the only live consumers of a role border, and
theirs becomes solid: the fill at thirty percent alpha drew a different colour
on every ground it crossed, which is why components reached past it for a ramp
step. It is also quieter. A role border is not what identifies a control or its
state — the tinted surface and the filled icon square carry the variant, and
the edge can go without the alert becoming unreadable — so the target is the
interval this system's recipe uses rather than the 3:1 a required boundary has
to clear. That recipe puts a role border one step off the surface it edges,
which across its own four alert variants measures 1.21:1 to 1.34:1. Every role
here lands between 1.22:1 and 1.28:1 against its own tint, in both themes. On
the ground those two alerts draw on today the edge measures 1.23:1 and 1.19:1
in light, against 1.45 and 1.43 for the alpha it replaces; in dark it measures
1.09 and 1.08 against 1.67 and 1.88, because those two still tint with
`bg-{role}/15`, which sits lighter than `--surface-{role}`. That gap closes
when the call sites move onto the tint.

And `--border-brand` was derived from the primary fill while brand had no fill
of its own; it is derived from `--brand` now, which is the colour its name
always claimed. Nothing consumes that one yet.

Everything else holds exactly: every custom property under `src/styles`,
resolved in both themes, with no value moved except those five borders.
Seventy-two names arrive and twenty leave, and the twenty are the brand ramp
and nothing else.

**What an author gets that did not exist.** A name for role ink on a neutral
ground. `text-destructive` is written at about twenty call sites, all of them
on the page rather than on a tint, and it resolves to the solid fill — a
colour tuned for ink to sit on top of it, never measured as ink. `--text-role`
is that measurement: 8.4:1 to 13.5:1 against the page across both themes. A
resting tint for every role, so nobody hand-composes `bg-success/10` at the
call site again. And a transient wash distinct from the tint, so hover does
not reuse the surface it sits on.

**Brand becomes two dials, and the ramp goes.** `--brand-lightness` and
`--brand-chroma` sit in both theme files beside the primary pair, and `--brand`
derives from them. Rebranding used to mean re-typing a seven-step lightness
curve per theme; it is two numbers now.

So the ramp goes with it — `--color-brand-100` through `-1200`, the
`--brand-200..600` literals in both theme files and in the print block that
restated them, `--brand-default`, and `--color-brand-link`. Nothing outside
those declarations read any of them, here or in the deployment that pins this
package, so nothing on screen moves. It is a rule and not a tidy-up: a
primitive family is named for its hue — amber, violet, teal — because the hue
is all it knows about itself, and a family named for a ROLE cannot follow an
accent, which is exactly what a rebrand asks of it. The role keeps its name in
the semantic layer, where the value is derived.

`brand-link` had no consumer either, and the job it named already has a derived
name: role ink on a neutral ground is `--text-brand`. Deleting it is cheaper
than deriving a colour nobody has asked for and nobody would measure.

`bg-brand` renders the colour it always has — #7e7e7e in both themes here,
since the lightness dial is the OKLCH lightness the anchor step carried. With
the ramp gone there is no step left to compare it against, so the rule that
claimed it becomes the derivation instead: the fill is the accent at the two
brand dials, on the one hue the filled control also runs on.

Every one of the new names is derived from the role's own accent, and none
aliases a hue primitive. Status hues are pulled a fraction toward the brand and
then clamped to their category, so a re-branded deployment's warning still
reads as a warning; a fixed ramp cannot follow an accent, and aliasing one
would have deleted that mechanism. The ramps stay for categorical colour —
lane identity, path variants, annotation swatches — which carries no meaning
and correctly reaches the primitive layer.

The contrast claims are measurements rather than assertions. The token model
learned to resolve a declaration to a colour — `calc`, `clamp`, relative colour
syntax, both alpha spellings — so a rule reads what the cascade produces
instead of restating the arithmetic in TypeScript beside it. Every floor was
re-measured with the accent, chroma and hue a branded deployment ships, and
holds there too.

Completeness is an invariant, not a census: the rule is driven off the role
list, so adding an eighth role covers it automatically and fails until all
seven of its names are declared and registered.
