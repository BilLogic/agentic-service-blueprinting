import {
  getBlueprintFallback,
  getRawBlueprintFallback,
} from '@/data/blueprintFallbacks'
import { applyBlueprintDisplayFilters } from '@/lib/applyBlueprintDisplayFilters'
import { isBlueprintStepStoryboardPlaceholder } from '@/lib/blueprintStoryboardPlaceholder'
import {
  deduplicateBlueprintLanes,
  normalizeBlueprint,
  sortBlueprintLanes,
  type RawPath,
} from '@/lib/normalizeBlueprint'
import type { BlueprintData } from '@/types/blueprint'
import type { CellResource, CellTouchpoint } from '@/types/blueprint'
import { cellResources } from '@/lib/cellResources'
import { cellTouchpoints } from '@/lib/cellTouchpoints'

export type BlueprintSource = 'database' | 'fallback' | null

export function isBlueprintEmpty(data: BlueprintData): boolean {
  return data.lanes.length === 0
}

/** DB value wins when non-empty; fallback only fills empty/null fields. */
function preferNonEmpty(
  dbValue: string | null | undefined,
  fallbackValue: string | null | undefined,
): string | null {
  if (dbValue?.trim()) return dbValue
  return fallbackValue ?? dbValue ?? null
}

/**
 * DB-wins merge for the two relations that replaced the link array.
 *
 * A fallback row may fill a field the database row left empty and may append
 * a name the database does not have; a database row is never removed or
 * overwritten. Matched by NAME, which is what identifies both a resource and
 * a placement to a reader — and, for a placement, what the table's own unique
 * constraint uses.
 */
function fillMissing<T extends { name: string }>(
  rows: readonly T[],
  fallbackRows: readonly T[],
  fill: (existing: T, fallback: T) => T,
  carries: (row: T) => boolean,
): T[] {
  const merged = rows.map((row) => ({ ...row }))

  for (const fallbackRow of fallbackRows) {
    if (!carries(fallbackRow)) continue
    const existingIndex = merged.findIndex(
      (entry) => entry.name === fallbackRow.name,
    )
    if (existingIndex === -1) {
      merged.push({ ...fallbackRow })
      continue
    }
    merged[existingIndex] = fill(merged[existingIndex]!, fallbackRow)
  }

  return merged
}

const preferText = (
  existing: string | null | undefined,
  fallbackValue: string | null | undefined,
): string | null => (existing?.trim() ? existing : (fallbackValue ?? null))

function fillMissingResources(
  resources: readonly CellResource[],
  fallbackResources: readonly CellResource[],
): CellResource[] {
  return fillMissing(
    resources,
    fallbackResources,
    (existing, fallback) => ({
      ...existing,
      url: preferText(existing.url, fallback.url),
    }),
    (row) => Boolean(row.url?.trim()),
  )
}

function fillMissingTouchpoints(
  touchpoints: readonly CellTouchpoint[],
  fallbackTouchpoints: readonly CellTouchpoint[],
): CellTouchpoint[] {
  return fillMissing(
    touchpoints,
    fallbackTouchpoints,
    (existing, fallback) => ({
      ...existing,
      summary: preferText(existing.summary, fallback.summary),
      role: existing.role ?? fallback.role,
    }),
    (row) => Boolean(row.summary?.trim() || row.role),
  )
}

/**
 * Fill DB gaps from the fallback blueprint — DB wins.
 *
 * Merge policy (applies only when the blueprint source is 'database'):
 * - Field values already present in the DB (non-empty after trim) are kept.
 * - Fallback values only fill DB fields that are null/empty (a placeholder
 *   step storyboard counts as empty when the fallback has a real frame).
 * - Fallback lanes/cells/steps/dependencies/links that are entirely missing from
 *   the DB are appended; nothing in the DB is removed or repositioned.
 */
