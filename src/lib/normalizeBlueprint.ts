import {
  asEntityStatus,
  DEFAULT_ENTITY_STATUS,
} from '@/lib/entityStatus'
import type {
  BlueprintCell,
  BlueprintCellDependency,
  BlueprintData,
  BlueprintLane,
  BlueprintStep,
} from '@/types/blueprint'
import type { Json, PathKind } from '@/types/database'
import { cellResourcesFromRows, type RawCellResource } from '@/lib/cellResources'
import {
  cellTouchpointsFromRows,
  type RawCellTouchpoint,
} from '@/lib/cellTouchpoints'

type RawOutgoingDependency = {
  id: string
  target_cell_id: string
  /** Fallback data omits these — default kind 'leads_to', name/note null. */
  kind?: string | null
  name?: string | null
  note?: string | null
}

/** Normalize a raw kind column value; anything unknown is a plain dependency. */
function normalizeDependencyKind(kind: string | null | undefined): 'leads_to' | 'enables' {
  return kind === 'enables' ? 'enables' : 'leads_to'
}

export type RawCell = {
  id: string
  lane_id: string
  step_id: string
  content: string
  /** The cell's index inside its slot; absent data sorts as 0. */
  position?: number | null
  frame?: string | null
  summary?: string | null
  /** The `entity_status` column, as text; anything unknown reads as absent. */
  status?: string | null
  /**
   * The spec block and the owner pair (`cells.function` … `cells.value_props`),
   * carried with the board rather than fetched when a panel opens.
   */
  function?: string | null
  form?: string | null
  value_props?: Json | null
  owner?: string | null
  perceived_owner?: string | null
  /** `resources` rows embedded by the board query. */
  resources?: RawCellResource[] | null
  /** `cell_touchpoints` rows embedded by the board query. */
  cell_touchpoints?: RawCellTouchpoint[] | null
  outgoing?: RawOutgoingDependency[] | null
}

type RawPathStep = {
  position: number
  steps: { id: string; name: string; summary?: string | null } | null
}

export type RawLane = {
  id: string
  name: string
  position: number
  /** Semantic role column as selected from the DB. */
  lane_role?: string | null
  /** Normalized shape (fallback data passes BlueprintLane directly). */
  role?: string | null
}

export type RawPath = {
  id: string
  name: string
  summary?: string | null
  note?: string | null
  kind: PathKind
  /** The `entity_status` column, as text; anything unknown reads as `live`. */
  status?: string | null
  lanes?: RawLane[] | null
  /** @deprecated Legacy shape; use path_steps */
  steps?: BlueprintStep[] | null
  path_steps?: RawPathStep[] | null
  cells?: RawCell[] | null
  cell_dependencies?: BlueprintCellDependency[] | null
}

/** Flatten path_steps junction rows into blueprint steps sorted by column. */
export function flattenPathSteps(raw: RawPathStep[]): BlueprintStep[] {
  return [...raw]
    .sort((a, b) => a.position - b.position)
    .flatMap((row) => {
      if (!row.steps) return []
      return [
        {
          id: row.steps.id,
          name: row.steps.name,
          summary: row.steps.summary ?? null,
          position: row.position,
        },
      ]
    })
}

function resolveSteps(raw: RawPath): BlueprintStep[] {
  if (raw.path_steps && raw.path_steps.length > 0) {
    return flattenPathSteps(raw.path_steps)
  }
  return [...(raw.steps ?? [])].sort(
    (a, b) => a.position - b.position,
  )
}

function flattenDependenciesFromCells(cells: RawCell[]): BlueprintCellDependency[] {
  const dependencies: BlueprintCellDependency[] = []
  for (const cell of cells) {
    for (const outgoing of cell.outgoing ?? []) {
      dependencies.push({
        id: outgoing.id,
        source_cell_id: cell.id,
        target_cell_id: outgoing.target_cell_id,
        kind: normalizeDependencyKind(outgoing.kind),
        name: outgoing.name ?? null,
        note: outgoing.note ?? null,
      })
    }
  }
  return dependencies
}

