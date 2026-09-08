---
summary: A primitive is named for its hue and a semantic token for its job, with the value between them derived from dials rather than typed out — so the vocabulary keeps upstream's judgements while dropping the literals a generator we do not run happens to produce, and the five places this system knowingly parts from its upstream are recorded with the measurement behind each.
---

# 8. A primitive is a hue, a semantic token is a job, and the value between them is derived

**Status** Accepted — 2026-09-08
**Context** `src/styles/colors.css`, `src/styles/semantic.css`,
`src/styles/theme.css`, `src/styles/themes/light.css`,
`src/styles/themes/dark.css`

## Context

This colour system was ported from Supabase's, and most of it is theirs: the
layer split, the formula shapes, the rule that components consume the semantic
layer and never the ramps, the decision to name border strengths instead of
dialling alphas at the call site. Where a value here is written the way theirs
is written, that is not coincidence and should not be "improved".

But a port carries two things that look identical in a diff and are not: a
judgement somebody made, and an artefact of how the source file happens to be
produced. Their stepped scales are literal because a Figma build step wrote
them in 2023, and the OKLCH derivation arrived three years later *beside* that
export rather than replacing it — the literals are a generator's output and a
generator maintains them. Ours were literal because we copied the shape of a
file we do not generate. The same characters, and only one of the two has
anything keeping it true.

Five divergences have accumulated, each settled by measuring rather than by
taste, and each one was re-derived by somebody at least once before it was
written down. This record is what stops the sixth re-derivation.

## Decision

**A primitive is named for its hue.** `amber`, `violet`, `lime` — the hue is
all a primitive knows about itself, and a family named for a ROLE cannot be
moved without moving the role with it.

**A semantic token is named for its job, and carries no ramp number.**
`--border-warning`, never `--warning-400`. A meaning has jobs; a hue has
positions. `--chart-1` … `-5` are the case that shows the rule is about reach
and not about digits: their number is a series identity, not a rung.

**Brand is not a hue.** There is no `brand` family in `colors.css` and there is
not meant to be one. A deployment that wants its identity as steps adds the hue
those steps are made of, under the hue's own name, and references it when
composing the brand semantic tokens.

**Where upstream wrote a literal, we derive; where upstream made a judgement,
we take it.** The two halves are the whole of this record's method, and the
five sections below are it applied.

## Where this follows upstream, where it does not, and why

### The stepped scales

Theirs are literal and stay maintained, because the export is regenerated.
Ours had no such thing behind them, so a role expressed as a ramp step was a
hand-typed lightness curve and a rebrand meant re-typing it. The role and brand
tokens are derived from dials instead — `--brand` is
`oklch(var(--brand-lightness) var(--brand-chroma) var(--primary-hue))`, and a
rebrand is two numbers in the theme files.

This is not claimed of the hue families in `colors.css`. Those are literal and
should be: they arrive from `@radix-ui/colors`, so they have a generator too,
and it is not ours to run.

### Two brand vocabularies, divided by a different thing

Upstream also carries two words for the identity accent, and theirs divide by
**code provenance** — one arrived with vendored shadcn, the other is their own —
which they are resolving by editing the vendored files. That route is closed
here: `components.json` points the shadcn CLI at `@/components/ui`, so that
directory is regenerated rather than authored, and a retune inside it is
deleted by the next `npx shadcn add`. A product need the primitive does not
meet is a wrapper in `components/blueprint/`.

So the two words divide by **job** instead. `--primary` is the action fill, the
accent tuned until a filled control clears its contrast floor — which is why a
neutral one has to invert between modes. `--brand` is the identity fill at the
vividness the identity was authored at, which does not have to move when the
lights go out. Both are the accent hue; a pair of dials each is what separates
them.

### The focus ring

Theirs is `oklch(from var(--primary) l c h / 55%)`. An alpha composites against
whatever happens to be behind it, so the contrast of that ring cannot be known
at author time — it is a different colour on every ground it crosses.

