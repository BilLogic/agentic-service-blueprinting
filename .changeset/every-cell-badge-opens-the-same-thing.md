---
'agentic-service-blueprinting': patch
---

Every presentation cell pill opens its own cell.

Clicking any pill under a slide called the same handler with no argument, so
they all opened the slice tab and none of them the cell they named. Each pill
now leaves a pending focus for that cell, then opens the slice tab. The slice
viewport consumes the pending focus when it registers, because a slice tab's
address carries no cell.

**What you will see.** On a slide with two cited cells, the two pills open two
different cells in the slice. A pill's accessible name says it opens that cell
in the slice.

**What holds it.** `requestSliceCellFocus` stores the request when no viewport
is registered for the slice yet, and `registerFocusCells` flies when that
viewport appears. A component test clicks two pills and asserts two different
cell ids.
