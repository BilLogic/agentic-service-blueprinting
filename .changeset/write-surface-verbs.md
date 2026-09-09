---
'agentic-service-blueprinting': patch
---

The write surface asks about every verb the app uses, not only UPDATE

`PANEL_WRITE_SURFACE` was widened last release from eight tables to fourteen, and
the widening exposed the same hole in the other axis. The surface asserted the
UPDATE path and only that: `check:seed-load` asked a real database for an UPDATE
grant and an UPDATE policy per entry, while the app also inserted into and
deleted from `evidence`, `slices`, `slides`, `stakeholders` and `audit_findings`.
So `evidence` was "on the surface" with two of its three write verbs unchecked —
one verb wide instead of one table wide. The file stated the limit rather than
implying coverage it did not have, which is how it was found, but a stated limit
is still a deployment that can revoke INSERT and keep every gate green until an
author presses a button and gets a refusal the interface cannot explain.

Each entry now carries the verbs its writers actually use, and each verb is asked
for twice: the grant, and an RLS policy for that command admitting
`authenticated`. UPDATE keeps its column list, because the deployment really does
grant it column by column and `has_column_privilege` is what checks that
granularity. INSERT and DELETE are asked table-wide, because that is how the
recipe grants them and a column list for them would be precision the grants do
not have. The check went from 47 grants and 14 policies to 58 and 23; the failure
messages say what each one costs an author, which for a missing DELETE policy is
a row that reappears on the next read rather than an error anyone sees.

The verbs are derived, not declared. The scan that finds the tables had to read
the verb to find them at all — `.from('evidence')` is not a write until something
downstream says `.delete(` — so `writtenVerbsByTable` hands them back from the
same walk of `src/`, and an insert added to a module that already updates is
covered the moment it is written. A hand-kept list is what produced the original
defect, and adding a second one for verbs would have reproduced it. That leaves
exactly one verb claim still made by hand: the column list is an UPDATE claim, so
the surface test now fails an entry that lists columns for a table nothing
updates, and one the app updates that names no columns at all.

The verbs come off the scan already shared with the write-boundary contract, so
there is still one parser of the subject and not two.
