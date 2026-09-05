---
'agentic-service-blueprinting': minor
---

The frame carries both axes.

A path outline is a frame around the path's own cells. It was drawn around the
lane-label rail as well, because the rail was just the grid's first column and
the frame spanned the whole band — so the row-axis labels, which name lanes the
whole scenario shares and belong to no single path, sat inside one path's box.
`ComparePathSectionFrame` takes `excludeLabelRail` now and starts after the
label track, offset by `COMPARE_LABEL_TRACK_WIDTH + STEP_COLUMN_GAP` on the
compare arrangements and by `LANE_COLUMN_WIDTH` on the service grid.

The frame carries the other axis at the same time. `extraTopInset` still
stretches it up past the step-header row, and the light band that tints that
row now takes its left edge from the frame's own inset rather than from the
horizontal constant — with both axes on, a band written against the constant
painted the header tint straight across the rail.

The rail converges with it. The caption and its rule are one row again, so the
line begins where the words end and runs `ruleOverhang` past the outline it
crosses (`COMPARE_DIVIDER_RULE_OVERHANG`, and the same formula rather than the
same number for the service grid). The lane label takes `BLUEPRINT_SLOT_INSET`
on both edges, the inset the cells it names already use, which is the rhythm
`railRhythmContract.test.ts` pinned and the rail did not yet keep. The rail's
right-hand hairline is gone — two vertical lines a few pixels apart described
one edge — and so is the second coat of rail colour on every lane row, which
under the canvas transform antialiased into a hairline rectangle around each of
them. `BlueprintStickyLabelBackdrop` paints that column, once.

A divider caption is an outlined block that says what its line separates, and
the path badge is a badge: no dismiss control, one cursor whether or not there
is a definition behind it, and the explanation on hover, focus and tap. The
scenario title's aside is `note`, which is what it is, rather than
`infoTooltip`, which is what it used to be shown in.
