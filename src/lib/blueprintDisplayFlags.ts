/**
 * Iteration flags for canvas surfaces that ship behind a switch.
 *
 * Each is a single boolean the whole app reads, so a surface is on or off
 * everywhere rather than per scenario — an earlier per-scenario allowlist
 * keyed on hardcoded UUIDs is exactly the kind of instance coupling a
 * template cannot carry.
 */

/** Visual swimlane rows on the blueprint grid. */
export const BLUEPRINT_VISUAL_LANE_UI_ENABLED = true

/** Cell click → detail side panel. */
export const BLUEPRINT_CELL_DETAIL_UI_ENABLED = true

/** Presentation mode (play button + modal). */
// Off: the ▶ sat inside the Visual lane of every blueprint looking like part
// of the diagram, and the walkthrough it opened duplicated what presentation
// mode already does better. The machinery stays for a future surface that
// earns it; the flag is the single switch every grid reads.
export const BLUEPRINT_VISUAL_WALKTHROUGH_ENABLED = false

export function isBlueprintVisualLaneEnabled(
  _scenarioId?: string | null,
): boolean {
  return BLUEPRINT_VISUAL_LANE_UI_ENABLED
}

export function isBlueprintCellDetailEnabled(
  _scenarioId?: string | null,
): boolean {
  return BLUEPRINT_CELL_DETAIL_UI_ENABLED
}

export function isBlueprintVisualWalkthroughEnabled(): boolean {
  return BLUEPRINT_VISUAL_WALKTHROUGH_ENABLED
}
