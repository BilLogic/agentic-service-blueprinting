---
'agentic-service-blueprinting': minor
---

A phase canvas now draws each scenario's happy path and nothing else. The phase header no longer offers a path filter: it folded paths across scenarios by kind and name, and once every path has its own name that fold folds nothing, so it listed unrelated routes as though they were one choice. The focused scenario still draws what the reader picks in its path picker, and its variants and exceptions stay reachable there. Choosing a path inside one scenario no longer changes what the scenarios beside it draw, even when they have a path of the same name. Clearing every path in a focused scenario shows the "No paths selected" state with its restore action, rather than dropping that scenario out of its row.

Every path picker now shows each path's status (the top-bar path menu, the scenario path checklist and toggles, and the walkthrough's path menu). The board's query already selected `paths.status`; it now reaches the path list instead of being dropped. Inside a picker the status is part of the row's text rather than a second focusable control nested in it, so a click on it still toggles the path.

The editor's `getScenarioDisplayViewType` now answers `undefined` for a scenario that has made no layout choice, so a phase row's shared view reaches those scenarios and an explicit "stacked" is no longer indistinguishable from no choice. Choosing Stacked for a scenario with no choice still writes nothing.

The overview canvas renders less on navigation: phase bodies are memoised with stable per-scenario handlers and a stable scope, and a canvas click opens its scenario as a React transition. The unused `PathsSidebarSection` component, the `ScenarioBlueprintPanel` wrapper that nothing mounted any more, and the dead `isOverviewPathFilterChecked` and `toggleOverviewPathFilter` helpers are removed. `usePhaseBlueprintFilters` no longer returns `filterPaths`, `filterSelectedPathIds` or `toggleFilterPath`; it returns `resolveHappyPathIds` and `resolveDrawnPathIds` beside `resolveSelectedPathIds`, and takes a `focusedScenarioId`.
