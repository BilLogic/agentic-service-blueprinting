---
'agentic-service-blueprinting': minor
---

The why-line waits in a tooltip, and the edge's name stops being drawn

A dependency row in the cell panel carries two pieces of prose it did not write
itself: `cell_dependencies.note`, the sentence saying why the edge exists, and
`cell_dependencies.name`, specified as the word on the arrow. Both change here.

The note was revealed rather than removed — transparent at rest, opaque under
hover or focus-within, always visible where the pointer is coarse. Opacity keeps
a row's height on purpose, so that a list does not move the row being pointed
at; the cost is that an invisible line is still a line. Eight rows with a note
drew sixteen, seven of them blank, and the list's shape depended on how talkative
its author had been. The sentence reads from the app's tooltip now, so eight rows
draw eight.

A tooltip is not an accessible name, and this Base UI (`@base-ui/react` 1.7.0)
makes that literal: the popup carries neither `role="tooltip"` nor an
`aria-describedby` back to its trigger, so nothing about it reaches a screen
reader at all. The sentence therefore stays in the DOM, inside the row's own
button, and is hidden only where the pointer is FINE —
`[@media(pointer:fine)]:sr-only`. A screen reader reads it as part of the row's
name whatever the pointer is. A touch screen keeps the printed line, because the
trigger's hover interaction is `mouseOnly` and would never have opened for it,
and because the row's one tap target already means "go to the other cell" and
cannot also mean "show me the note". A keyboard gets the popup, because the same
trigger opens on focus as well as on hover. Hiding is conditioned on the pointer
being fine rather than on the absence of a coarse one, so a device reporting no
pointer at all keeps the line rather than losing it to a rule about mice.

`ROW_REVEAL_CLASS` stays where it is: the resources list's drag handle is its
other consumer, and opacity is the right rule for a control that has to stay
where the cursor expects to find it. It was only ever the wrong rule for prose.

The edge's name is no longer drawn. It was specified as a badge — a channel name
like "Email", set beside the lane and the step — and was never used that way:
what authors put in it were sentences saying why the edge exists, which is what
the note is for. Two fields making the same claim, one of them a badge too narrow
to hold a sentence, is worse than one. Nothing is dropped and no migration moves:
the column stays and the read still carries the value into the panel's connection
editor. It is simply not drawn anywhere any more. The sample blueprint has 73
dependencies and names none of them, so nothing in the bundled data looks
different.

What this exposes, and does not fix, is that the app cannot write a why-line at
all. `set_cell_dependency` takes a note, but the panel's connection editor offers
only a "Name (optional)" field and the agent's `create_cell_dependency` offers
only `label` — both of which land in the column that no longer renders. A note
reaches the database from a seed or an import and from nowhere else. That is the
change to make next, and it is a write-surface change rather than this one.
