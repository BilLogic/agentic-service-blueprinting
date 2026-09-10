---
'agentic-service-blueprinting': patch
---

Two canvas connectors were in the wrong z band. `BlueprintDependencyArrows`
put its forward layer at `z-2`, over the `z-1` cells, so an ordinary run
crossing a cell struck through its face — while `IntegratedDependencyArrows`,
drawing the same relationship, correctly used `z-0`. The phase flow arrow sat
at `z-50`, over the `z-30` title badges, where the loop arrow beside it used
`z-20`. `canvasStackingContract.test.ts` now holds both relationships.
