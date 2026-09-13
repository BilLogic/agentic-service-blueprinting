---
'agentic-service-blueprinting': patch
---

**The service, phase and scenario bars above the canvas now hold their name
and summary inside the bar.**

The bar was shorter than the two lines it carries, so the summary sat on the
bar's bottom border and over the canvas. The bar is now tall enough for both
lines, with the same room above and below them, and the space is still held
before the summary loads, so nothing jumps.

A long summary now stops at the edge of its column with an ellipsis instead
of running under the controls on the right and off the screen; hovering it
still shows the full text. A long name keeps to one line the same way.

The name now starts on the same left edge as the summary under it, and the
loading placeholder lines up with both. The highlight behind the name on
hover is unchanged.
