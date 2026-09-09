---
'agentic-service-blueprinting': patch
---

The change list says which half an upsert took

`upsert_cell` and `set_cell_dependency` both upsert, and both were taught to
report which half they took so the ledger could stop deriving an inverse from
the operation's NAME. The sentence a person reads was left behind: the change
list still said "Added a cell" and "Connected two cells" over writes that had
edited an existing cell and an existing edge. It is the same mistake, in the
one place it is visible.

The entry carries no report of its own, so the describers read the derived
inverse, which is where the report survives — `delete_cell` and
`clear_cell_dependency` mean the insert half, `restore_cell_content` and
`restore_cell_dependency` mean the update half. An entry with no inverse is the
update half whose before-state did not come back, since an insert always
derives one, so the absence reads as an edit rather than falling back to the
create. Rows written before those two fixes all carry the old name-derived
`delete_cell`, so they still read as creates — that is what they recorded.

The update half's sentence is "Edited a connection" rather than a new synonym,
because that is what a deployment carrying `update_cell_dependency` already
calls the same event.
