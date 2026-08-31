import type { CellTouchpoint } from '@/types/blueprint'
import { touchpointNamed } from '@/lib/cellTouchpoints'
import { isBlueprintStepVisualPlaceholder } from '@/lib/blueprintVisualPlaceholder'

/**
 * Detail-panel pictures come from the touchpoint placed at this cell — no
 * hardcoded logo registry. Falls back to the cell's own picture.
 *
 * The placement's `screenshots` is one array where the old link entry carried
 * `picture` and `pictures` and the reader had to prefer one over the other.
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
  cellPicture?: string | null
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

  const picture = input.cellPicture?.trim()
  if (!picture || isBlueprintStepVisualPlaceholder(picture)) return null
  return [picture]
}
