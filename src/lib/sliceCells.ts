import { SAMPLE_NAV } from '@/data/sampleNav'
import {
  getBlueprintFallback,
  getFallbackPathsForScenario,
} from '@/data/blueprintFallbacks'
import { shouldUseStoryboardContent } from '@/lib/blueprintLayout'
import { isBlueprintStepStoryboardPlaceholder } from '@/lib/blueprintStoryboardPlaceholder'
import { resolveBlueprintCellId } from '@/lib/resolveBlueprintCellId'
import { getBlueprintScenarioId } from '@/types/nav'
import type { BlueprintData } from '@/types/blueprint'
import type { Slide } from '@/types/database'

/** Scan the local fallback registry for the scenario owning these cells. */
export function findFallbackScenarioForCells(
  cellIds: readonly string[],
): string | null {
  if (cellIds.length === 0) return null
  const wanted = new Set(cellIds.map(resolveBlueprintCellId))

  for (const slide of SAMPLE_NAV) {
    const scenarioId = getBlueprintScenarioId(slide)
    if (!scenarioId) continue
    for (const path of getFallbackPathsForScenario(scenarioId)) {
      const blueprint = getBlueprintFallback(scenarioId, path.id, path.kind)
      if (blueprint?.cells.some((cell) => wanted.has(cell.id))) {
        return scenarioId
      }
    }
  }

  return null
}

/** The scenario blueprint containing the most of the slice's cells. */
export function pickBlueprintForCells(
  blueprints: readonly BlueprintData[],
  cellIds: readonly string[],
): BlueprintData | null {
  let best: BlueprintData | null = null
  let bestCount = 0

  for (const blueprint of blueprints) {
    const ids = new Set(blueprint.cells.map((cell) => cell.id))
    const count = cellIds.filter((cellId) =>
      ids.has(resolveBlueprintCellId(cellId)),
    ).length
    if (count > bestCount) {
      best = blueprint
      bestCount = count
    }
  }

  return best
}

export type SliceCellPlacement = {
  /** Canonical blueprint cell id (integrated overlay ids resolved). */
  cellId: string
  /** 1-based sequence number across the slice; dangling cells are skipped. */
  order: number
  laneId: string
  stepIndex: number
  /** Index of the owning slide in position-sorted slides. */
  itemIndex: number
}

export type SliceCellResolution = {
  placements: SliceCellPlacement[]
  /** Slice cell ids that no longer resolve in the rendered blueprint. */
  missingCellIds: string[]
  /** Raw + resolved member ids, for `data-slice-member` matching. */
  memberCellIds: ReadonlySet<string>
  /**
   * Raw + resolved member id → 1-based sequence number (tombstones skipped),
   * for the badge each member cell renders on its own corner.
   */
  sequenceByCellId: ReadonlyMap<string, number>
}

/** Place a slice's cells on one blueprint; unresolvable ids become tombstones. */
export function resolveSliceCells(
  blueprint: BlueprintData | null,
  items: readonly Slide[],
): SliceCellResolution {
  const sorted = [...items].sort((a, b) => a.position - b.position)
  const cellById = new Map(
    (blueprint?.cells ?? []).map((cell) => [cell.id, cell]),
  )
  const stepIndexById = new Map(
    (blueprint?.steps ?? []).map((step, index) => [step.id, index]),
  )

  const placements: SliceCellPlacement[] = []
  const missingCellIds: string[] = []
  const memberCellIds = new Set<string>()
  const sequenceByCellId = new Map<string, number>()
  let order = 0

  sorted.forEach((item, itemIndex) => {
    for (const rawCellId of item.cell_ids) {
      const cellId = resolveBlueprintCellId(rawCellId)
      const cell = cellById.get(cellId)
      const stepIndex = cell ? stepIndexById.get(cell.step_id) : undefined
      if (!cell || stepIndex === undefined) {
        missingCellIds.push(rawCellId)
        continue
      }
      order += 1
      placements.push({
        cellId,
        order,
        laneId: cell.lane_id,
        stepIndex,
        itemIndex,
      })
      memberCellIds.add(cellId)
      memberCellIds.add(rawCellId)
      // A cell repeated across slides keeps its first sequence number.
      if (!sequenceByCellId.has(cellId)) sequenceByCellId.set(cellId, order)
      if (!sequenceByCellId.has(rawCellId)) {
        sequenceByCellId.set(rawCellId, order)
      }
    }
  })

  return { placements, missingCellIds, memberCellIds, sequenceByCellId }
}

