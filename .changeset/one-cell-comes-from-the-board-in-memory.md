---
'agentic-service-blueprinting': minor
---

The cell panel reads its cell off the board instead of fetching it. The board
query now carries `cells.function`, `form`, `value_props`, `owner`,
`perceived_owner` and `steps.summary`, the normalizer maps them (and `position`,
which was selected and dropped), and `useBlueprintCell` hands a panel the cell
already in memory. `useCellSpec` and `useCellContent` are gone, and with them up
to two round-trips per cell on panel open and the skeletons they needed.
`cellSpecContract.test.ts` holds the select and the normalizer to each other.