function mergeMissingBlueprintContent(
  data: BlueprintData,
  scenarioId: string | undefined,
  pathId: string | undefined,
): BlueprintData {
  const fallback = getBlueprintFallback(scenarioId, pathId ?? data.path.id)
  if (!fallback) return data

  const laneIds = new Set(data.lanes.map((lane) => lane.id))
  const laneIdByName = new Map(
    data.lanes.map((lane) => [lane.name, lane.id]),
  )
  const fallbackLaneIdRemap = new Map<string, string>()
  const lanes = [...data.lanes]
  for (const lane of fallback.lanes) {
    if (laneIds.has(lane.id)) continue

    const existingLaneId = laneIdByName.get(lane.name)
    if (existingLaneId) {
      fallbackLaneIdRemap.set(lane.id, existingLaneId)
      continue
    }

    lanes.push(lane)
    laneIds.add(lane.id)
    laneIdByName.set(lane.name, lane.id)
  }
  lanes.sort((a, b) => a.position - b.position)

  const fallbackCellById = new Map(
    fallback.cells.map((cell) => [cell.id, cell]),
  )

  const cellIds = new Set(data.cells.map((cell) => cell.id))
  let cellsChanged = false
  const cells = data.cells.map((cell) => {
    const fallbackCell = fallbackCellById.get(cell.id)
    if (!fallbackCell) return cell

    let changed = false
    let next = cell

    if (fallbackCell.frame?.trim()) {
      const cellFrame = cell.frame?.trim()
      if (
        !cellFrame ||
        (isBlueprintStepStoryboardPlaceholder(cellFrame) &&
          !isBlueprintStepStoryboardPlaceholder(fallbackCell.frame))
      ) {
        next = { ...next, frame: fallbackCell.frame }
        changed = true
      }
    }

    if (fallbackCell.summary?.trim() && !cell.summary?.trim()) {
      next = { ...next, summary: fallbackCell.summary }
      changed = true
    }

    if (fallbackCell.content.trim() && !cell.content.trim()) {
      next = { ...next, content: fallbackCell.content }
      changed = true
    }

    const mergedResources = fillMissingResources(
      cellResources(cell),
      cellResources(fallbackCell),
    )
    if (JSON.stringify(mergedResources) !== JSON.stringify(cellResources(cell))) {
      next = { ...next, resources: mergedResources }
      changed = true
    }

    const mergedTouchpoints = fillMissingTouchpoints(
      cellTouchpoints(cell),
      cellTouchpoints(fallbackCell),
    )
    if (
      JSON.stringify(mergedTouchpoints) !==
      JSON.stringify(cellTouchpoints(cell))
    ) {
      next = { ...next, touchpoints: mergedTouchpoints }
      changed = true
    }

    if (changed) cellsChanged = true
    return changed ? next : cell
  })
  for (const cell of fallback.cells) {
    if (cellIds.has(cell.id)) continue

    const laneId =
      fallbackLaneIdRemap.get(cell.lane_id) ?? cell.lane_id
    cells.push({ ...cell, lane_id: laneId })
    cellIds.add(cell.id)
  }

  const stepIds = new Set(data.steps.map((step) => step.id))
  const steps = [...data.steps]
  for (const step of fallback.steps) {
    if (!stepIds.has(step.id)) {
      steps.push(step)
    }
  }
  steps.sort((a, b) => a.position - b.position)

  const dependencyKeys = new Set(
    data.dependencies.map(
      (dependency) => `${dependency.source_cell_id}:${dependency.target_cell_id}`,
    ),
  )
  const dependencies = [...data.dependencies]
  for (const dependency of fallback.dependencies) {
    const key = `${dependency.source_cell_id}:${dependency.target_cell_id}`
    if (!dependencyKeys.has(key)) {
      dependencies.push(dependency)
      dependencyKeys.add(key)
    }
  }

  const changed =
    cellsChanged ||
    lanes.length !== data.lanes.length ||
    cells.length !== data.cells.length ||
    steps.length !== data.steps.length ||
    dependencies.length !== data.dependencies.length

  const merged = changed
    ? { ...data, lanes, cells, steps, dependencies }
    : data

  return deduplicateBlueprintLanes(merged)
}

function sortBlueprintSteps(data: BlueprintData): BlueprintData {
  return {
    ...data,
    steps: [...data.steps].sort(
      (a, b) => a.position - b.position,
    ),
  }
}

export function resolveBlueprintForScenario(
  scenarioId: string | undefined,
  rawPath: RawPath | null | undefined,
): { blueprint: BlueprintData | null; source: BlueprintSource } {
  const pathId = rawPath?.id
  const fallback = getBlueprintFallback(scenarioId, pathId)

  if (rawPath) {
    const fromDb = normalizeBlueprint(rawPath)
    if (!isBlueprintEmpty(fromDb)) {
      const merged = mergeMissingBlueprintContent(fromDb, scenarioId, pathId)
      const rawFallback = getRawBlueprintFallback(
        scenarioId,
        pathId,
        merged.path.kind,
      )
      // DB-wins path metadata: fallback only fills empty name/summary/note.
      const blueprint = rawFallback
        ? {
            ...merged,
            path: {
              ...merged.path,
              name: merged.path.name.trim()
                ? merged.path.name
                : rawFallback.path.name,
              summary: preferNonEmpty(
                merged.path.summary,
                rawFallback.path.summary,
              ),
              note: preferNonEmpty(merged.path.note, rawFallback.path.note),
            },
          }
        : merged

      return {
        blueprint: applyBlueprintDisplayFilters(
          sortBlueprintSteps(
            sortBlueprintLanes(blueprint),
          ),
          scenarioId,
          pathId,
        ),
        source: 'database',
      }
    }
  }

  if (fallback) {
    return {
      blueprint: applyBlueprintDisplayFilters(
        sortBlueprintSteps(
          sortBlueprintLanes(deduplicateBlueprintLanes(fallback)),
        ),
        scenarioId,
        rawPath?.id ?? fallback.path.id,
      ),
      source: 'fallback',
    }
  }

  return { blueprint: null, source: null }
}
