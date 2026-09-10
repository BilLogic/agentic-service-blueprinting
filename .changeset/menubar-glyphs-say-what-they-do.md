---
'agentic-service-blueprinting': minor
---

Three icon-only controls in the phase menubar now say what they do. Stacked,
Merged and the path selector each carried an `aria-label` and nothing else, so
a sighted reader hovering the glyph and a keyboard reader focusing it were both
told nothing. Each gains an `IconTooltip` with action copy, and the compare
toggle falls back to Stacked when a scenario has never been toggled, so the
control always points at a segment.
