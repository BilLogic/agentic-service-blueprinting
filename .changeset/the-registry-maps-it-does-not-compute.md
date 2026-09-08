---
'agentic-service-blueprinting': patch
---

The warning and destructive ramps are gone, and the shape that let them exist
is now checked rather than described.

Two roles carried a five-step ramp of raw HSL triples — `--warning-200`
through `--warning-600` and the same for `destructive` — declared in both
theme files and restated a third time inside the print block, so a reader
looking one up found three declarations of it. A sixth token,
`--destructive-default`, sat beside them: named for a POSITION on that ramp
rather than for a job, identical in both themes, and read by nothing at all.
The components that used to reach for these ask for a job now, so all thirty-
two declarations are deleted.

Ten more lines went with them, and those are the ones that could only be
removed here. `theme.css` registered every step into Tailwind's colour
namespace as `--color-warning-200: hsl(var(--warning-200))`, which is the
entire reason `bg-warning-200` and `border-destructive-400` were ever legal
classes. The hue primitive families stay: they are the right home for colour
that carries no meaning, and this template ships them neutral as its brand
seam. A ramp named for a ROLE is a different thing, and it was living in the
dial file as raw literals — two tiers below where a meaning belongs.

**Nothing renders differently.** The compiled stylesheet was built from the
tree before and after and diffed: three hunks, one per site that declared the
ramps, removing exactly those thirty-two declarations and no other byte. The
registrations produced no output to begin with — `@theme inline` emits no
custom property, it only tells Tailwind a name exists — and the compiled sheet
contained no `.bg-`, `.text-`, `.border-` or `.ring-{role}-{step}` selector
before the change either, because nothing was writing one.

## The guard, which is the part that lasts

Deleting the registrations fixes today and does nothing about tomorrow: the
next person can add them straight back. `src/styles/theme.shape.test.ts`
asserts the shape of EVERY colour entry in that file, so a registration added
next quarter is checked next quarter without the test changing and without it
knowing how many entries there are or what any of them is called.

A colour registration is one of exactly two things. It is a **namespace
declaration**, `--color-X: var(--color-X)` — self-referential on purpose, so
the name exists and its value resolves in `colors.css`; the hue families are
204 of these. Or it is an **indirection**, `--color-X: var(--Y)` where `--Y` is
a semantic token: one bare `var()`, no function wrapped round it, no fallback
arm, nothing beside it, and no declaration of `--Y` in the dial or primitive
layers. There are 99 of these. `hsl(var(--warning-200))` fails the first half
of that; `var(--warning-200)`, which is what unwrapping it by hand produces,
fails the second. Both halves are needed, because the second shape is what a
plausible repair looks like.

The rule reads the token model rather than opening the stylesheet, which the
decision that one token model is the single style seam already asks of any new
rule — and which matters concretely here, since two declarations in this file
wrap across lines and a per-line sweep cannot tell a declaration from the same
characters inside the paragraph above it.

Three cheaper rules are recorded in the header so the next person does not
re-derive them. A list of forbidden names is a census: true of the ten lines
that prompted it, silent about the eleventh. "No `hsl(` on the right" catches
the exact wreckage and nothing adjacent — `rgb(`, `oklch(`, `color-mix(` and a
bare hex literal all walk past.

The third is the interesting one, and it is a finding rather than a rejected
sketch. "No numeric suffix on the left" was the form the rule was first
proposed in, and 204 legitimate entries carry one — every step of every hue
family — so the rule as stated would condemn the layer it was written to
protect. The number was never what was wrong. `--color-amber-100` is a
position on a ramp and is supposed to be; what was wrong with
`--color-warning-200` is that a ROLE is a meaning, and a meaning has jobs
rather than positions. The five chart-series keys settle it: numbered, not
self-referential, flagged by a digit rule, and entirely correct — their number
is a series identity, they point at semantic tokens, and they compute nothing.
Asking about reach and shape instead of digits covers all of it with no
exception list at all.

What the rule does not claim is stated in its header rather than hidden. The
subject is the colour namespaces; the radius ladder's `calc()` rungs are
a real derivation it is meant to have, and the literal measures beside them
are a different question. A colour namespace not containing the word
`color` — Tailwind's `--fill-*` and `--stroke-*` — is outside the pattern; this
file registers none today.

A deployment that has forked this template carries the same declarations in
its own theme files and print block. They are unread there too, and they go
when it takes this change.
