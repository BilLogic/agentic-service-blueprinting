---
summary: Layout values the runtime does math on live in TypeScript, not CSS custom properties, because Math.min has no var().
---

# 13. TypeScript owns every layout number; CSS receives them

**Status** Accepted — 2026-08-25. Moved into this repository from
BilLogic/plus-uno-blueprint ADR 0002 on 2026-09-10 (#551); the number
here is this repository's.
**Context** `src/lib/blueprintLayout.ts`, `src/lib/canvasHeaderStyle.ts`,
`src/styles/theme.css`

## Context

Every layout number — slot insets, rail widths, gutters, panel widths — is declared
once in TypeScript as a number, and a component that needs it in CSS pushes it across
the boundary as a custom property on its own root element. CSS and class strings read
that variable; they never re-declare the value. We adopted this after a rail and a
cell slot hard-coded the same inset in two different files and disagreed, which cost
an afternoon on 2026-08-21; at the time the same kind of value was expressed three
ways — pixel constants in `blueprintLayout.ts`, Tailwind class strings in
`canvasHeaderStyle.ts`, and custom properties in `theme.css`.

This is upstream Supabase's own pattern: `SIDEBAR_WIDTH = '13rem'` lives in
`sidebar.tsx` and reaches CSS as `style={{ '--sidebar-width': SIDEBAR_WIDTH }}`.

## Consequences

The obvious alternative — CSS owning layout values, which is what most codebases do —
is specifically rejected, so a future reader who "fixes" this by moving widths back
into a stylesheet is reintroducing the bug. Contract tests that assert geometry from
the constants are then asserting the only copy, rather than comparing a constant to
itself.

The same shape has since been found in the mobile viewport boundary, declared three
times mechanically (`MOBILE_BREAKPOINT = 768` in vendored `use-mobile.ts`,
`MOBILE_SHELL_QUERY = '(max-width: 767px)'` in `useMobileShell.ts`, and Tailwind's
`md:` in 18 call sites) and once in prose. They agree only because 767 = 768 - 1.
Where the owning declaration is vendored, ours derives from it or a test pins them
together — reverting the vendored copy is not an option.
