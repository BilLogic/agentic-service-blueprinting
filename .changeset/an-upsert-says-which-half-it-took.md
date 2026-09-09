---
'agentic-service-blueprinting': patch
---

An upsert says which half it took, and its undo stops guessing

Undoing an agent's dependency write could delete an edge the author already
had. `set_cell_dependency` upserts: landing on a pair that is already connected
it updates that row and hands back its id — indistinguishable from the id it
returns when it inserts. The ledger derived this write's inverse from the
operation's NAME, and the name says "connected two cells", so the inverse it
recorded was a delete. On the insert half that is exact; on the update half the
undo destroyed an edge the write had only edited.

Only the agent tool reaches it. `create_cell_dependency` on a pair the
blueprint already connects is a bare upsert onto an existing row — a retry, a
re-run of a plan, a model connecting two cells it has connected already. The
panel's add form cannot: its validation refuses a duplicate before any call is
made. That makes it the worst shape of defect — a write made by a machine, in
a batch, on rows a person has often already read — and it compounds with how
the session sheet picks an undo's target, which is the newest entry carrying an
inverse, not the newest thing the person did.

`21000210000000` makes the write report what it did. `set_cell_dependency`
returns `{ id, inserted, previous }` instead of a bare id: `inserted` is read
from the written row's `xmax` inside the same statement, and `previous` is the
row as it stood, captured before the write and locked. The revert derivation
branches on it — a delete for an insert, and for an update
`restore_cell_dependency`, a new operation that puts the two prose columns back
on one row by id. It assigns rather than coalescing, which is the point: the
case the agent causes is an edge that had no note being given one, and an
inverse that cannot write a null cannot undo that.

The return type moves, so the function is dropped and recreated and its ACL is
restated — the core revokes the PUBLIC execute the recreate lands on, the
recipe half restores the anon revoke and the authenticated grant. An update
whose before-state did not come back (a concurrent insert between the capture
and the upsert) records no inverse at all, which is the ledger's existing way
of saying an undo cannot restore the prior state.

The other upsert in the derivation table, `upsert_cell`, is not affected: its
tool refuses an occupied slot, so the delete it derives is a true inverse. The
agent's reply now also says which half the dependency write took, so a model
told "set" after landing on an existing edge stops believing it made one.
