---
'agentic-service-blueprinting': minor
---

A board now has an address. The URL stopped at the service, so a board could
not be sent to anyone, a reload started over at the overview, and Back left the
app instead of stepping through the boards the reader had walked.

`boardAddress.ts` puts the phase, the scenario, the path selection and the view
mode in the search, beside the view params `urlViewState.ts` already owns, and
`BoardAddressSync` is the one bridge between editor navigation, the path
selection store and the tab state — none of those three providers learns about
the other two.

An absent param means "whatever this board says about itself" rather than a
default spelled out, so a link written while the reader had made no choice
asserts no choice, and an editor who later re-lays a board out is not overruled
by every address ever copied. A `view` the URL asks for is adopted through a
new `seedScenarioDisplayViewType`, which overrides without writing the row:
following a link is not the same act as an editor choosing a layout.