Ours is solid, off a per-theme `--ring-lightness`, and the reason is that
`--ring` is consumed as `focus-visible:border-ring`: the line that *carries*
the focus affordance, which SC 1.4.11 holds to 3:1. Inheriting a light fill at
55% put it near 1.2:1 on the light canvas. The `/50` at the utility site still
produces the softer glow, so one token serves both jobs.

### The radius dial

Theirs reaches dark mode through a selector leak. Ours is declared in both
theme files at the same value — not because the cascade needs the second
declaration, since `themes/light.css` opens on a bare `:root` and everything in
it reaches dark anyway, but because that is exactly the point. A value that
arrives in the other mode by leak reads the same as one that arrived by
mistake, and this system has already paid for that once: the same mechanism
carried light's warm `--surface-hue` into dark and ran every dark surface on it
until somebody looked.

### The alert border: their judgement, not their mechanism

**The judgement is taken.** An alert border should be quiet. Measured off their
own theme files, their four alert variants land at 1.21, 1.29, 1.30 and 1.34 to
one against their own tints, and that is deliberate rather than sloppy: SC
1.4.11 asks 3:1 of a boundary REQUIRED to identify a control or its state, and
an alert is not one — the tinted surface and the filled icon square say what it
is, and take the border away and the variant still reads. Aim at the 3:1 floor
and the edge stops being an edge; it becomes a rule around the box, several
times louder than the neutral hairline the same page draws beside it.

**The mechanism is rejected.** Theirs is a ramp step named for a role — a 400
weight on a 200 surface — consumed directly in a component, which breaks all
three naming rules above at once and, worse, cannot follow an accent: a fixed
ramp is a fixed colour, and a deployment authors its own. Ours is a derived
semantic token, `--border-{role}`, stepped off the role's own surface by
`--role-edge-step`, a per-theme dial because the signed surface-to-foreground
span it is a fraction of is per theme. The interval is what was copied, not the
literals — and the step rides the contrast preference on the way, which the
recipe it came from has no equivalent of.

## What this rejects

**Matching upstream token for token**, which was the cheaper reading of "port
their design system" and is what produced four of the five divergences above as
defects first. It cannot survive the brand seam: a template whose accent is
authored per deployment has no fixed literal to match, so every value that
follows the accent has to be derived whether or not upstream derives it.

**Deriving everything**, which is the same error mirrored. The Radix families,
`--text-*` rungs and named measures are literal because there is nothing above
them to derive from; a derivation with one input is an indirection with a
comment attached.

**Leaving the reasoning in the stylesheets alone.** Each divergence is already
argued at the token that carries it, and that is where it belongs — two copies
of a rule is one rule and one lie. What was missing is the shape they make
together, which no single token's comment can hold and which every reader who
has met two of them has had to reconstruct.

## Consequences

- **A retune is dials, not a curve.** A deployment changes its identity by
  moving `--brand-lightness`, `--brand-chroma` and the hue, in two theme files.
  Nothing downstream is re-typed, and the contrast assertions that hold the
  vocabulary together keep holding across the move.
- **The naming rules are enforced where they can be, and only there.**
  `lib/tokenDiscipline.test.ts` keeps source off the primitive ramps,
  `styles/theme.shape.test.ts` refuses a registry entry that reaches below the
  semantic layer, and `lib/palette.test.ts` measures the contrast rather than
  trusting a step number. Nothing enforces "brand is not a hue" — a `brand`
  family added to `colors.css` would pass every guard in the tree, and this
  record is the whole of what stands against it.
- **Upstream moving is not by itself a reason to move.** Their OKLCH derivation
  landing beside a 2023 export is the case in point: the file changed and the
  judgement did not. Where they change, the question is which of the two it
  was.
- **A sixth divergence belongs here rather than in a commit message.** The list
  is the point; a divergence nobody wrote down is one somebody will "fix" back.
