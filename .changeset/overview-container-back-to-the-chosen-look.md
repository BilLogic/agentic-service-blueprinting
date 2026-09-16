---
'agentic-service-blueprinting': patch
---

The overview's phase container looks as it did at v1.44.17 again: the viewport
ground, the phase frame and its edge, the scenario panel and its edge, the
panel interior, the label rail and both title badges are back to the colours
the owner chose, in every state — at rest, on hover, on focus-within and under
the focus dim, in light and in dark. The two rounds since moved those states
onto the elevation ladder; the ladder is coherent and the board was worse, so
the look is pinned rather than derived.

A deployment retunes a layer through `--background-blueprint-canvas-ground`,
`--background-blueprint-phase-frame`, `--background-blueprint-scenario-panel`
and `--background-blueprint-panel-interior`, declared once in
`blueprint.css`, plus `--background-blueprint-panel-label-rail` for the rail.
