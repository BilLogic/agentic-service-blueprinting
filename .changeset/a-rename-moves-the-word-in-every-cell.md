---
'agentic-service-blueprinting': minor
---

A rename moves the word in every cell, and the registry gains its first writer.

The registry has been readable since `21000120000000` and writable in every way
but one: nothing could change what a touchpoint is CALLED. This adds the write,
and the reason it is a database function rather than a loop in the client is
the defect that comes with it.

`cells.content` is the list of names an author types, and a content save
re-derives placements from that text. Move the registry row alone and the next
edit to any affected cell hands `sync_cell_touchpoints` the stale name: the
renamed placement is not wanted, its registry link is taken away, and a fresh
entry appears under the old name in its stead. The rename undoes itself one
save later, which is the drift this package exists to end, arrived at from the
other direction.

`21000202000000` adds two functions. `rename_content_item(text, text, text)` is
`immutable` and pure: it tokenises a delimited content string, keeping the
delimiters, and replaces only the item that IS the old name — so renaming
`Zoom` leaves `Zoom Recording` untouched, and the author's spacing survives
verbatim. `rename_touchpoint(uuid, text)` moves the registry row and every
bearing cell's text in one transaction, decides WHICH cells from the placements
rather than from a text search, and refuses to finish if any bearing cell still
names the old value. It returns the previous name and the cells it rewrote, so
the caller can record an inverse that restores both halves. Both are
`security definer` behind `is_service_account()` and granted to
`authenticated` only, the same posture as every other placement function.

`src/lib/touchpointMutations.ts` is the client half, ported from a deployment
built on this template, where both halves have been live since 2026-08-30. It
carries `renameTouchpoint` and, for
the other scope of the same subject, `updateTouchpointPlacement` — what an
author has to say about a tool AT ONE CELL. That writer needs
`update (summary)` on `cell_touchpoints`, which `21000119000000` granted for
`role` and for nothing else; the grant lands in the same migration as the
writer, because a write surface with no writer is a row every posture check has
to account for before any mutation touches the column.
`cell_touchpoints_update_service_only` still stands over it, so this widens
which COLUMN an author may write and not who may write one.

The placement write UPDATES and can never insert, which is what keeps it from
routing around the touchpoint-bearing gate inside `sync_cell_touchpoints`, and
its inverse is captured as column values rather than as form strings, so an
undo can reach imported data an input validator would refuse.

`rename_touchpoint` and `update_touchpoint_placement` join `WriteFn`, and
`restore_touchpoint_placement` joins the revert. `touchpointRename.test.ts`
ports both functions into a model and opens with a RED case that drives it with
a registry-only rename, so the tests that follow cannot be passing against a
model unable to exhibit the bug.
