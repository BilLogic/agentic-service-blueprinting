---
'agentic-service-blueprinting': patch
---

The step panel's lane frames now open, and step to one another in lane order.

A step panel draws one frame per lane — the same moment as each actor saw it,
side by side in a row that exists to be compared. Until now that row was the
one place in the app where the pictures were smallest and the least openable:
each frame is 128px wide at 4:3, which is enough to see that a screen has
something written on it and not enough to read a word of it. The image viewer
had already been wired to the cover figures, the featured resources, the
storyboard detail stack and the cell panel's screenshots; this row was the
motivating case for the whole feature and was the one still left inert.

Click a frame and it fills the screen, fit to the viewport, with the same
gestures every other openable image has. From there the arrow keys, the two
on-screen buttons or a horizontal swipe walk along the row — the same moment,
the next actor — and the counter says which of how many. Each step returns to
fit, so no lane arrives already scrolled to a corner of the last one, and
stepping wraps at both ends because a row of three actors is something a
reader cycles rather than traverses.

The row is handed to the viewer as an ordered array plus the index of the
frame that was clicked. It is not discovered by scanning the container, and
the distinction is the point of this change rather than an implementation
detail: the order of these frames is lane order, and lane order is what makes
stepping mean anything. A scan would reproduce it today and only by accident,
until the day a wrapper element or a CSS reorder quietly rearranged it and the
viewer went on claiming to walk the lanes.

Each frame's accessible name is its lane's, the caption already printed under
it. No field was added to any record to supply one: a frame carries no caption
anywhere in the schema, and what the picture shows is the moment the panel's
summary already describes — the lane only says whose view of it this is.
