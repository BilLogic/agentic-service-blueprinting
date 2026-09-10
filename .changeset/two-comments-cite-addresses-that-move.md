---
'agentic-service-blueprinting': patch
---

Two comments stop citing addresses that mean something else downstream.

`useCanvasActiveEffect` cited "ADR 0010". ADR numbers are per-repository:
0010 here is *open views stay mounted*, and in a deployment built on this kit
it is whatever that repository's tenth decision happened to be. The comment
read as authoritative in both places and was right in only one. It now states
the rule it was pointing at, which travels.

`CoverGuideLink.docPath` gave `docs/guide/01-the-blueprint-model.md` as its
example. That file exists in this repository and nowhere else, so the example
resolved to nothing wherever the kit is installed. The field is documented by
what it is measured against instead.
