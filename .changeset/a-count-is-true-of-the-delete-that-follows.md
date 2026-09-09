---
'agentic-service-blueprinting': patch
---

`deletion_impact` counts the delete that follows, for all four kinds

The confirm dialog's whole job is the number, and two of the four kinds
answered with a number that was not true of the delete they preceded — in
opposite directions. `deletion_impact('lane', id)` counted the cells of ONE
`lanes` row, while `remove_lane(scenario_id, lane_name)` deletes every
same-named lane across every path of the scenario; measured against a live
blueprint, 11 reported against 93 deleted. `deletion_impact('step', id)`
counted that step across every path, while `remove_step(path_id, step_id)`
deletes only the cells on the path it is given; 12 reported against 5 deleted.

The cause is identity, not arithmetic. A lane delete is addressed by
(scenario, name) and a step delete by (path, step); the function took a single
uuid and so could not name either delete. No sum over the wrong row set gives
the right answer.

`scope_id` supplies the missing half. `scenario` and `path` are addressed by
one id, ignore it, and keep the predicates they had, so nothing that calls
them today changes — the new argument has a default and the two working kinds
never read it. `lane` needs nothing from the caller: it derives the
(scenario, name) pair from the lane it is handed. `step` REFUSES without a
scope rather than guess a path, because an overcount in a delete dialog reads
as "this is bigger than it is" and an error that says why is better than a
number nobody can justify.

`remove_step` is rewritten alongside, because it reads `deletion_impact`
itself: left calling the two-argument form it would hit the refusal and stop
deleting steps. Passing the path it was already given also narrows the
`affected_slices` it archives from "slices touched on any path" to the ones
this delete actually costs.

`DeletableKind` was narrowed to `scenario | path | slice` to make the wrong
numbers unrepresentable, with a note saying the SQL fix could not be verified
without a migration apply. It is the full set again, the agent's
`measure_deletion_impact` offers all five kinds with a `scope_id` argument,
and `DeleteStructureDialog`'s switch grows a `default` arm — it performs three
of the kinds it can now be handed, and a fall-through there would have closed
the dialog on a delete that never happened.
