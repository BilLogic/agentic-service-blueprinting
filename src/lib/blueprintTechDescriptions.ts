import type { BlueprintCell, CellResource, CellTouchpoint } from '@/types/blueprint'
import { placementResources, touchpointNamed } from '@/lib/cellTouchpoints'
import { parseCellContentItems } from '@/lib/parseCellContent'

/**
 * What the detail panel reads off the touchpoints placed at a cell.
 *
 * The prose, the screenshots and the design link used to be entries in the
 * `cells.links` array, found again by matching a `label` against a line of the
 * cell's own `content`. `cell_touchpoints` gives each one a row of its own;
 * `cellTouchpoints.ts` is the seam that reads them. Since #111 what a
 * placement points at is a resource carrying its id, so the link readers
 * take the cell's resources too.
 */

/** A cell as the touchpoint readers below need it. */
type TouchpointBearingCell = Pick<BlueprintCell, 'content'> & {
  summary?: string | null
  touchpoints: readonly CellTouchpoint[]
}

/** The placement's link: the featured one, else the first. */
function touchpointUrl(
  touchpoints: readonly CellTouchpoint[],
  resources: readonly CellResource[],
  techItem: string,
): string | null {
  const placement = touchpointNamed(touchpoints, techItem)
  if (!placement) return null
  const link = placementResources(resources, placement.id).find(
    (resource) => resource.kind === 'link' && resource.url?.trim(),
  )
  return link?.url?.trim() ?? null
}

function touchpointSummary(
  touchpoints: readonly CellTouchpoint[],
  techItem: string,
): string | null {
  return touchpointNamed(touchpoints, techItem)?.summary ?? null
}

function joinedSummariesForContentItems(
  touchpoints: readonly CellTouchpoint[],
  items: string[],
): string | null {
  const parts: string[] = []
  for (const item of items) {
    const summary = touchpointSummary(touchpoints, item)
    if (summary) parts.push(summary)
  }
  return parts.length > 0 ? parts.join('\n\n') : null
}

/** Touchpoint label for the detail panel heading. */
export function resolveTechCellDetailLabel(
  techItem: string | undefined,
  cell: Pick<BlueprintCell, 'content'>,
): string | null {
  if (techItem?.trim()) return techItem.trim()

  const items = parseCellContentItems(cell.content)
  return items.length === 1 ? items[0]! : null
}

/** Detail panel body copy for a touchpoint or single-tech cell. */
export function resolveTechCellDetailText(
  techItem: string | undefined,
  cell: TouchpointBearingCell,
): string {
  const content = cell.content.trim()
  const touchpoints = cell.touchpoints

  if (techItem) {
    const placed = touchpointSummary(touchpoints, techItem)
    if (placed) return placed

    if (cell.summary?.trim()) {
      const items = parseCellContentItems(cell.content)
      if (items.includes(techItem)) {
        return cell.summary.trim()
      }
    }

    return techItem
  }

  const contentItems = parseCellContentItems(content)
  if (contentItems.length === 1) {
    const placed = touchpointSummary(touchpoints, contentItems[0]!)
    if (placed) return placed
  }

  if (contentItems.length > 1) {
    const joined = joinedSummariesForContentItems(touchpoints, contentItems)
    if (joined) return joined
  }

  if (cell.summary?.trim()) {
    return cell.summary.trim()
  }

  return content
}

/** External design reference (e.g. Figma) for a touchpoint detail panel. */
export function resolveTechCellDetailUrl(
  techItem: string | undefined,
  cell: Pick<BlueprintCell, 'content'> & {
    touchpoints: readonly CellTouchpoint[]
    resources: readonly CellResource[]
  },
): string | null {
  if (techItem) {
    return touchpointUrl(cell.touchpoints, cell.resources, techItem)
  }

  const contentItems = parseCellContentItems(cell.content.trim())
  if (contentItems.length === 1) {
    return touchpointUrl(cell.touchpoints, cell.resources, contentItems[0]!)
  }

  return null
}
