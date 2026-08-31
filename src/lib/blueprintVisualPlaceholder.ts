/** Shown in the Visual swimlane when a step has no actor-lane frames yet. */
export const BLUEPRINT_STEP_VISUAL_PLACEHOLDER =
  '/step-visual-placeholder.svg'

export function isBlueprintStepVisualPlaceholder(
  frame: string | null | undefined,
): boolean {
  const trimmed = frame?.trim()
  if (!trimmed) return true
  return trimmed === BLUEPRINT_STEP_VISUAL_PLACEHOLDER
}

/** Returns frames as-is; the Visual swimlane stays empty when none are provided. */
export function withBlueprintStepVisualPlaceholder(
  frames: readonly string[] | undefined,
): readonly string[] {
  return frames ?? []
}
