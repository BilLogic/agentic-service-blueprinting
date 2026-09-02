/**
 * A cell's touchpoint placements, resolved from whichever source the board
 * came from.
 *
 * A placement is one touchpoint used at one cell: the tool, document, channel
 * or artifact named in the cell's text, plus the summary and role that belong
 * to THIS moment rather than to the tool. What it points at — a design link,
 * screenshots — are resources carrying the placement's id (#111), read from
 * the cell's list. The database stores one `cell_touchpoints` row per
 * placement.
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
import type { BlueprintCell, CellResource, CellTouchpoint } from '@/types/blueprint'
import { orderedNamedRows } from '@/lib/orderedNamedRows'
import { normalizeRole } from '@/lib/touchpointRole'

/** A `cell_touchpoints` row as the board query selects it. */
export type RawCellTouchpoint = {
  id?: string | null
  position: number
  /** The registry entry, or null with `name` set — a name-only placement (#112). */
  touchpoint_id?: string | null
  name?: string | null
  summary?: string | null
  role?: string | null
  /** The joined registry row. PostgREST names the embed after the table. */
  touchpoints?: { name: string; kind?: string | null } | null
}

/** Placements from database rows, in the order the author put them. */
export function cellTouchpointsFromRows(
  rows: readonly RawCellTouchpoint[] | null | undefined,
): CellTouchpoint[] {
  // The registry's spelling where there is a registry row; the placement's
  // own name where the registry lacks it (or a fallback board has none).
  const named = (rows ?? []).map((row) => ({
    ...row,
    name: row.touchpoints?.name ?? row.name ?? null,
  }))
  return orderedNamedRows(named, (row, name) => ({
      id: row.id ?? null,
      touchpointId: row.touchpoint_id ?? null,
      name,
      kind: row.touchpoints?.kind ?? null,
      summary: row.summary?.trim() || null,
      role: normalizeRole(row.role),
    }))
}

/**
 * A placement the registry lacks: a real row that names its touchpoint by
 * name alone. A fallback placement has no row and no registry, and is not
 * one of these.
 */
export function isNameOnlyPlacement(placement: CellTouchpoint): boolean {
  return placement.id !== null && placement.touchpointId === null
}

/** The resources one placement points at, in author order, featured first. */
export function placementResources(
  resources: readonly CellResource[],
  placementId: string | null,
): CellResource[] {
  if (!placementId) return []
  const own = resources.filter((resource) => resource.placementId === placementId)
  return [
    ...own.filter((resource) => resource.featured),
    ...own.filter((resource) => !resource.featured),
  ]
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
