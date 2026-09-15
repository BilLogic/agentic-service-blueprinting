---
'agentic-service-blueprinting': patch
---

Four lookups nothing asked are gone, and the cell cache goes with them

The offline-board change threaded a board argument through every lookup in
`src/data/blueprintFallbacks.ts`. Four of them had no one to thread it to.
`hasRegisteredPathFallback` asked whether a path id is in the registry,
`getFallbackBlueprintsForScenarios` collected a map of scenario to blueprint,
`getFallbackCell` answered one cell by id, and `showsBlueprintFilters` in
`src/types/nav.ts` said whether a slide shows the blueprint filters. Nothing
called any of them: not a surface, not a hook, not a script, not the agent's
tool definitions, not the generator, not a deployment-facing document, not a
test. **None was kept**, because none had a reader to justify keeping.

`getFallbackCell` took a field with it. `OfflineBoard.cellsById` was the one
mutable field on a type whose every other field is settled when the board is
built — a lazily filled cache of cells by id, built on the first call to the
only function that read it. With that function gone the cache was a mutable
field nothing wrote and nothing read, so the board is now settled in all of its
fields, and `indexRegistry` has one fewer thing to say.

The module's vocabulary is untouched and `getBlueprintFallback` still forwards
to `getRawBlueprintFallback`: this is the deletion and nothing else. The lookups
that do have callers — `hasBlueprintFallback`, `filterPathsForScenarioUi`,
`getFallbackPathsForScenario`, `getRawBlueprintFallback`, `getBlueprintFallback`
— are as they were, and the nav helper the deleted one leaned on,
`getBlueprintScenarioId`, keeps its own caller in `src/lib/sliceCells.ts`.

Four exports of the nav module are still without a caller, and stay: the
post-to-pre loop arrow predicate, the integrated-slide predicate, the
side-by-side predicate and the nav-order listing. They are not this deletion's
subject — the integrated-slide predicate says in its own comment why it is kept
as a named predicate while the layout is disabled, and the other three are a
question about the overview and the filmstrip rather than about the offline
board. `getSlideById` is exported with no importer but has five callers inside
its own module. They are a follow-up, not silence.

Nothing a person sees is different, and nothing shipped grows: the built main
chunk is **2,073,831 bytes against 2,073,846 at the base commit**.
