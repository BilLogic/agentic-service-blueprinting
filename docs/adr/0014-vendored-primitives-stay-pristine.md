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

The obvious alternative is to edit the vendored file, because it is right there
and the change is small. It is rejected, and the reason is not tidiness: the
vendored directory is *generated*. `npx shadcn add <name>` overwrites it from the
registry, and an edit made in place leaves no patch file, no diff record and no
note in `components.json` — so the next re-vendor deletes the change silently, and
the surface that depended on it breaks somewhere else. One local helper imported
into a vendored `button.tsx` is enough to turn a routine upgrade into a
regression nobody attributes to the upgrade.

Two habits follow, and they are the whole discipline. Product behaviour lives one
layer up, in a wrapper that the generator never touches. Where a divergence in the
vendored file is genuinely unavoidable, it carries a header comment naming the
reason, so a re-vendor is a merge with a question attached rather than a surprise.
A codebase that composes primitives directly accumulates raw primitive utilities
at every call site; one that composes a pattern layer accumulates them in the
pattern layer, where they can be counted and changed at once.

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
