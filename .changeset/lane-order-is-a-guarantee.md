---
'agentic-service-blueprinting': patch
---

A step's frames follow lane position, and the order is a guarantee.

`useStepSpec` reads a step's storyboard frames through an embedded
`lanes(name, position, lane_role)` select and never sorted them, so the row the
step panel draws was in whatever order the query plan produced. Nothing looked
broken, because the rendered row and the image viewer's sibling group are built
from the same array and therefore agreed with each other — on an order nobody
chose. A step panel draws one frame per lane precisely so the same moment can be
compared across actors, and which actor is a position on the board; a new index
or a different server could have reordered it silently.

The frame assembly moves into `storyboardFramesFromCells`, a pure function that
sorts on a TOTAL key — position, then lane name, then the frame — so the result
is a function of the rows and not of their arrival. The sort runs before the
dedupe: paths share their imagery, so the surviving row decides which lane a
frame is captioned with, and that is now the first lane in the order rather than
the first row off the wire.

The sort is in the hook, not in the query, which is where this codebase already
puts it: `normalizeBlueprint` sorts the same embedded `lanes` by the same column
in JavaScript, the agent's scenario listing sorts its embedded scenarios the
same way, and no query in the tree orders an embedded resource. One convention,
followed rather than a second one introduced.

Every other reader of `lanes` was checked. The canvas and the agent's blueprint
reads share one select and both normalize, which sorts; the harness sorts in
JavaScript; the lane panel's sibling query returns a SET of rows to write to,
where order carries no meaning; and the blueprint dialog counts lanes. This was
the only gap.

The test is an invariant, not a fixture: over generated inputs, frames never
place a lower lane after a higher one, and every permutation of a row set
returns the same frames. A fixture was rejected because it is the shape that
would have passed the defect — rows written down in lane order are satisfied by
a function that returns its input untouched.