/** Collapse duplicate swim lanes that share a name (e.g. legacy + fallback lane IDs). */
export function deduplicateBlueprintLanes(data: BlueprintData): BlueprintData {
  const lanesByName = new Map<string, BlueprintLane[]>()
  for (const lane of data.lanes) {
    const group = lanesByName.get(lane.name) ?? []
    group.push(lane)
    lanesByName.set(lane.name, group)
  }

  const duplicateGroups = [...lanesByName.values()].filter(
    (group) => group.length > 1,
  )
  if (duplicateGroups.length === 0) {
    return data
  }

  const cellCountByLaneId = new Map<string, number>()
  for (const cell of data.cells) {
    cellCountByLaneId.set(
      cell.lane_id,
      (cellCountByLaneId.get(cell.lane_id) ?? 0) + 1,
    )
  }

  const laneIdRemap = new Map<string, string>()
  const keptLanes: BlueprintLane[] = []

  for (const group of lanesByName.values()) {
    if (group.length === 1) {
      keptLanes.push(group[0])
      continue
    }

    const canonical = [...group].sort((a, b) => {
      const cellDiff =
        (cellCountByLaneId.get(b.id) ?? 0) -
        (cellCountByLaneId.get(a.id) ?? 0)
      if (cellDiff !== 0) return cellDiff
      return a.position - b.position
    })[0]

    keptLanes.push({
      ...canonical,
      position: Math.min(...group.map((lane) => lane.position)),
    })

    for (const lane of group) {
      if (lane.id !== canonical.id) {
        laneIdRemap.set(lane.id, canonical.id)
      }
    }
  }

  // Keyed on the SLOT — lane, step and position — not on (lane, step).
  //
  // A slot holds a list, not a cell: the tech-cell split made every touchpoint
  // in a tech lane its own row at position 0..n, and `BlueprintCell.position`
  // says so in its own docstring. Collapsing on `${laneId}:${stepId}` kept one
  // cell per (lane, step) and dropped every sibling — and it did that board
  // wide, over `data.cells` entire, not only over the lanes that were actually
  // merged. One duplicated lane name anywhere silently emptied every
  // multi-cell slot on the board.
  //
  // What this loop is FOR is narrower than that: when two lanes merge into
  // one, the same slot can arrive twice, and the copy with content wins over
  // the empty one. That question is per-position, which is what the key now
  // says.
  const cellBySlot = new Map<string, BlueprintCell>()
  for (const cell of data.cells) {
    const laneId = laneIdRemap.get(cell.lane_id) ?? cell.lane_id
    const key = `${laneId}:${cell.step_id}:${cell.position}`
    const existing = cellBySlot.get(key)
    const nextCell = { ...cell, lane_id: laneId }

    if (!existing) {
      cellBySlot.set(key, nextCell)
      continue
    }

    if (!existing.content.trim() && nextCell.content.trim()) {
      cellBySlot.set(key, nextCell)
    }
  }

  const cells = [...cellBySlot.values()]
  const cellIds = new Set(cells.map((cell) => cell.id))
  const dependencies = data.dependencies.filter(
    (dependency) =>
      cellIds.has(dependency.source_cell_id) &&
      cellIds.has(dependency.target_cell_id),
  )

  keptLanes.sort((a, b) => a.position - b.position)

  return { ...data, lanes: keptLanes, cells, dependencies }
}

export function sortBlueprintLanes(data: BlueprintData): BlueprintData {
  const lanes = [...data.lanes].sort(
    (a, b) => a.position - b.position,
  )
  const unchanged = lanes.every(
    (lane, index) => lane.id === data.lanes[index]?.id,
  )
  return unchanged ? data : { ...data, lanes }
}

