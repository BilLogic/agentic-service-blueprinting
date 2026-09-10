---
'agentic-service-blueprinting': minor
---

A slide's illustration says what it replaces.

Setting `slides.illustration` drops the frames of the cells the slide cites —
`SlicePresentation` empties the strip rather than appending to it. That is the
behaviour authors want: one drawn image instead of three fragments. It was
just silent. The empty state never mentioned the frames the slide was already
showing, and the set state never mentioned the frames it had stopped showing,
so a slide could differ from its own cells with nothing reporting it — against
the glossary's own promise that a slide and the board cannot disagree.

The field is now a segmented pair — the cells' frames, or one illustration —
in the idiom the phase header already uses. Whichever is off stays on screen:
the strip is the default in one state and the dimmed receipt in the other,
captioned with the number of frames the illustration stands in for, counted
from the cells on every render rather than remembered.

A slide whose cells carry no frames now says so. It used to render a blank
stage and explain nothing.

The glossary sentence changes with it, to the promise the code can keep.
