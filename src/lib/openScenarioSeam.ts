/**
 * Pointers the scenario-open seam reads without subscribing to the path
 * store or the tab store. Those two providers register here; the editor
 * context calls through. None of the three providers import one another —
 * the same reason `BoardAddressSync` is a bridge rather than a method on
 * any of them.
 */

type ActivateTab = (key: null) => void
type SelectDefaultPath = (scenarioId: string) => void

let activateTabImpl: ActivateTab | null = null
let selectDefaultPathImpl: SelectDefaultPath | null = null

/**
 * Register the tab store's "return to the base blueprint view" action.
 *
 * @param activateTab - `activateTab(null)`, or `null` on unmount.
 */
export function registerOpenScenarioActivateTab(
  activateTab: ActivateTab | null,
): void {
  activateTabImpl = activateTab
}

/**
 * Register the path store's default-path apply.
 *
 * @param selectDefaultPath - Opens a scenario on its default path, or `null` on unmount.
 */
export function registerOpenScenarioDefaultPath(
  selectDefaultPath: SelectDefaultPath | null,
): void {
  selectDefaultPathImpl = selectDefaultPath
}

/**
 * Leave any slice/present tab so the opened scenario is visible.
 */
export function activateBaseView(): void {
  activateTabImpl?.(null)
}

/**
 * Select the scenario's default path (last-viewed if it still exists, else
 * the happy path). No-op when the path store is not mounted.
 *
 * @param scenarioId - Scenario whose default path should become the filter.
 */
export function selectOpenScenarioDefaultPath(scenarioId: string): void {
  selectDefaultPathImpl?.(scenarioId)
}
