import type { CellResource, CellTouchpoint } from '@/types/blueprint'
import { placementResources, touchpointNamed } from '@/lib/cellTouchpoints'
import { isBlueprintStepVisualPlaceholder } from '@/lib/blueprintVisualPlaceholder'

/**
 * Detail-panel frames come from the touchpoint placed at this cell — no
 * hardcoded logo registry. Falls back to the cell's own frame.
 *
 * A placement's pictures are its attachments (#111): resources on the cell
 * that carry the placement's id, featured first. The `screenshots` column
 * they replaced was one array where the old link entry carried `frame` and
 * `frames` and the reader had to prefer one over the other.
 */
function attachmentsFor(
  touchpoints: readonly CellTouchpoint[],
  resources: readonly CellResource[],
  techItem: string,
): string[] | null {
  const placement = touchpointNamed(touchpoints, techItem)
  if (!placement) return null
  const attachments = placementResources(resources, placement.id)
    .filter((resource) => resource.kind === 'attachment')
    .map((resource) => resource.url?.trim() ?? '')
    .filter(Boolean)
  return attachments.length > 0 ? attachments : null
}

export function resolveCellDetailPictures(input: {
  techItem?: string | null
  cellContent?: string | null
  cellFrame?: string | null
  cellTouchpoints?: readonly CellTouchpoint[]
  cellResources?: readonly CellResource[]
}): readonly string[] | null {
  const touchpoints = input.cellTouchpoints ?? []
  const resources = input.cellResources ?? []

  if (input.techItem) {
    const placed = attachmentsFor(touchpoints, resources, input.techItem)
    if (placed) return placed
  }

  const content = input.cellContent?.trim() ?? ''
  if (content) {
    const placed = attachmentsFor(touchpoints, resources, content)
    if (placed) return placed
  }

  const frame = input.cellFrame?.trim()
  if (!frame || isBlueprintStepVisualPlaceholder(frame)) return null
  return [frame]
}
