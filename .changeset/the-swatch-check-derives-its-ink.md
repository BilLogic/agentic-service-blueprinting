---
'agentic-service-blueprinting': patch
---

The selected-swatch checkmark in the annotation toolbar was invisible in dark
mode. `isPaleAnnotationSwatch()` — `color !== ANNOTATION_INK` — picked a frozen
near-black for every swatch but one, while the fills are theme-flipping ramp
steps, so in dark the check measured 1.13–1.20:1 on the fill row and 1.33–1.72:1
on the sticky row. The one exception failed the other way: the Ink swatch took
the `text-white` branch onto a slate that flips near-white, 1.17:1. Light mode
failed too on the stroke row, at 2.50:1.

The button now carries `data-blueprint-fill` and derives its ink from its own
fill, the mechanism path badges and divider tags already use. A derivation
cannot be wrong for its fill, because it is a function of it — which is what
`annotationSwatchContrast.test.ts` has been measuring all along.