export function normalizeBlueprint(raw: RawPath): BlueprintData {
  const lanes: BlueprintLane[] = [...(raw.lanes ?? [])]
    .sort((a, b) => a.position - b.position)
    .map((lane) => ({
      id: lane.id,
      name: lane.name,
      role: lane.lane_role ?? lane.role ?? null,
      position: lane.position,
    }))
  const steps = resolveSteps(raw)
  const rawCells = raw.cells ?? []
  const cells: BlueprintCell[] = rawCells.map((cell) => ({
    id: cell.id,
    lane_id: cell.lane_id,
    step_id: cell.step_id,
    content: cell.content,
    // Selected by the board query, typed on `BlueprintCell` and sorted on.
    // Without it every slot sort is `0 - 0` and a slot holding more than one
    // cell renders in whatever order the database happened to return.
    position: cell.position ?? 0,
    frame: cell.frame ?? null,
    summary: cell.summary ?? null,
    // Narrowed rather than passed through: the column is a plain text with a
    // check constraint, so a value the renderer has no treatment for should
    // read as shipped rather than as an unrecognised marker.
    status: asEntityStatus(cell.status),
    resources: cellResourcesFromRows(cell.resources),
    touchpoints: cellTouchpointsFromRows(cell.cell_touchpoints),
    // Carried with the board rather than fetched on panel open: two round
    // trips per cell, for five columns the board can hold.
    function: cell.function ?? null,
    form: cell.form ?? null,
    // The column is jsonb; the type names the shape the panel renders. Absent
    // rather than empty, so "unset" and "set to nothing" stay distinguishable.
    value_props: (cell.value_props ?? undefined) as BlueprintCell['value_props'],
    owner: cell.owner ?? null,
    perceived_owner: cell.perceived_owner ?? null,
  }))
  const dependencies =
    raw.cell_dependencies && raw.cell_dependencies.length > 0
      ? raw.cell_dependencies.map((dependency) => ({
          ...dependency,
          kind: normalizeDependencyKind(dependency.kind),
          name: dependency.name ?? null,
          note: dependency.note ?? null,
        }))
      : flattenDependenciesFromCells(rawCells)

  return sortBlueprintLanes({
    path: {
      id: raw.id,
      name: raw.name,
      summary: raw.summary ?? null,
      note: raw.note ?? null,
      kind: raw.kind,
      status: asEntityStatus(raw.status) ?? DEFAULT_ENTITY_STATUS,
    },
    lanes,
    steps,
    cells,
    dependencies,
  })
}

/**
 * Cells by slot. A slot — one lane, one step — holds a *list*: tech lanes
 * carry one cell per touchpoint (`position` orders them), and the old
 * single-cell map silently dropped every sibling but the last, which is the
 * kind of data loss that never throws. Non-tech lanes still hold one.
 */
export function buildCellLookup(
  cells: BlueprintCell[],
): Map<string, BlueprintCell[]> {
  const map = new Map<string, BlueprintCell[]>()
  for (const cell of cells) {
    const key = `${cell.lane_id}:${cell.step_id}`
    const slot = map.get(key)
    if (slot) slot.push(cell)
    else map.set(key, [cell])
  }
  for (const slot of map.values()) {
    slot.sort(
      (left, right) => (left.position ?? 0) - (right.position ?? 0),
    )
  }
  return map
}

/** Every cell in the slot, in `position` order. */
export function getCellsAt(
  lookup: Map<string, BlueprintCell[]>,
  laneId: string,
  stepId: string,
): BlueprintCell[] {
  return lookup.get(`${laneId}:${stepId}`) ?? []
}

/**
 * The slot's first cell — the right question for non-tech lanes, which hold
 * at most one, and for anything that needs "the" cell of a slot (arrows,
 * upserts, walkthroughs target slot position 0).
 */
export function getCellAt(
  lookup: Map<string, BlueprintCell[]>,
  laneId: string,
  stepId: string,
): BlueprintCell | undefined {
  return lookup.get(`${laneId}:${stepId}`)?.[0]
}
