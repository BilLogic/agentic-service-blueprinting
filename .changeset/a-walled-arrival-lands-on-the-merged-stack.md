---
'agentic-service-blueprinting': patch
---

A connector arriving at a walled cell on the merged canvas lands on its slot's
outer edge, so no arrow in the catalog ends by travelling backward.

An arriving end turns back into its card vertically where there is room, and
falls back to a side entry where there is not — and a side entry out of the
right gutter draws its last stub leftward. The markers are `orient="auto"`, so
the head follows that stub and points backward along a grid whose one ordering
claim is that time runs left to right.

Six connectors in the golden geometry catalog still ended that way, all of them
in the merged view: a backward loop within a lane, an upward cross-lane run,
both runs of a cell that is a target and a source at once, and both links of an
A→B→C chain. What walled them was the merged canvas's own shape — a slot there
stacks one sub-cell per path, and a sub-cell sits hard against its neighbour's
edge, far too close for a head to turn in between them.

The stack is one slot, though: every sub-cell in it shares a lane and a step
column, and the stack as a whole still has a free top and a free bottom. So an
arriving end now measures its horizontal edges from the stack rather than from
the card, and a head landing on the stack's outer edge names the lane and the
column its target does. A departing end still leaves its own card's edge — it
carries no head, and a line that appeared to start at a neighbour's edge would
misname its source. A cell with no stacked neighbours reports its own box, so
every route outside the merged view is untouched, point for point.

The catalog now asserts this as an invariant over every situation and every
view mode rather than over the six that were known, and pins the number of runs
each mode draws, so a head cannot be straightened by dropping the arrow.

The merged fixture was also wrong about the canvas it models. It stacked
sub-cells without re-spacing the lanes, which overlapped one lane's sub-cell
with the next lane's card — two cards sharing the same pixels, which the merged
grid's `minmax(_, auto)` row tracks cannot produce. The packed column that came
out of that left an arriving head nowhere at all to land. Lanes are re-spaced
now, each keeping the gap it had. The single and side-by-side renderings are
byte-identical.
