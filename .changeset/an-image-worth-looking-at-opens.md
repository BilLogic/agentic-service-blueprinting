---
'agentic-service-blueprinting': patch
---

Any image worth looking at now opens, and once open it behaves like an image
viewer.

An image in this app used to be either too small to read or not openable at
all. A cover figure authored at 880px is shrunk to the prose measure, so the
labels inside it are legible in the source file and not on the page. A
storyboard frame in a detail stack is a picture of a real screen at a size
where a reader can see that something is written on it without being able to
read a word. A screenshot attached to a cell rendered at whatever the panel's
column allowed, and a featured attachment — the one picture a placement chose
to lead with — got a thumbnail and no way past it.

Click any of them and the image fills the screen, fit to the viewport. From
there the wheel or a trackpad pinch zooms toward the cursor, a click toggles
between fit and the stop above it, and dragging pans once past fit. On a
phone, pinch and drag do the same work. The cursor says which of those is
available, so the gestures do not have to be found by accident. Closing is
unambiguous and never a dead end: click the surrounding margin, press Escape,
or use the corner button that stays visible at every scale. A click on the
image itself never closes, because the image is now the thing being operated.

Where a picture has siblings — the row of lane frames in a storyboard stack,
several screenshots on one cell — the viewer steps between them with the
arrow keys, on-screen buttons, or a horizontal swipe, and a counter says which
one of how many is showing. Each step returns to fit, so no sibling arrives
already scrolled to a corner of the last one.

Two pictures deliberately stay shut. Logos and logomarks are iconography
rather than content, and a brand mark that opened fullscreen would teach the
reader that the openable affordance is decoration. The storyboard's horizontal
layout is only ever drawn inside the walkthrough deck, which already binds the
arrow keys and Escape on the window — a viewer inside it would fight the deck
for all three. Those frames open in the vertical stack instead, so nothing
becomes unviewable.

Nothing about the data model moves. A frame has no caption anywhere in the
schema and did not get one for the sake of a label: an opened cell screenshot
is named by the cell's own content sentence, which is what the picture shows.
