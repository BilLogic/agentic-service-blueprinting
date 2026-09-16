---
'agentic-service-blueprinting': patch
---

Every overview colour has a name. Nothing renders differently — every resolved
colour, per theme, at rest and armed, is what it was — but the phase frame, the
title badges, the panel edges, the label rail, the divider band and the board's
own ink were still written as raw ramp steps inside rules and inside
`blueprintTheme.ts`. They are component names in the blueprint namespace now,
declared once at the root of `blueprint.css` with rest and hover for the same
piece side by side, and the rules and the theme module read the names. The
block says what it is: a look the owner chose, pinned, deliberately off the
elevation ladder.

A deployment retunes a piece by setting one name on a wrapper around the board:

- ground — `--background-blueprint-canvas-ground`
- phase frame — `--background-blueprint-phase-frame`, `-hover`,
  `--border-blueprint-phase-frame`, `-hover`
- phase badge — `--background-blueprint-phase-badge`, `-hover`,
  `--border-blueprint-phase-badge`, `-hover`, `--text-blueprint-phase-badge`
- scenario panel — `--background-blueprint-scenario-panel`, `-hover`,
  `--border-blueprint-scenario-panel`, `-hover`
- scenario badge — `--background-blueprint-scenario-badge`, `-hover`,
  `--border-blueprint-scenario-badge`, `-hover`,
  `--text-blueprint-scenario-badge`
- panel interior — `--background-blueprint-panel-interior`, `-hover`,
  `--border-blueprint-panel-interior`
- label rail — `--background-blueprint-label-rail`, `-hover`
- divider band — `--background-blueprint-divider-band`, `-hover`,
  `--background-blueprint-divider-badge`,
  `--text-blueprint-divider-caption`
- rules — `--border-blueprint-lane-divider`, `--border-blueprint-phase-divider`
- board ink — `--text-blueprint-cell`, `--text-blueprint-header`,
  `--stroke-blueprint-arrow`

The four `--background-blueprint-panel-*` override seams are unchanged and stay
undeclared at the root, because their fallback arm is the resting state.
