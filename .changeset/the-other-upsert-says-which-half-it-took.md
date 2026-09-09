---
'agentic-service-blueprinting': patch
---

The other upsert says which half it took, and its undo stops guessing

`upsert_cell` upserts. Landing on a square of the grid that already holds a
cell it updates that row and hands back its id — indistinguishable from the id
it returns when it inserts. The ledger derived this write's inverse from the
operation's NAME, so the inverse it recorded was `delete_cell`. On the insert
half that is exact; on the update half the undo would remove a cell the write
had only edited, taking its summary, Function, Form, Value props, owner pair
and status with it — none of which that write touched.

Nothing reaches the update half today, and that is the argument rather than a
reason to leave it. Both callers establish the square is empty first: the panel
calls `upsert_cell` only on a draft, when there is no cell id, and the agent
tool reads the slot and refuses with "A cell already exists at that slot".
That check is a read followed by a write — nothing holds the square between
them, so two agent turns on one board, or an agent and a person, can both see
an empty slot — and it is carried per caller, so the rule lives in prose in two
files rather than in the operation. The previous release said this function was
unaffected *because* of those guards; a guard standing between a caller and a
defect is not the same as the defect not being there.

`21000211000000` makes the write report what it did. `upsert_cell` returns
`{ id, inserted, previous }` instead of a bare id: `inserted` is read from the
written row's `xmax` inside the same statement, and `previous` is the cell as
it stood, captured before the write under a lock. The revert derivation
branches on it — a delete for an insert, and for an update
`restore_cell_content`, a new operation that puts one column back on one cell
by id.

One column, deliberately. The upsert's `on conflict` sets `content` and nothing
else; everything else in the row is either the conflict key or minted on the
insert half. The seven other fields a person types into a cell belong to
`update_cell_content` and `update_cell_spec`, which capture their own inverses,
and an undo that reached them would revert somebody else's edit. The restore
assigns rather than coalescing: `cells.content` is `not null default ''`, so
the state a coalescing inverse could not express is not null but empty — and a
blank draft an agent writes onto is the ordinary case here, not the corner.

The guards stay. Once the write reports for itself they are belt-and-braces
rather than the safety, and the agent tool's refusal is a better answer than a
silent update; the tool's reply now also says which half the write took. The
return type moves, so the function is dropped and recreated and its ACL is
restated — the core revokes the PUBLIC execute the recreate lands on, the
recipe half restores the anon revoke and the authenticated grant. An update
whose before-state did not come back (a concurrent insert between the capture
and the upsert) records no inverse at all, which is the ledger's existing way
of saying an undo cannot restore the prior state.
