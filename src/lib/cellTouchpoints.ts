/**
 * A cell's touchpoint placements, resolved from whichever source the board
 * came from.
 *
 * A placement is one touchpoint used at one cell: the tool, document, channel
 * or artifact named in the cell's text, plus the summary and role that belong
 * to THIS moment rather than to the tool. What it points at — a design link,
 * screenshots — are resources carrying the placement's id, read from the
 * cell's list. The database stores one `cell_touchpoints` row per
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
import { normalizeRole, type TouchpointRoleValue } from '@/lib/touchpointRole'

/** A `cell_touchpoints` row as the board query selects it. */
export type RawCellTouchpoint = {
  id?: string | null
  position: number
  /** The registry entry, or null with `name` set — a name-only placement. */
  touchpoint_id?: string | null
  name?: string | null
  summary?: string | null
  role?: string | null
  /** The joined registry row. PostgREST names the embed after the table. */
  touchpoints?: { name: string; kind?: string | null; icon_url?: string | null } | null
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
      iconUrl: row.touchpoints?.icon_url ?? null,
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

/** The placement a touchpoint's label names, or null when nothing is placed there. */
export function touchpointNamed(
  touchpoints: readonly CellTouchpoint[],
  name: string,
): CellTouchpoint | null {
  return touchpoints.find((placement) => placement.name === name) ?? null
}

/** What the detail panel shows for one touchpoint at one cell. */
export type TouchpointDetail = {
  /**
   * The placement row behind this, when there is one. Null on a board with
   * no database — and the panel keys the placement editor's availability on
   * it, so "there is nothing to save into" is answered by the same value
   * that says "there is no row".
   */
  id: string | null
  name: string
  /** The placement's own words, else the cell's, else the name. */
  text: string
  kind: string | null
  role: TouchpointRoleValue
}

/**
 * WHICH placement a selection means, before anything is derived from it.
 *
 * Split from `resolveTouchpointDetail` below because the editor and the
 * reader need different things from the same choice. The reader wants the
 * resolved detail, where an empty summary falls back to the cell's; the
 * editor wants the placement's OWN summary, empty and all, because seeding a
 * form with the cell's sentence would save that sentence onto the placement
 * the first time anybody pressed Save. One selection rule, two readings of
 * the row it picks.
 *
 * With no name given, a cell holding exactly one touchpoint resolves it —
 * that is the single-tool cell the panel opens directly. A cell holding
 * several resolves nothing rather than guessing at the first, because
 * showing one touchpoint's screenshot under another's heading is the
 * confusion a placement row exists to end.
 */
export function findCellPlacement(
  cell: { touchpoints: readonly CellTouchpoint[] },
  name?: string | null,
): CellTouchpoint | null {
  const wanted = name?.trim()
  if (wanted) {
    return cell.touchpoints.find((entry) => entry.name === wanted) ?? null
  }
  return cell.touchpoints.length === 1 ? cell.touchpoints[0] : null
}

/**
 * The detail for one touchpoint at one cell, or null when there isn't one.
 *
 * Replaces the resolvers that read a cell's link array by label
 * (`blueprintTechDescriptions.ts`), which had no join but the string: a
 * rename in the grid orphaned the paragraph behind it and nothing said so.
 * A placement carries its own summary, so the rule is the same for every
 * touchpoint: its words, else the cell's, else its name.
 *
 * Which placement it is about is `findCellPlacement`'s answer, not a second
 * copy of the same rule.
 */
export function resolveTouchpointDetail(
  cell: { summary?: string | null; touchpoints: readonly CellTouchpoint[] },
  name?: string | null,
): TouchpointDetail | null {
  const placement = findCellPlacement(cell, name)
  if (!placement) return null

  return {
    id: placement.id,
    name: placement.name,
    text: placement.summary?.trim() || cell.summary?.trim() || placement.name,
    kind: placement.kind,
    role: placement.role,
  }
}
