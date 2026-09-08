---
'agentic-service-blueprinting': patch
---

The default deployment config inlines nothing, so a deployment forks one small
file instead of a large one.

`asbDefaultConfig` read its wordmark from a constant and omitted the accent
entirely, which meant an installation wanting either had to fork
`src/deploymentConfig.ts` — a module whose resolver, merge rules and reasoning
it has no quarrel with. `src/config.ts` now carries a `Brand` type and a `BRAND`
constant beside `ORG_NAME`, and the default reads `{ brand: { name: ORG_NAME,
accent: BRAND.accent }, content: { workspaceTitle: coverContent.title } }`. The
file to fork is the small one that already exists to be forked.

Nothing repaints. `coverContent.ts` omits `title` on purpose and `BRAND` ships
no accent — this kit's `--brand-*` ramp is greyscale, so there is no hue for one
to be — and both `present()` and `applyBrandAccent` treat an absent value as
nothing to say. The wordmark still resolves to `ORG_NAME`, which the rendered
navbar and the whole-app render both assert.

`applyBrandAccent` takes the shared `Brand` and defaults the block to `BRAND`,
so a host's bootstrap can set the dial before React exists. The module had no
test; it has one, and the first assertion is that this template writes no dial
at all.
