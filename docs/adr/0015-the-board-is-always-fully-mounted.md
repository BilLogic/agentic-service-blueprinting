---
summary: Every phase, scenario, cell and arrow stays mounted and dims rather than unmounting, which buys instant navigation and one layout and spends a decoded-memory budget.
---

# 15. The board is always fully mounted

**Status** Accepted — 2026-08-25. Moved into this repository from
BilLogic/plus-uno-blueprint ADR 0004 on 2026-09-10 (#551); the number
here is this repository's.
**Context** `src/components/EditorErrorBoundary.tsx`,
`src/components/mobile/MobileShell.tsx`,
[ADR 0010](./0010-open-views-stay-mounted.md)

## Context

Every phase, scenario, cell and arrow is in the DOM at all times. Focusing a
scenario **dims** its neighbours; it does not unmount them. Navigation is a
camera move over a tree that was already there.

What that buys is worth naming, because it is the reason the trade is accepted:
navigation is instant and cannot flash; there is exactly one layout pass, so a
phase row's shared height is measurable rather than guessed; arrows can be drawn
between cells in different scenarios without a virtualiser's coordinate
translation; and the agent's `focus_cell` can be honest about whether a cell is
on screen, because the cell exists whether or not it is visible.

## Consequences

**It sets a memory budget, and the budget is denominated in decoded pixels, not
file size.** An image decodes to `width × height × 4 bytes` regardless of how
well it compresses. The lesson that set the rule (commit `5911a95`): ~450×700px
step-visual sources across 141 mounted images meant **325 MB of decoded RGBA** —
fine on desktop, an OOM tab-kill on mobile Chrome.

The operating rules that follow live in this record, because this repository
has no separate codebase-guide to point at: the 300px longest-edge cap,
`loading="lazy"` plus `decoding="async"` on every canvas `<img>`, and
estimating decoded memory at full board scale before adding any always-mounted
asset class.

**A true OOM still kills the tab.** `EditorErrorBoundary` catches recoverable
throws and renders a designed reload surface, but it cannot catch that. The cap
is the real fix; the boundary is the consolation.

**The obvious alternative is virtualisation, and it is specifically rejected**
for this surface. It would reintroduce the flash, break cross-scenario arrow
geometry, and make the shared row height unmeasurable. A future reader who
"fixes" the memory ceiling by windowing the board is trading four properties for
one. Cap the assets instead.

The phone does not relax this; it **narrows the scope** instead, rendering one
scenario rather than the whole service. Rendering the whole board is what used
to jam the main thread there. See `src/components/mobile/MobileShell.tsx`.
