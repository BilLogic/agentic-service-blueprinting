import type { CellResource, CellTouchpoint } from '@/types/blueprint'
import { placementResources, touchpointNamed } from '@/lib/cellTouchpoints'
import { isBlueprintStepStoryboardPlaceholder } from '@/lib/blueprintStoryboardPlaceholder'

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

/**
 * The touchpoint's own stock icon, read off the registry row the placement
 * names (#326). This is where a tool's logo lives now — one string in a
 * column — rather than a tool name matched against a table baked into the
 * renderer. Null where the placement's touchpoint carries none.
 */
function iconFor(
  touchpoints: readonly CellTouchpoint[],
  name: string,
): string | null {
  return touchpointNamed(touchpoints, name)?.iconUrl?.trim() || null
}

function framePictures(cellFrame?: string | null): string[] | null {
  const frame = cellFrame?.trim()
  if (!frame || isBlueprintStepStoryboardPlaceholder(frame)) return null
  return [frame]
}

export function resolveCellDetailImages(input: {
  techItem?: string | null
  cellContent?: string | null
  cellFrame?: string | null
  cellTouchpoints?: readonly CellTouchpoint[]
  cellResources?: readonly CellResource[]
}): readonly string[] | null {
  const touchpoints = input.cellTouchpoints ?? []
  const resources = input.cellResources ?? []
  const content = input.cellContent?.trim() ?? ''

  // The tool this panel is about: the clicked touchpoint, else the cell's own name
  // when it holds exactly one touchpoint (content === the placement's name).
  const techItem = input.techItem?.trim() || null
  const icon =
    (techItem ? iconFor(touchpoints, techItem) : null) ??
    (content ? iconFor(touchpoints, content) : null)

  // The placement's authored screenshots — the frame is the fallback for a
  // cell with no placement carrying its own.
  const attachments =
    (techItem ? attachmentsFor(touchpoints, resources, techItem) : null) ??
    (content ? attachmentsFor(touchpoints, resources, content) : null)
  const rest = attachments ?? framePictures(input.cellFrame)

  // The stock icon leads; the panel draws it as the logo and the rest as
  // screenshots.
  if (icon) return [icon, ...(rest ?? [])]
  return rest
}
