---
'agentic-service-blueprinting': minor
---

The arrow router is one generic engine, shared byte-for-byte with the
deployment that pins this template.

asb's arrows were routed by an overhead-rail bus: a backward loop that collided
with a parallel row dropped into a reserved lane above the row and ran there.
The deployment had since replaced that with a data-driven engine — anchor slots
that separate a cell's in and out edges, a confluence planner that merges
same-side arrivals into one trunk, gap-first corridor scoring that rides the
roomiest lane instead of a pinned one, and a co-traveller offset pass — and
retired the rail. This change adopts that engine wholesale.

`blueprintArrowGeometry.ts` and the new `arrowAnchorSlots.ts` are now the SAME
file in both repos, so the deployment can enrol them in its byte-identity drift
gate and they cannot silently diverge again. The `OverheadRail*` geometry
exports are gone; `planAnchorSlots` / `planArrowConfluences` /
`planArrowCorridors` / `isWrapDependency` / `findBidirectionalDependencyPairs`
replace them. The `BlueprintTriggerArrows` / `IntegratedTriggerArrows`
renderers wire the new engine; the trigger data vocabulary is unchanged. The
old rail-geometry unit test is replaced by the S1–S11 golden-geometry parity
net (`src/dev/arrowSituationCatalog`), which freezes the `d` strings the shared
engine produces.

No deployment content leaks in: the engine is generic (no cell-id gates),
standalone-clean.
