/** Set to true to show per-lane collapse toggles in blueprint grids. */
export const BLUEPRINT_LANE_COLLAPSE_ENABLED = false

/** Collapsed swim-lane height (label + toggle only). */
export const BLUEPRINT_LANE_COLLAPSED_HEIGHT = 36

export const COMPARE_LANE_COLLAPSED_HEIGHT = BLUEPRINT_LANE_COLLAPSED_HEIGHT

export function isBlueprintLaneCollapsed(
  laneId: string,
  collapsedLaneIds: ReadonlySet<string>,
): boolean {
  return collapsedLaneIds.has(laneId)
}
