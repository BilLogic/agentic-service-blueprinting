---
'agentic-service-blueprinting': patch
---

The storyboard walkthrough shows moments, not logos: touchpoint lanes leave its roster

Open a storyboard cell and the side panel stacks one frame per walkthrough lane
for that step; the canvas draws the same frames as the step's strip. The roster
was every lane that is not a storyboard row, and it took any cell in the step
carrying a non-empty frame. Since a cell's featured image became its frame, and
placing a touchpoint fills an empty frame with that touchpoint's icon, every
placed touchpoint cell carries its logo as a frame — so a product's own mark
appeared in the stack and in the strip as though somebody had drawn it for that
moment. The slice slide never did this: it collects frames from the slice's own
cells and the storyboard cell, and nothing else.

What a person sees change: the logos leave the storyboard stack and the canvas
strip, and the walkthrough deck steps through the actors' frames alone. A step
whose only framed cells are touchpoints now reports no walkthrough cells, so it
offers no walkthrough rather than a deck of icons.

Measured. On a step whose framed cells are one action cell and two touchpoint
cells: three strip entries before, one after — the action cell's. **And the
bundled sample does change**: across its two "Build a blueprint" paths the
strip falls from 8 entries to 2. The six that go are the three documentation
diagrams — `/cover/data-model-hierarchy.svg`, `/cover/blueprint-anatomy.svg`,
`/cover/four-ways-in.svg` — authored onto **References & guardrails**, a
`backstage_touchpoints` lane, in each path. They are drawn artwork sitting on a
touchpoint row, so three steps per path lose their strip, their stack and their
deck frames. Nothing else in the sample moves, and the walk over every phase,
scenario, path and layout stays free of console errors. Whether that artwork
belongs on an actor or storyboard row is an authoring question about the
sample's content, and this release does not answer it: no cell data is written
or cleared here.

The touchpoint roles are left out where the roster is decided — one function,
which the stack, the strip, the deck and the "has this step walkthrough cells"
test all read — so the four agree by construction rather than by four matching
edits. Which roles those are is now one `TOUCHPOINT_LANE_ROLES` in `laneRoles`
behind an `isTouchpointLaneRole` predicate, because it is a fact about what a
row means; the layout module's own touchpoint question reads the same
predicate.

A deployment that pins its own roster by lane name is untouched: naming a lane
is the decision, and a pinned list still gets exactly what it names. The cell
panel still draws a touchpoint cell's frame at logo size, which is where a logo
belongs.
