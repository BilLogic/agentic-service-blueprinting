/**
 * Iteration flags — the single switch each grid reads for optional surfaces.
 * The template ships everything on except the visual walkthrough: the play
 * button sat inside the Visual lane looking like part of the diagram, and the
 * walkthrough duplicated what presentation-style reading already does. The
 * machinery stays behind this flag for a surface that earns it.
 */
export const BLUEPRINT_VISUAL_WALKTHROUGH_ENABLED = false

export function isBlueprintVisualWalkthroughEnabled(): boolean {
  return BLUEPRINT_VISUAL_WALKTHROUGH_ENABLED
}