/**
 * The STRIP for one slide: the frames of the cells it references, in their
 * order. Each member cell's own `frame` first, then the storyboard-lane cell
 * of the same step — a step's frame usually sits on the storyboard lane rather
 * than on the acting cell. Placeholder tokens are skipped and duplicates
 * collapse, so what the slide shows is exactly what its cells carry.
 */
export function resolveSlideStrip(
  blueprint: BlueprintData | null,
  item: Slide,
): string[] {
  if (!blueprint) return []

  const cellById = new Map(blueprint.cells.map((cell) => [cell.id, cell]))
  const storyboardLaneIds = new Set(
    blueprint.lanes
      .filter((lane) => shouldUseStoryboardContent(lane))
      .map((lane) => lane.id),
  )
  const storyboardCellByStepId = new Map(
    blueprint.cells
      .filter((cell) => storyboardLaneIds.has(cell.lane_id))
      .map((cell) => [cell.step_id, cell]),
  )

  const frames: string[] = []
  const seen = new Set<string>()
  const add = (frame: string | null | undefined) => {
    const src = frame?.trim()
    if (!src || isBlueprintStepStoryboardPlaceholder(src) || seen.has(src)) return
    seen.add(src)
    frames.push(src)
  }

  for (const rawCellId of item.cell_ids) {
    const cell = cellById.get(resolveBlueprintCellId(rawCellId))
    if (!cell) continue
    add(cell.frame)
    add(storyboardCellByStepId.get(cell.step_id)?.frame)
  }

  return frames
}

/**
 * The images a slide can show: its own uploads first, then the frames of the
 * cells it cites. One list, in the order an author reads it, and the source
 * of every choice `activeSlideImage` can return.
 */
export function slideImagePool(
  blueprint: BlueprintData | null,
  item: Slide,
): { illustrations: string[]; frames: string[] } {
  return {
    illustrations: item.illustrations.filter(isRenderableImageSrc),
    frames: resolveSlideStrip(blueprint, item),
  }
}

/**
 * What the slide SHOWS, resolved from its two choice columns.
 *
 * `null` means it made no choice and shows its whole strip — the default, and
 * what every slide did before it could choose. A choice that no longer
 * resolves (a frame whose cell lost its image, an upload dropped from the
 * pool) also lands here rather than rendering nothing: the strip is always a
 * true answer, where a blank stage is never an informative one.
 */
export function activeSlideImage(
  blueprint: BlueprintData | null,
  item: Slide,
): string | null {
  if (item.active_illustration) {
    return isRenderableImageSrc(item.active_illustration) &&
      item.illustrations.includes(item.active_illustration)
      ? item.active_illustration
      : null
  }
  if (!item.active_frame_cell_id) return null

  const cell = blueprint?.cells.find(
    (candidate) => candidate.id === item.active_frame_cell_id,
  )
  const frame = cell?.frame?.trim()
  if (!frame || isBlueprintStepStoryboardPlaceholder(frame)) return null
  return isRenderableImageSrc(frame) ? frame : null
}

/**
 * The sources a slide image may have. Storage URLs and the bundled sample
 * both, and nothing else — these strings come out of the database, so a
 * `javascript:` or `data:` src is a stored payload waiting for a renderer.
 */
export function isRenderableImageSrc(src: string): boolean {
  return src.startsWith('https://') || src.startsWith('/storyboards/')
}

/** Only http(s) URLs may render as anchors — DB-sourced refs are untrusted. */
export function safeExternalHref(href: string | null | undefined): string | null {
  if (!href) return null
  return /^https?:\/\//i.test(href) ? href : null
}
