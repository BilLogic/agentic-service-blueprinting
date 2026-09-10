---
'agentic-service-blueprinting': minor
---

An actor can be part of another actor.

`stakeholders` gains a nullable `parent_id` self-reference, so a deployment
that names a function on one lane and a sub-function on another can ask what
the whole owns. A lane still names the specific actor; the rollup is a join.

Held to exactly one level — a parent has no parent — by a trigger that checks
both directions, plus a `check` for the self-reference a single row can see on
its own. Depth is what turns a self-reference into a cycle, and one level keeps
the rollup a single join instead of a recursive CTE.

`UPDATE` on this table is granted column by column, so the new column is named
in a grant; without it the column would be silently uneditable.
