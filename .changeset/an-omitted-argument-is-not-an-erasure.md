---
'agentic-service-blueprinting': patch
---

An argument nobody sent no longer erases an edge's words

`set_cell_dependency` upserts, and its conflict clause assigned both prose
columns straight from the row it had tried to insert — `name = excluded.name,
note = excluded.note`. Both arguments default to null, and a default is
indistinguishable from a null the caller sent, so a call that said nothing
about the words did not leave them alone: it cleared them, on an edge that
already existed, and returned the id as if it had succeeded.

The agent tool is what reaches it. `create_cell_dependency` needs a source, a
target and a kind; its prose argument is optional. Asked twice for the same
edge — a retry, a re-run of a plan, a model connecting two cells it has already
connected — the second call is a bare upsert onto the first and whatever an
author wrote there is gone. The panel's connection editor cannot reach it,
because its validation refuses a duplicate before any call is made; that is a
validation standing in front of the defect rather than the defect not being
there.

The conflict clause now coalesces: `coalesce(excluded.name,
cell_dependencies.name)` and the same for `note`. An omitted argument means
"leave it as it was" and a supplied one still replaces. Both columns, because
neither has a caller that clears by sending null — nothing has written `name`
since the editor and the agent tool were pointed at `note`, and a note is
cleared by removing the connection and adding it again, which is a delete and a
fresh insert with no upsert in it.

The cost, stated rather than hidden: a null can no longer clear either column
through this function, and neither can an empty string — the body has always
turned `''` into null before the conflict clause, so those two have never been
distinguishable here. Emptying a field wants a function whose arguments are
required, where an omission is a loud "function does not exist"; this one, whose
job is to add an edge, is not it.

The migration proves it rather than asserting a body: it builds a fixture,
authors an edge carrying a name and a note, re-runs the call the agent tool
sends, and raises unless both columns survive — then supplies new values and
raises unless they replace. The fixture is given back through a sentinel
exception. It does not assert what the previous body did, which is a fact about
this package's history rather than an invariant of the statement, and would
refuse to apply to a database that arrived at the fix another way.
