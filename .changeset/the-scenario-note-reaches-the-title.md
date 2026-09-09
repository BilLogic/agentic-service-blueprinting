---
'agentic-service-blueprinting': minor
---

The scenario note reaches the title that carries it

`scenarios.note` has been in the schema for a while, with a column comment
arguing at length for what it is: an aside about the scenario, beside the
summary that says what it is, held as blueprint data rather than as a `Record`
keyed on hardcoded scenario ids that only its author can read. The generated
row type carries it. `EntityDefinitionPopover` accepts a `note` and renders it
as a section under its own eyebrow. `ScenarioTitleBadge` passes one through.

Nothing ever read the column. The one caller that passes `note` hands it a
hardcoded `null`, and the select in `useServicePhases` never asked for the
field, so every popover in the app rendered the same three-quarters of a
mechanism. A deployment that wrote a note into a scenario row got a column
that stored it and no surface that showed it.

The read seam asks for `note` now, `NavItem` carries it, and a slide header's
title — an `<h1>`, so not the badge's job — hangs the definition card off the
word. `ScenarioTitleDefinition` is the piece that was missing: it composes no
sections of its own, it only decides that a heading gets the same card a badge
gets, and it deliberately does not pass the summary, which both headers
already print as prose two lines below.

The aside rides on the WORD rather than on an ⓘ beside it. Four other surfaces
use that glyph to mean *opens the panel*, and one glyph cannot mean both that
and *there is an aside here*.

Also: `runConformance` was the last place in the repository still inlining the
`catch` block that `errorMessage` exists to replace. Seventeen files stopped
writing it by hand; this one did not, because its `detail` is assembled a few
lines away from where the others set an error message.
