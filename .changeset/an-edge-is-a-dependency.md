---
'agentic-service-blueprinting': minor
---

An edge is a dependency.

The database has said `cell_dependencies` since `21000103`, and the domain
layer above it went on saying `trigger` — `BlueprintData.triggers`,
`BlueprintCellTrigger`, `IntegratedTriggerArrows`, `remapMergedPathTriggers`,
the doc comments explaining what an arrow is, the prose the reader meets on
the cover, and the tests. One concept, two words, with the seam falling
exactly where a person crosses from the schema to the code that reads it.

The word is now `dependency` everywhere it means the edge:
`BlueprintData.dependencies`, `BlueprintCellDependency`,
`IntegratedBlueprintDependency`, `IntegratedDependencyArrows`,
`BlueprintDependencyArrows` (both components renamed to match their type),
`remapMergedPathDependencies`, `blueprintLaneHasCorridorDependency`,
`blueprintHasInLaneDependency`, `flattenDependenciesFromCells`,
`normalizeDependencyKind`, `dependencyId`, `dependencyKeys`. `BlueprintData`
is a public read-surface type, so this is a breaking rename for anyone reading
it — hence a minor, and the map above is the whole of it.

`trigger` stays where it means a Postgres trigger — `cells_validate_path_match`
and the `updated_at` triggers — and where it means the thing a UI control
opens, or the word that carries a branch in the router. Those are three other
concepts that happen to share a spelling, and none of them is an edge.

The band vocabulary lands in the same pass. A storyboard lane is a storyboard
lane in code as well as on screen (`isStoryboardLane`,
`resolveStoryboardStripEntries`, `StoryboardFrameEntry`,
`StoryboardBlueprint`), and a touchpoint is a touchpoint rather than a "pill"
— `isTouchpointLane`, `touchpointLanes`, `titleRepeatsTouchpoint`, and the
comments around them. "Pill" was a third design-system word for what is either
a badge or a cell, and the shape has been a variant since the touchpoint split.
