---
'agentic-service-blueprinting': minor
---

A slide shows a SET of images, in an order somebody chose.

One choice was an exception dressed as a feature: an author with three
uploads could show exactly one of them, and an author who wanted a cited
cell's frame BESIDE their own drawing could not say so at all.

`slide_strip` is one row per member, each naming a cell's frame or one of the
slide's own images, ordered by `position`. A table rather than a jsonb array
for the reason the pair of columns existed: a member that names a cell needs
a real reference, so deleting the cell removes the member instead of leaving
an id that renders blank. NO ROWS is the default and stays it — the slide
shows the frames of the cells it cites, which is what most slides do.

`slides.illustrations` becomes `slides.images`. An illustration is a drawn
thing; half of what an author uploads is a screenshot, and a column that calls
a screenshot an illustration is the same defect as a lane that calls a slide
a frame.

In the editor the tiles are a fixed size whatever the count, the image opens
through the same `ZoomableImage` every other image in the app opens through,
and a tick — its own target, not the thumbnail — puts a member in the strip.

The glossary's Strip entry said "Not a column". A step's strip still never is;
a slide's may now be assembled, and the entry says so.
