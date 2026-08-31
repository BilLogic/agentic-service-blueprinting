import type {
  BlueprintCell,
  BlueprintCellTrigger,
  BlueprintData,
  BlueprintLane,
  BlueprintStep,
} from '@/types/blueprint'
import type { PathType } from '@/types/database'
import { cellResourcesFromRows, type RawCellResource } from '@/lib/cellResources'
import {
  cellTouchpointsFromRows,
  type RawCellTouchpoint,
} from '@/lib/cellTouchpoints'

type RawOutgoingTrigger = {
  id: string
  target_cell_id: string
  /** Fallback data omits these — default kind 'trigger', label/note null. */
  kind?: string | null
  label?: string | null
  note?: string | null
}

/** Normalize a raw kind column value; anything unknown is a plain trigger. */
function normalizeTriggerKind(kind: string | null | undefined): 'trigger' | 'needs' {
  return kind === 'needs' ? 'needs' : 'trigger'
}

export type RawCell = {
  id: string
  lane_id: string
  step_id: string
  content: string
  picture?: string | null
  summary?: string | null
  /** `resources` rows embedded by the board query. */
  resources?: RawCellResource[] | null
  /** `cell_touchpoints` rows embedded by the board query. */
  cell_touchpoints?: RawCellTouchpoint[] | null
  outgoing?: RawOutgoingTrigger[] | null
}

type RawPathStep = {
  position: number
  steps: { id: string; name: string } | null
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
  path_type: PathType
  lanes?: RawLane[] | null
  /** @deprecated Legacy shape; use path_steps */
  steps?: BlueprintStep[] | null
  path_steps?: RawPathStep[] | null
  cells?: RawCell[] | null
  cell_dependencies?: BlueprintCellTrigger[] | null
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

function flattenTriggersFromCells(cells: RawCell[]): BlueprintCellTrigger[] {
  const triggers: BlueprintCellTrigger[] = []
  for (const cell of cells) {
    for (const outgoing of cell.outgoing ?? []) {
      triggers.push({
        id: outgoing.id,
        source_cell_id: cell.id,
        target_cell_id: outgoing.target_cell_id,
        kind: normalizeTriggerKind(outgoing.kind),
        label: outgoing.label ?? null,
        note: outgoing.note ?? null,
      })
    }
  }
  return triggers
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

  const cellByLaneStep = new Map<string, BlueprintCell>()
  for (const cell of data.cells) {
    const laneId = laneIdRemap.get(cell.lane_id) ?? cell.lane_id
    const key = `${laneId}:${cell.step_id}`
    const existing = cellByLaneStep.get(key)
    const nextCell = { ...cell, lane_id: laneId }

    if (!existing) {
      cellByLaneStep.set(key, nextCell)
      continue
    }

    if (!existing.content.trim() && nextCell.content.trim()) {
      cellByLaneStep.set(key, nextCell)
    }
  }

  const cells = [...cellByLaneStep.values()]
  const cellIds = new Set(cells.map((cell) => cell.id))
  const triggers = data.triggers.filter(
    (trigger) =>
      cellIds.has(trigger.source_cell_id) &&
      cellIds.has(trigger.target_cell_id),
  )

  keptLanes.sort((a, b) => a.position - b.position)

  return { ...data, lanes: keptLanes, cells, triggers }
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
    picture: cell.picture ?? null,
    summary: cell.summary ?? null,
    // A database board has no link array: the column it came from was split
    // into the two relations below, and the fixtures in `src/data` are the
    // only source that still carries one.
    links: [],
    resources: cellResourcesFromRows(cell.resources),
    touchpoints: cellTouchpointsFromRows(cell.cell_touchpoints),
  }))
  const triggers =
    raw.cell_dependencies && raw.cell_dependencies.length > 0
      ? raw.cell_dependencies.map((trigger) => ({
          ...trigger,
          kind: normalizeTriggerKind(trigger.kind),
          label: trigger.label ?? null,
          note: trigger.note ?? null,
        }))
      : flattenTriggersFromCells(rawCells)

  return sortBlueprintLanes({
    path: {
      id: raw.id,
      name: raw.name,
      summary: raw.summary ?? null,
      note: raw.note ?? null,
      path_type: raw.path_type,
    },
    lanes,
    steps,
    cells,
    triggers,
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
