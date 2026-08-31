import type { CellTouchpoint } from '@/types/blueprint'
import { touchpointNamed } from '@/lib/cellTouchpoints'
import { isBlueprintStepVisualPlaceholder } from '@/lib/blueprintVisualPlaceholder'

/**
 * Detail-panel frames come from the touchpoint placed at this cell — no
 * hardcoded logo registry. Falls back to the cell's own frame.
 *
 * The placement's `screenshots` is one array where the old link entry carried
 * `frame` and `frames` and the reader had to prefer one over the other.
 */
function screenshotsFor(
  touchpoints: readonly CellTouchpoint[],
  techItem: string,
): string[] | null {
  const placement = touchpointNamed(touchpoints, techItem)
  if (!placement) return null
  const screenshots = placement.screenshots
    .map((entry) => entry.trim())
    .filter(Boolean)
  return screenshots.length > 0 ? screenshots : null
}

export function resolveCellDetailPictures(input: {
  techItem?: string | null
  cellContent?: string | null
  cellFrame?: string | null
  cellTouchpoints?: readonly CellTouchpoint[]
}): readonly string[] | null {
  const touchpoints = input.cellTouchpoints ?? []

  if (input.techItem) {
    const placed = screenshotsFor(touchpoints, input.techItem)
    if (placed) return placed
  }

  const content = input.cellContent?.trim() ?? ''
  if (content) {
    const placed = screenshotsFor(touchpoints, content)
    if (placed) return placed
  }

  const frame = input.cellFrame?.trim()
  if (!frame || isBlueprintStepVisualPlaceholder(frame)) return null
  return [frame]
}
