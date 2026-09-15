---
'agentic-service-blueprinting': patch
---

The storyboard walkthrough shows moments, not logos: touchpoint lanes leave its roster

Open a storyboard cell and the side panel stacks one frame per walkthrough lane
for that step; the canvas draws the same frames as the step's strip. The roster
was every lane that is not a storyboard row, and it takes any cell in the step
carrying a non-empty frame. Since a cell's featured image became its frame, and
placing a touchpoint fills an empty frame with that touchpoint's icon, every
placed touchpoint cell carries its logo as a frame — so a LinkedIn or a Figma
mark appeared in the stack and in the strip as though somebody had drawn it for
that moment. The slice slide never did this: it collects frames from the
slice's own cells and the storyboard cell, and nothing else.

What a person sees change: the logos leave the storyboard stack and the canvas
strip, and the walkthrough deck steps through the actors' frames alone. A step
whose only framed cells are touchpoints now reports no walkthrough cells, so it
offers no walkthrough rather than a deck of icons.

The touchpoint roles are left out where the roster is decided — one function,
which the stack, the strip, the deck and the "has this step walkthrough cells"
test all read — so the four agree by construction rather than by four matching
edits. A deployment that pins its own roster by lane name is untouched: naming
a lane is the decision, and a pinned list still gets exactly what it names.

No cell data is written or cleared. The cell panel still draws a touchpoint
cell's frame at logo size, which is where a logo belongs.
