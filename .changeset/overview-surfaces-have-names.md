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

Two kinds of name, and they are used differently. The list below is DEFAULTS —
each is declared once at the root, and a deployment retunes a piece by setting
that name on a wrapper around the board. The four
`--background-blueprint-panel-*` names are SEAMS, which the app declares only
on an armed panel: a deployment sets one to paint that part of a panel's
interior, and its absence is what leaves the resting state in place.

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

The seams — `--background-blueprint-panel-label-rail`, `-panel-canvas`,
`-panel-section` and `-panel-divider` — are unchanged, and stay undeclared at
the root because their fallback arm is the resting state.
