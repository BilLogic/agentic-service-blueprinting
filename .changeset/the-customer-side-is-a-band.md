---
'agentic-service-blueprinting': patch
---

The line of interaction is drawn once per board rather than once per
customer-side lane, and the three readers that decide height and tone from it
are handed the board so they answer the question the renderer answers.

The rule was `getLaneRole(lane) === CUSTOMER_ACTIONS_ROLE` and nothing else,
which is right for exactly as long as every board has one customer-side lane.
Give a board a second actor row on the customer's own side and it draws a line
of interaction after each of them. No service blueprint means two: the line is
the boundary between the people the service is for and the machinery that
serves them, and a boundary drawn twice is not a boundary. So the line follows
the LAST customer-side lane. Adding a customer-side lane extends the band; it
does not divide the board again, and no row has to move to make that true.

WITHOUT THE BOARD, THE OLD ANSWER. `lanes` is optional, and a lane asked alone
has no band to be last in, so it is its own band and answers as it always did.
That is the same shape `shouldShowVisibilityLineAfter` already has, for the
same reason, and it is what keeps a caller that genuinely has only a lane
correct. It is also what made the three call sites below silent: each kept the
old rule while the renderer had already moved to the new one, and nothing
failed, because nothing disagreed until a second customer-side lane existed.

TWO OF THE THREE ARE READ AS HEIGHT. `countBlueprintDividerRows` is multiplied
by the divider row constant and `countBlueprintWrapCorridorMargins` by the
corridor margin, and both are added to the artboard, so a count that disagrees
with what the renderer draws is a grid taller than its own contents by exactly
the rows it over-counted — a divider row and a corridor of space reserved for a
line and a gap nobody paints. The corridor counter was point-free —
`lanes.filter(laneHasWrapCorridorBelow)` — so adding a parameter would have
passed the array index as the board, silently, which is why it is spelled out
now rather than left to read tidily.

THE THIRD IS RENDERED, NOT COUNTED. `laneHasWrapCorridorBelow` reaches a lane
row's real bottom margin through the compare row spec, so a lane in the middle
of the band opened a routing corridor beneath a row with no line beneath it to
route to. Its own doc said why the corridor exists — the standard blueprint
already leaves a band between the row and the line of interaction — which under
the band rule is true of the last customer-side lane and no other.

AND A LANE IN THE BAND WAS LETTERED AS IF BELOW THE LINE.
`getBlueprintLabelSection` searched for the FIRST lane the line follows, so a
row still inside the band got the tone of the zone under the line while being
drawn above it — painted, to a reader, on the far side of a boundary they can
plainly see it is above. A section is a position relative to the lines, so it
has to find the lines where they are actually drawn.

WHAT A BOARD DRAWS. With one customer-side lane, nothing moves: same line in
the same place, same corridor under the same row, same tone on every row, same
artboard height. With two, one line after the second of them, one corridor
under that same row, both customer-side rows lettered as sitting above the
line, and the artboard exactly one lane row taller — not a lane row plus a
divider row plus a corridor.

TEN CASES ARRIVE, and this repository had none on any of these rules. They
state a position relative to the line, or an equality between what is counted
and what the board draws — never a count of the boards whose customer side is
deep, which would pass on the day it was written and say nothing about the
rule. The corridor assertion is made against the rail's own interaction row
rather than a lane index, because those two are the same fact and the defect
was that they could disagree. Each of the six hunks was reverted in turn and at
least one case failed for each.

`src/lib/blueprintLayout.ts` and `src/lib/sideBySideCompareLayout.ts` are
enrolled in the deployment's reconciled-files list and were byte-identical to
its copies; they are byte-identical again, so that gate can go green on the
next pin bump. `src/lib/blueprintTheme.ts` is not enrolled and has drifted on
its content-shaped tables, so the one call it makes was ported by hand.
