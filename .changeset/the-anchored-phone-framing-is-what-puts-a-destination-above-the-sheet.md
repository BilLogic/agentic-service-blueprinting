---
'agentic-service-blueprinting': patch
---

The anchored phone framing is what puts a destination above the sheet, not the
sheet's measured height. The previous release said an agent-driven jump "tells
the camera what the sheet covers so the destination lands in the visible
strip". The camera is told, and on the ordinary phone destination that number
frames nothing: the canvas floors its fit zoom, so a scenario board wider and
taller than the screen is framed from its top-left, and an axis the floor
pushed off screen solves for the TOP inset alone. The board is above the sheet
because it is anchored there, and it still runs on behind the panel.

The framing is right and is kept — a board taller than the strip the sheet
leaves has no framing that keeps both of its edges, and the edge worth keeping
is the one the board begins at; buying bottom clearance would push that
beginning under the phone's own top bar to gain room at an edge already
hundreds of pixels off screen. So this corrects the story rather than the
geometry, where a reader meets it: the shell's note on the measured height,
the agent-jump slice's header and assertion comments, the render walk's prose,
and the end-to-end-round record.

What the occluded height does frame is now pinned at the phone's own floor,
either side of the line it draws: a board that fits the strip vertically is
centred INSIDE the strip — without the inset that board lands behind the sheet
entirely — and a board that does not is anchored, with the same framing
whether the sheet's height or 0 is supplied. The gap those cases close is that
the slice could only ever assert the height REACHED the fit, which is true and
is not a framing; read as one claim, it let a value with no effect on this
surface pass two review axes, a browser verification and a render walk.

**Upgrading a deployment:** nothing to change. No behaviour moved — the
release above is what the app does, described correctly.
