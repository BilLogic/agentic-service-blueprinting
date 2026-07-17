/** Set to true to show per-layer collapse toggles in blueprint grids. */
export const BLUEPRINT_LAYER_COLLAPSE_ENABLED = false

/** Collapsed swim-lane height (label + toggle only). */
export const BLUEPRINT_LAYER_COLLAPSED_HEIGHT = 36

export const COMPARE_LAYER_COLLAPSED_HEIGHT = BLUEPRINT_LAYER_COLLAPSED_HEIGHT

export function isBlueprintLayerCollapsed(
  layerId: string,
  collapsedLayerIds: ReadonlySet<string>,
): boolean {
  return collapsedLayerIds.has(layerId)
}
