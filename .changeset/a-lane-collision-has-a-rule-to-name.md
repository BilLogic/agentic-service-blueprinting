---
'agentic-service-blueprinting': minor
---

A lane collision has a rule to name, and the message that names it fires.

`src/lib/authoringErrors.ts` matched `lanes_path_row_unique` to say "Two lanes
ended up in the same position." Nothing has ever carried that name. The object
on those two columns was `lanes_path_row_idx`, a plain non-unique index created
by the template schema as `layers_path_row_idx` and carried through the
vocabulary renames — so the branch was dead text, and an author who put two
lanes in one slot met no refusal at all: the write succeeded and the board
showed two lanes fighting for one row.

**The rule.** `21000223000000` adds `lanes_path_position_unique` on
`(path_id, position)`, deferrable and initially deferred, and drops the
duplicate index the constraint's own index replaces. Deferred because both
write paths that move lanes collide mid-transaction on ordinary use:
`reorder_lanes` renumbers one statement per lane, and `add_lane` opens a slot
with a single self-colliding `UPDATE`. An immediate constraint would refuse
every drag of a lane. The migration proves both shapes, and the duplicate that
settles, on a fixture it rolls back.

**The message.** The matcher now names that constraint, so the sentence it was
written for reaches the author instead of the generic duplicate line.

**The guard.** `authoringErrors.test.ts` drives the database's own text through
the translator, and holds every identifier-shaped matcher in the table against
`supabase/generated/portable-core.schema.sql`. A matcher naming something the
schema does not create now fails a test rather than failing silently in front
of an author.
