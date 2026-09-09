---
'agentic-service-blueprinting': minor
---

The dependency editor writes the note, and the badge loses its last reader

The previous release moved a dependency's why-line into a tooltip on the row and
stopped drawing the edge's name. It also left the app rendering a column it
could not write: the panel's connection editor offered one prose field labelled
"Name (optional)" and the agent's `create_cell_dependency` offered one argument
called `label`, and both landed in `cell_dependencies.name` — the badge. A note
reached the database from a seed or an import and from nowhere else.

That is the whole of the defect, and the data says so from both sides. A
deployment built on this template measured 434 dependency rows, of which 8
carried a name and none carried a note — and every one of the 8 was a sentence
saying why the edge exists rather than a channel tag like "Email". Authors were
not misusing a badge field; it was the only field they were offered. That
deployment has since copied all 8 into `note` in a migration of its own, so
both columns now hold the same sentence there — a backfill, not an author
working around anything, and it is only possible because someone knew to write
one. The bundled
sample agrees from the other direction — 73 dependency rows, no names, 21
sentence-shaped notes, because a seed can write the column the editor cannot.

The editor's one prose field now writes `cell_dependencies.note`. It is labelled
Note and marked optional, and its placeholder is "Anything worth knowing about
this dependency" — deliberately general. "Why this edge exists" is narrower than
what authors actually write, and a narrow frame is what sent them to the wrong
field in the first place.

The agent's dependency tool lands its prose in the note too, and its argument
keeps the spelling it was published with. Moving where a value lands is safe for
a skill pinned to an older release: it goes on sending `label` and the sentence
now arrives somewhere a reader sees it. Renaming the argument in the same step
would not be — that skill would send a key the handler no longer reads and the
value would be dropped in silence. A rename is a separate, sequenced change with
a release between the two halves.

`cell_dependencies.name` is not dropped. The badge stopped rendering last
release and its write surface is retired here; dropping the column is a
different decision with a deployment's rows attached to it. What does go is
`linkName`, the field that carried the column into `BlueprintCellConnection`.
Nothing had read it since the badge stopped being drawn — the panel handed it to
the connection editor, which never looked at it — so it leaves with the input
that fed it rather than waiting for a third change to notice it.

No migration. `set_cell_dependency` has taken a note all along; only the two
callers were pointed at the wrong parameter.
