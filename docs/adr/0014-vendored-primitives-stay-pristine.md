---
summary: The vendored ui/ layer keeps its upstream timings and idioms, because the shadcn CLI regenerates it.
---

# 14. Vendored primitives stay pristine; product composition lives in `blueprint/`

**Status** Accepted — 2026-08-25. Moved into this repository from
BilLogic/plus-uno-blueprint ADR 0003 on 2026-09-10 (#551); the number
here is this repository's.
**Context** `src/components/ui/`, `src/components/blueprint/`, `AGENTS.md`

## Context

`src/components/ui/` is vendored shadcn (base-ui flavour) and is not a place we
write product code. Anything a product surface needs that a primitive does not
give it is built as a wrapper in `src/components/blueprint/`, and any divergence
from the vendored source that is genuinely unavoidable carries a header comment
naming the reason, so a re-vendor is a merge rather than a surprise.

## Considered Options

The obvious alternative — edit the vendored file, because it is right there and
the change is small — is what upstream Supabase does, and it is the reason we are
writing this down. Measured on `supabase/supabase` @ master (2026-08-22): **35 of
51** files in `packages/ui/src/components/shadcn/ui/` carry Supabase-specific
tokens or helpers, with no patch file, no diff record, and no note in
`components.json`. Their `button.tsx` imports a local `getExplicitTabIndex` helper;
re-running `npx shadcn add button` would silently delete it. They built the right
layer — `packages/ui-patterns/` as a separate package — and then forked the layer
below it anyway.

The payoff for holding the boundary is visible in their own numbers: their pattern
layer runs roughly 340 semantic-token classes against 11 raw primitive-colour
utilities, while `apps/studio`, which composes primitives directly, runs 143 raw
primitive-colour occurrences across 64 files. The discipline lives in the layer.

## Consequences

Our own vendor diff (2026-08-22, `shadcn@4.13.0` against the `base-nova` registry,
33 of 34 components baselined) found 69 hunks: 23 reverts, 41 justified
divergences, 5 undecided. The justified ones are, unusually, already commented —
that is the standard to hold, not an accident to preserve.

Two consequences follow. A divergence with no stated reason is a defect, not a
style: it gets reverted. And a product need that cannot be met by wrapping is a
signal to add the primitive properly via the shadcn CLI, never to hand-roll a
lookalike or edit the vendored file — which is the rule `AGENTS.md` already states
and this ADR now explains.

Wrappers follow upstream's type convention, which is the one thing their pattern
layer gets straightforwardly right:

```ts
Omit<React.ComponentPropsWithoutRef<typeof Primitive>, keyof OwnProps | 'children' | 'variant'> & OwnProps
```

It makes "this wrapper now owns `variant`" a compile-time fact rather than a
comment, and `React.ComponentProps<typeof X>['size']` passes a primitive's union
through without restating it. Applied to new wrappers; retrofitted only where a
wrapper is being touched anyway.
