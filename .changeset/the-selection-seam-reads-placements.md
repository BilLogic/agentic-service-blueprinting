---
'agentic-service-blueprinting': patch
---

The selection seam reads a cell, not a string.

`getTouchpointItems` took a cell's `content` and split it, so the touchpoint
names the board drew were whatever the grid's text happened to say. That is
one of the two sources a cell has, and since placements became rows it is the
weaker one: a NAME-ONLY placement (#112) names its touchpoint by name alone,
because the registry has no entry for it, and nothing obliges the cell's text
to repeat that name. Split the text and the placement is not merely undrawn —
it is unreachable, because the same list is what the panel and the touchpoint
picker select from. `getTouchpointNames` replaces it and takes the cell:
placements where the cell has them, the text where it does not.

All five call sites had the cell in hand already — `blueprintCellConnections`,
twice in `blueprintStepTech`, and the slot-cell branch of `CompareCellBlock` —
save one, the branch of `CompareCellBlock` that has only a bare `content`
string, which passes `{ content }` and gets the old reading, correctly: a
compare slot's face is assembled from text and there are no placements there
to prefer.

The text fallback is therefore not dead code and is asserted as behaviour, not
tolerated as a leftover. The hand-written fixture boards and the compare slots
hand these readers a cell that never went through the normalizer, and
splitting the text is what those sources mean.

`getMaxTouchpointCountInLane` moves with it. The row height a touchpoint lane
reserves is a count of the same list, and leaving it reading the text alone
would have drawn each name-only face into a row with no space for it — the
count and the list have to agree or the fix is a clipping bug. It now counts
placements where a cell has them and the text where it does not, which is the
reading `getTouchpointNames` does.

Whether a name IS a name-only placement is still `isNameOnlyPlacement` in
`cellTouchpoints.ts`, and deliberately stays there. That predicate reads the
row as well as the registry link, so a fallback placement — no row and no
registry — is not mistaken for one; a second predicate keyed on the registry
link alone would disagree with it on every fixture board.
