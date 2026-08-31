import type { BlueprintCell, CellTouchpoint } from '@/types/blueprint'
import { touchpointNamed } from '@/lib/cellTouchpoints'
import { parseCellContentItems } from '@/lib/parseCellContent'

/**
 * What the detail panel reads off the touchpoints placed at a cell.
 *
 * The prose, the screenshots and the design link used to be entries in the
 * `cells.links` array, found again by matching a `label` against a line of the
 * cell's own `content`. `cell_touchpoints` gives each one a row of its own;
 * `cellTouchpoints.ts` is the seam that reads them.
 */

/** A cell as the touchpoint readers below need it. */
type TouchpointBearingCell = Pick<BlueprintCell, 'content'> & {
  summary?: string | null
  touchpoints: readonly CellTouchpoint[]
}

function touchpointUrl(
  touchpoints: readonly CellTouchpoint[],
  techItem: string,
): string | null {
  return touchpointNamed(touchpoints, techItem)?.url ?? null
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

/** Tech pill label for the detail panel heading. */
export function resolveTechCellDetailLabel(
  techItem: string | undefined,
  cell: Pick<BlueprintCell, 'content'>,
): string | null {
  if (techItem?.trim()) return techItem.trim()

  const items = parseCellContentItems(cell.content)
  return items.length === 1 ? items[0]! : null
}

/** Detail panel body copy for a tech pill or single-tech cell. */
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

/** External design reference (e.g. Figma) for a tech pill detail panel. */
export function resolveTechCellDetailUrl(
  techItem: string | undefined,
  cell: Pick<BlueprintCell, 'content'> & { touchpoints: readonly CellTouchpoint[] },
): string | null {
  if (techItem) {
    return touchpointUrl(cell.touchpoints, techItem)
  }

  const contentItems = parseCellContentItems(cell.content.trim())
  if (contentItems.length === 1) {
    return touchpointUrl(cell.touchpoints, contentItems[0]!)
  }

  return null
}
