---
'agentic-service-blueprinting': patch
---

The phone jump's legibility check reads the words, not the cell that holds
them.

**What was happening to a deployment.** The render walk's phone case ends by
counting cells of the destination board that are "wholly on screen above the
sheet", and it counted with each cell's bounding box. A cell's box is not the
words in it: it carries the cell's padding and the height of the row it sits
in, and both of those are properties of the BOARD. So a deployment whose first
row is a shade taller than this template's — a longer step title, a little more
padding, a theme with roomier rows — scored zero cells and went red on a walk
that was telling the truth. The destination had rendered above the sheet, a
strip-full of it rather than a sliver, the screenshot showed a board a person
could read, and the earlier assertions in the same block passed. Only the last
count failed, and it failed by a dozen pixels of padding.

**What it does now.** Each cell's text is measured directly — the union of the
rendered text's client rects — and the existing containment test is applied to
that. The rect union is taken over the cell's contents rather than off a known
element, so it does not care how a given cell is built, and cells differ.

The protection the check was tightened for is kept exactly. Text carried off
the side of the screen still fails it, because words go off the edge with the
cell that holds them; text that lands below the sheet still fails it. Both were
watched failing before this shipped. What is dropped is the part that was never
about the camera at all — the row height and the padding, which belong to the
board the walk was pointed at rather than to the framing the walk is judging.

**If you run the walk against your own board,** this is the case that may have
been red for you without a defect behind it. Nothing else in the walk changes,
and a board that passed before passes now.
