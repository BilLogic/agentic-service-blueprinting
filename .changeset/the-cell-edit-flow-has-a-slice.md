---
'agentic-service-blueprinting': patch
---

**The cell-edit-with-revert flow has a CI slice, and the large-component-splits
decision's exit is per flow.** `src/slices/cellEditRevert.slice.test.tsx` edits
a cell from the real panel over the real cell-detail provider, saves through the one save and the real mutations,
reverts each change from the real change sheet through the real revert, and
reads the row back column for column over an in-memory table; CI runs it as
`npm run slice:cell-edit`. ADR 0017 now states that each held component's flow
needs its own slice and that each slice unblocks that component's split, marks
the cell-edit flow covered, and records why the slice runs against a fake
rather than standalone PostgREST.
