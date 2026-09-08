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
the call sites move separately. Two things do move on screen. The info and
success alert variants get a firmer edge — those two borders were the fill at
thirty percent alpha, which measured between 1.29:1 and 2.41:1 against the
grounds they were actually drawn on, short of the 3:1 that WCAG asks of a
non-text affordance. They are solid now and clear it in both themes. And
`--border-brand` was derived from the primary fill while brand had no fill of
its own; it is derived from `--brand` now, which is the colour its name always
claimed. Nothing consumes that one yet.

Everything else holds exactly: every custom property under `src/styles`,
resolved in both themes, 639 names before and 679 after, with no value moved
except those five borders.

**What an author gets that did not exist.** A name for role ink on a neutral
ground. `text-destructive` is written at about twenty call sites, all of them
on the page rather than on a tint, and it resolves to the solid fill — a
colour tuned for ink to sit on top of it, never measured as ink. `--text-role`
is that measurement: 8.4:1 to 13.5:1 against the page across both themes. A
resting tint for every role, so nobody hand-composes `bg-success/10` at the
call site again. And a transient wash distinct from the tint, so hover does
not reuse the surface it sits on.

**Brand becomes two dials.** `--brand-lightness` and `--brand-chroma` sit in
both theme files beside the primary pair, and `--brand` derives from them.
Rebranding used to mean re-typing a seven-step lightness curve per theme; it is
two numbers now. `bg-brand` renders the same colour it always has — the dial is
the lightness the old ramp anchor already carried — and a test measures that
rather than claiming it.

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
