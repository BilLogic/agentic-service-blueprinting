/**
 * A cell's touchpoint placements, resolved from whichever source the board
 * came from.
 *
 * A placement is one touchpoint used at one cell: the tool, document, channel
 * or artifact named in the cell's text, plus the summary, screenshots and
 * design link that belong to THIS moment rather than to the tool. The database
 * stores one `cell_touchpoints` row per placement.
 *
 * Before that, the same prose lived in the `cells.links` array as an entry
 * typed `tech_description`, and it found its touchpoint by comparing its label
 * to a line of the cell's own content. There was no join but the string, so a
 * rename in the grid orphaned the paragraph behind it and nothing said so.
 * A row survives a rename; a string match does not.
 *
 * The generated fallback blueprints in `src/data` carry the same list, so a
 * no-database build serves what a database build serves. `cellResources.ts` is
 * the sibling for the other half of the array that used to hold both.
 */
import type { BlueprintCell, CellTouchpoint } from '@/types/blueprint'

/** A `cell_touchpoints` row as the board query selects it. */
export type RawCellTouchpoint = {
  id?: string | null
  position: number
  name?: string | null
  summary?: string | null
  screenshots?: readonly string[] | null
  url?: string | null
}

function screenshotList(
  values: readonly string[] | null | undefined,
): string[] {
  if (!values) return []
  return values.map((entry) => entry.trim()).filter(Boolean)
}

/** Placements from database rows, in the order the author put them. */
export function cellTouchpointsFromRows(
  rows: readonly RawCellTouchpoint[] | null | undefined,
): CellTouchpoint[] {
  if (!rows || rows.length === 0) return []

  return rows
    .filter((row) => (row.name ?? '').trim())
    .slice()
    // Sorted here rather than trusted, for the reason `cellResources.ts`
    // gives: PostgREST promises no order for an embedded relation.
    .sort((a, b) => a.position - b.position)
    .map((row) => ({
      id: row.id ?? null,
      name: row.name!.trim(),
      summary: row.summary?.trim() || null,
      screenshots: screenshotList(row.screenshots),
      url: row.url?.trim() || null,
    }))
}

/**
 * The touchpoints placed at a cell.
 *
 * The one accessor, for the reason `cellResources` is one.
 */
export function cellTouchpoints(
  cell: Partial<Pick<BlueprintCell, 'touchpoints'>>,
): CellTouchpoint[] {
  return cell.touchpoints ?? []
}

/** The placement a pill's label names, or null when nothing is placed there. */
export function touchpointNamed(
  touchpoints: readonly CellTouchpoint[],
  name: string,
): CellTouchpoint | null {
  return touchpoints.find((placement) => placement.name === name) ?? null
}
