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
import type { SlideWithStrip } from '@/hooks/useSlice'

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
 * What the slide SHOWS, in order.
 *
 * An EMPTY strip is the default and the common case: it means the slide shows
 * the frames of the cells it cites, which is what a slide did before it could
 * choose and what most slides still do. A slide only carries members when
 * somebody picked them.
 *
 * A member that no longer resolves — a cell whose frame was cleared, an image
 * dropped from the pool — is skipped rather than rendered as a gap. If that
 * empties the strip, the caller falls back to the cited cells, because the
 * cells are always a true answer about a slide where a blank stage is never
 * an informative one.
 */
export function resolveChosenStrip(
  blueprint: BlueprintData | null,
  item: SlideWithStrip,
): string[] {
  const cellById = new Map((blueprint?.cells ?? []).map((cell) => [cell.id, cell]))
  const members = [...item.slide_strip].sort((a, b) => a.position - b.position)

  const sources: string[] = []
  for (const member of members) {
    if (member.image_url) {
      if (
        item.images.includes(member.image_url) &&
        isRenderableImageSrc(member.image_url)
      ) {
        sources.push(member.image_url)
      }
      continue
    }
    if (!member.cell_id) continue
    const frame = cellById.get(member.cell_id)?.frame?.trim()
    if (!frame || isBlueprintStepStoryboardPlaceholder(frame)) continue
    if (isRenderableImageSrc(frame)) sources.push(frame)
  }
  return sources
}

/**
 * The images a slide could show: the frames of the cells it cites, then its
 * own uploads. One list, in the order an author reads it, and the pool every
 * member of a strip is drawn from.
 */
export function slideImagePool(
  blueprint: BlueprintData | null,
  item: SlideWithStrip,
): { frames: string[]; images: string[] } {
  return {
    frames: resolveSlideStrip(blueprint, item),
    images: item.images.filter(isRenderableImageSrc),
  }
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
