---
'agentic-service-blueprinting': minor
---

The rail axis is one width.

The label rail was 208 wide, and "LINE OF INTERNAL INTERACTION" — the longest
canonical divider caption — does not fit in 208 at `text-2xs`. It is
`shrink-0`, so it neither wrapped nor truncated: it ran out of the painted rail
and the only thing left between those words and the path outline was the gap to
the board. That gap was then sized to hold text rather than geometry, and every
value that made the lane label look right put the caption on the outline. The
rail is 214 now, which is what the caption needs, and the gap has a name of its
own — `COMPARE_RAIL_GUTTER`, 8 — with `COMPARE_LABEL_TRACK_WIDTH` naming the
grid track the two make together, wider than the rail it paints. The horizontal
inset inside a path outline is `COMPARE_PATH_SECTION_H_INSET`, 16, split from
the top and bottom pair it used to share a constant with;
`COMPARE_PATH_SECTION_INSET` stays as a deprecated alias so nothing has to move
at once. `railRhythmContract.test.ts` pins the result: 30px from the lane label
to the outline, 30px from the outline to the first cell, and the caption
clearing the outline by the same 30.
