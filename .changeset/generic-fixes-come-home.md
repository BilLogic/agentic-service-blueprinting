---
'agentic-service-blueprinting': patch
---

A board's dependencies now come out of the normalizer the same way whichever door they arrive through. The top-level `cell_dependencies` branch spread the raw row, so any extra column the query carried rode along onto the edge; both branches now share one mapping that lists the six fields an edge has. Tests hold the two doors to the same shape.

A finding that is reopened while an open twin already exists now says so ("That finding is already open") instead of the generic "something with that name or position already exists", which asked the author to rename something they never named.

Guards close three gaps. The revert-coverage contract now reads `touchpointMutations.ts`, and lists `rename_touchpoint` as the real function its undo calls. The cell-spec contract now compares every column the board selects for a cell against the normalizer's mapper, not just the five spec columns. And tests pin the retired `frame` presentation-link param as still readable and never written back, plus the undo of a placement edit captured when placements still had screenshot and URL columns.

Creating a scenario no longer fills the first version's name with "Happy Path": a kind is not a name, and the version already carries its kind. The field starts empty with an example placeholder, the validation message says what a good name looks like, and the RPC fallback is "Main path". `BlueprintStep` now types the `summary` the normalizer already maps, and the dependency `kind` and `note` docs say what each value means.
