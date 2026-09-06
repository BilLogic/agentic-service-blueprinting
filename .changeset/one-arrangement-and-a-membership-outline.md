---
"agentic-service-blueprinting": minor
---

One arrangement, one membership drawing, one cell face.

**Components removed.** `SideBySideCompareGrid`, `CompareDivergenceStrip` and
`CompareZoneBadge` are deleted. A fork that imports any of them, or that
renders `ScenarioBlueprintPanel` with `fixedSwimlaneBodyHeight`, or that hands
`ResizableComparePanel` a `chromeBar` / `chromeBarHeight`, has a compile error
to fix rather than a silent behaviour change.

**A scenario is one board, drawn at two sizes.** The overview used to lay each
path out in its own narrow grid beside its siblings, and opening the scenario
re-laid the same paths out as bands on one step axis. Now a tile is the board
smaller: navigation changes framing, not topology. The swimlane-body height
model existed only to make those two pictures agree inside a locked-height
tile, so `expandRowSpecsToSwimlaneBodyHeight` goes with them and a phase row
aligns on one panel height.

**Merged membership reads in full.** A cell's member paths were marked with a
colour wash and an invented two-letter code, which collided whenever two path
names began with the same letter. They are a thin rounded outline on the
cell's own face now — one arc per member path — with the full names disclosed
on hover and on keyboard focus. `getPathWashStyle` is removed from
`pathColorTheme`; `CompareCellPathRail` is now `CompareCellPathMembership` and
has no `label`.

**A cell face is a fixed size, and it shows its status.** Narrative cells no
longer measure their own text to size themselves and their lane:
`NARRATIVE_CELL_HEIGHT` is the canvas face and the complete prose lives in the
detail panel. `TOUCHPOINT_ITEM_HEIGHT` grows to 52 / 42 so two label lines
fit, storyboard rows to 176 / 168; `getTextBlockMinHeight` and
`getMaxLineCountInLane` are deleted. A cell's `status` is threaded through the
path band and the compare block, so an unbuilt cell stops rendering as a
shipped one.

**One name change a fork will see.** `isSupportHandoffLane` no longer falls
back to the lane labels `Support Actions` and `Tech Support Actions` when a
lane carries no role. A board whose lanes have roles is unaffected; a board
relying on those two English labels should give those lanes the
`support_actions` role, or add the mapping to `LEGACY_NAME_TO_ROLE`, which is
the one declared place a name stands in for a role. `BLUEPRINT_INSERT_HIT_HALF`
is now exported from `blueprintLayout` rather than declared privately in each
of the two handle components.
