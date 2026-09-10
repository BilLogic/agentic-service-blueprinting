---
'agentic-service-blueprinting': patch
---

Two comments in `BlueprintDependencyArrows` named things that are not there.
The filter that keeps panel-only links off the board called them `needs`; the
kinds are `leads_to` and `enables`. The prop doc said dependencies may not
include `kind`, when the prop it stands in for is `pathKind`. Both now say
what the code says, and the colored-dependency type says why `pathKind` needs
its own word.
