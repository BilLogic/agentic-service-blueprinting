/** Shown in the Visual swimlane when a step has no partner/lead/regular tutor pictures yet. */
export const BLUEPRINT_STEP_VISUAL_PLACEHOLDER =
  '/blueprint-images/shared/step-visual-placeholder.svg'

export function isBlueprintStepVisualPlaceholder(
  picture: string | null | undefined,
): boolean {
  const trimmed = picture?.trim()
  if (!trimmed) return true
  return trimmed === BLUEPRINT_STEP_VISUAL_PLACEHOLDER
}

/** Returns pictures as-is; the Visual swimlane stays empty when none are provided. */
export function withBlueprintStepVisualPlaceholder(
  pictures: readonly string[] | undefined,
): readonly string[] {
  return pictures ?? []
}
