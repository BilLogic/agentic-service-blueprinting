---
'agentic-service-blueprinting': minor
---

Every authoring write now leaves a durable record, not only the deletes.

Deletes were remembered forever and everything else was remembered until the
tab closed: six `security definer` functions archived what they destroyed into
`public.deleted_structure`, and every rename, reorder, cell edit and slice
change lived only in a module-level array in `authoringSession.ts`.

`public.authoring_changes` replaces that split with one append-only log. The
client appends through a new `record_authoring_change` RPC; the six delete
functions append their own row, because a destroyed row's payload can only be
captured inside the transaction that destroys it. `public.trash` is a view over
the deletions in the log, in the shape `deleted_structure` had, so every reader
of the recovery list is unchanged except for the relation it names — and
`deleted_structure` is folded in and dropped.

The log is audit-only, and that is now a wall rather than a comment.
`executeRevert` accepts a branded `SessionEntry` that only `recordChange` can
mint, so a row read back out of the log cannot reach the inverse-applier —
it does not compile. `revertBoundaryContract.test.ts` holds the brand to its
one mint.

The portable-core generator learned about dropped tables: a recipe fragment
that enables row-level security or grants on a table the core later drops is
left out, the same way a column-scoped grant already follows a dropped column.
