import { STEP_COLUMN_GAP } from '@/lib/blueprintLayout'
import { resolveBlueprintCellId } from '@/lib/resolveBlueprintCellId'

export type Point = { x: number; y: number }

export type LayoutBox = {
  left: number
  right: number
  top: number
  height: number
}

export type CellAnchor = {
  source: Point
  target: Point
}

/** Arrowhead size (userSpaceOnUse) — Lucide-style filled tip. */
export const ARROW_CHEVRON_SIZE = 16
/** Half-height of the chevron base — keeps the UI-improvement 0.375 width ratio at the larger size. */
export const ARROW_CHEVRON_HALF_WIDTH = 6
export const ARROW_STROKE_WIDTH = 3
/** refX/refY: chevron base attaches to path end; tip extends toward target. */
export const ARROW_MARKER_REF_X = 0
export const ARROW_MARKER_REF_Y = ARROW_CHEVRON_SIZE / 2

/** Rounded bend radius for orthogonal loop arrows. */
export const ARROW_CORNER_RADIUS = 6
/** Inset around chevron marker graphic so round caps are not clipped. */
export const ARROW_MARKER_PAD = Math.ceil(ARROW_STROKE_WIDTH / 2 + 1)
/** Bleed room around the grid overlay so strokes, chevrons, and bends are not clipped. */
export const ARROW_VIEWPORT_PAD = Math.ceil(
  ARROW_STROKE_WIDTH / 2 + ARROW_CHEVRON_SIZE + ARROW_CORNER_RADIUS / 2,
)

/** Minimum clearance when detouring around obstructing cells. */
export const ARROW_DETOUR_CLEARANCE = 8

/** Target shorter than this fraction of source height → align to target center. */
export const ARROW_TARGET_MUCH_SMALLER_RATIO = 0.65

function isCrossLayerForwardTrigger(
  sourceEl: HTMLElement,
  targetEl: HTMLElement,
): boolean {
  const sourceStep = parseStepIndex(sourceEl)
  const targetStep = parseStepIndex(targetEl)
  if (sourceStep === null || targetStep === null) return false
  if (targetStep <= sourceStep) return false

  const sourceRow = getLayerRow(sourceEl)
  const targetRow = getLayerRow(targetEl)
  return Boolean(sourceRow && targetRow && sourceRow !== targetRow)
}

/**
 * Forward cross-column connector between different layer rows: exit the source
 * horizontally, travel in the column gap, then rise or drop into the target.
 */
export function buildCrossLayerForwardArrowPath(
  sourceEl: HTMLElement,
  targetEl: HTMLElement,
  root: HTMLElement,
): string {
  const sourceBox = getCellContentBox(sourceEl, root)
  const targetBox = getCellContentBox(targetEl, root)
  const sourceY = sourceBox.top + sourceBox.height / 2
  const targetY = targetBox.top + targetBox.height / 2
  const lineEndX = targetBox.left - ARROW_CHEVRON_SIZE

  const sourceStep = parseStepIndex(sourceEl)
  const routeX =
    getPreTargetGapCenterX(root, sourceEl, targetEl) ??
    (sourceStep !== null ? getStepGapCenterX(root, sourceStep) : null) ??
    (sourceBox.right + targetBox.left) / 2

  if (lineEndX <= sourceBox.right) return ''

  return buildRoundedPolylinePath(
    [
      { x: sourceBox.right, y: sourceY },
      { x: routeX, y: sourceY },
      { x: routeX, y: targetY },
      { x: lineEndX, y: targetY },
    ],
    ARROW_CORNER_RADIUS,
  )
}

function getLayerRow(el: HTMLElement): HTMLElement | null {
  return el.closest('[data-blueprint-row]')
}

/** Center X of the column gap after step column `gapIndex`. */
export function getStepGapCenterX(
  root: HTMLElement,
  gapIndex: number,
): number | null {
  const gapEl = root.querySelector<HTMLElement>(
    `[data-step-gap="${gapIndex}"]`,
  )
  if (!gapEl) return null

  const box = getElementLayoutBox(gapEl, root)
  return (box.left + box.right) / 2
}

/** Gutter to the left of a step column. */
export function getVerticalRouteGutterX(
  root: HTMLElement,
  stepIndex: number,
  sourceEl: HTMLElement,
): number {
  if (stepIndex > 0) {
    const leftGap = getStepGapCenterX(root, stepIndex - 1)
    if (leftGap !== null) return leftGap
  }

  const sourceBox = getCellContentBox(sourceEl, root)
  return sourceBox.left - STEP_COLUMN_GAP / 2
}

/** Center of the column gap immediately before the target step. */
export function getPreTargetGapCenterX(
  root: HTMLElement,
  sourceEl: HTMLElement,
  targetEl: HTMLElement,
): number | null {
  const targetIdx = parseStepIndex(targetEl)
  if (targetIdx === null || targetIdx <= 0) return null

  const layerRow = getLayerRow(sourceEl)
  if (!layerRow) return null

  const leftEl = layerRow.querySelector<HTMLElement>(
    `[data-blueprint-cell][data-step-index="${targetIdx - 1}"]`,
  )

  if (leftEl) {
    const leftBox = getCellContentBox(leftEl, root)
    const targetBox = getCellContentBox(targetEl, root)
    return (leftBox.right + targetBox.left) / 2
  }

  const targetBox = getCellContentBox(targetEl, root)
  return targetBox.left - STEP_COLUMN_GAP / 2
}

/** Cells in the same step column strictly between source and target vertically. */
export function getSameColumnObstructingCells(
  sourceEl: HTMLElement,
  targetEl: HTMLElement,
  root: HTMLElement,
): HTMLElement[] {
  const stepIndex = parseStepIndex(sourceEl)
  if (stepIndex === null || parseStepIndex(targetEl) !== stepIndex) {
    return []
  }

  const sourceBox = getCellContentBox(sourceEl, root)
  const targetBox = getCellContentBox(targetEl, root)
  const targetAbove =
    targetBox.top + targetBox.height / 2 <
    sourceBox.top + sourceBox.height / 2
  const gapTop = targetAbove
    ? targetBox.top + targetBox.height
    : sourceBox.top + sourceBox.height
  const gapBottom = targetAbove ? sourceBox.top : targetBox.top

  if (gapBottom <= gapTop) return []

  const columnLeft = Math.min(sourceBox.left, targetBox.left)
  const columnRight = Math.max(sourceBox.right, targetBox.right)

  const obstructing: HTMLElement[] = []
  root.querySelectorAll<HTMLElement>('[data-blueprint-cell]').forEach((el) => {
    if (el === sourceEl || el === targetEl) return
    if (parseStepIndex(el) !== stepIndex) return

    const box = getCellContentBox(el, root)
    if (box.right <= columnLeft || box.left >= columnRight) return
    if (box.top >= gapBottom || box.top + box.height <= gapTop) return

    obstructing.push(el)
  })

  return obstructing
}

/** Cells in the same lane row whose columns sit strictly between source and target. */
export function getSameRowObstructingCells(
  sourceEl: HTMLElement,
  targetEl: HTMLElement,
): HTMLElement[] {
  const sourceIdx = parseStepIndex(sourceEl)
  const targetIdx = parseStepIndex(targetEl)
  if (sourceIdx === null || targetIdx === null) return []

  const lo = Math.min(sourceIdx, targetIdx) + 1
  const hi = Math.max(sourceIdx, targetIdx) - 1
  if (lo > hi) return []

  const layerRow = getLayerRow(sourceEl)
  if (!layerRow) return []

  const obstructing: HTMLElement[] = []
  layerRow.querySelectorAll<HTMLElement>('[data-blueprint-cell]').forEach((el) => {
    const idx = parseStepIndex(el)
    if (idx === null || idx < lo || idx > hi) return
    obstructing.push(el)
  })

  return obstructing
}

/** Top/bottom center anchors for same-column gutter detours. */
export function getVerticalGutterDetourAnchors(
  sourceEl: HTMLElement,
  targetEl: HTMLElement,
  root: HTMLElement,
): CellAnchor {
  return getVerticalCellAnchors(sourceEl, targetEl, root)
}

/**
 * Same-column connector routed through the left column gutter; exits and
 * enters at top/bottom center of each cell.
 */
export function buildVerticalGutterDetourPath(
  source: Point,
  target: Point,
  gutterX: number,
): string {
  if (gutterX >= Math.min(source.x, target.x)) return ''

  return buildRoundedPolylinePath(
    [
      source,
      { x: gutterX, y: source.y },
      { x: gutterX, y: target.y },
      target,
    ],
    ARROW_CORNER_RADIUS,
  )
}

/** Horizontal connector detours above skipped cells via column gutters. */
export function buildHorizontalGutterDetourPath(
  sourceEl: HTMLElement,
  targetEl: HTMLElement,
  root: HTMLElement,
): string {
  const sourceBox = getCellContentBox(sourceEl, root)
  const targetBox = getCellContentBox(targetEl, root)
  const routeY = getArrowCenterY(sourceEl, targetEl, root)
  const entryX = targetBox.left - ARROW_CHEVRON_SIZE
  const sourceStep = parseStepIndex(sourceEl)
  if (sourceStep === null) return ''

  const obstructing = getSameRowObstructingCells(sourceEl, targetEl)
  let detourY = routeY
  for (const el of obstructing) {
    const box = getCellContentBox(el, root)
    detourY = Math.min(detourY, box.top - ARROW_DETOUR_CLEARANCE)
  }

  const exitGapX =
    getStepGapCenterX(root, sourceStep) ??
    sourceBox.right + STEP_COLUMN_GAP / 2
  const riseX =
    getPreTargetGapCenterX(root, sourceEl, targetEl) ??
    entryX - Math.max(28, ARROW_CORNER_RADIUS * 2.5)

  return buildRoundedPolylinePath(
    [
      { x: sourceBox.right, y: routeY },
      { x: exitGapX, y: routeY },
      { x: exitGapX, y: detourY },
      { x: riseX, y: detourY },
      { x: riseX, y: routeY },
      { x: entryX, y: routeY },
    ],
    ARROW_CORNER_RADIUS,
  )
}

export function parseStepIndex(cellEl: HTMLElement): number | null {
  const raw = cellEl.dataset.stepIndex
  if (raw === undefined) return null
  const index = Number.parseInt(raw, 10)
  return Number.isFinite(index) ? index : null
}

/** Backward trigger (target column earlier than source) — routed as a loop. */
export function isWrapTrigger(
  sourceEl: HTMLElement,
  targetEl: HTMLElement,
): boolean {
  const sourceStep = parseStepIndex(sourceEl)
  const targetStep = parseStepIndex(targetEl)
  return (
    sourceStep !== null &&
    targetStep !== null &&
    targetStep < sourceStep
  )
}

/** Layout box relative to the grid root (viewport-corrected for canvas zoom). */
export function getElementLayoutBox(
  el: HTMLElement,
  root: HTMLElement,
): LayoutBox {
  const elRect = el.getBoundingClientRect()
  const rootRect = root.getBoundingClientRect()
  const scaleX =
    root.offsetWidth > 0 ? rootRect.width / root.offsetWidth : 1
  const scaleY =
    root.offsetHeight > 0 ? rootRect.height / root.offsetHeight : 1

  return {
    left: (elRect.left - rootRect.left) / scaleX,
    right: (elRect.right - rootRect.left) / scaleX,
    top: (elRect.top - rootRect.top) / scaleY,
    height: elRect.height / scaleY,
  }
}

/** Inner content box — union of visible cell card edges in the lane. */
export function getCellContentBox(
  cellEl: HTMLElement,
  root: HTMLElement,
): LayoutBox {
  const anchors = cellEl.querySelectorAll<HTMLElement>(
    '[data-blueprint-cell-anchor]',
  )
  if (anchors.length === 0) {
    return getElementLayoutBox(cellEl, root)
  }
  if (anchors.length === 1) {
    return getElementLayoutBox(anchors[0]!, root)
  }

  let left = Infinity
  let right = -Infinity
  let top = Infinity
  let bottom = -Infinity

  for (const anchor of anchors) {
    const box = getElementLayoutBox(anchor, root)
    left = Math.min(left, box.left)
    right = Math.max(right, box.right)
    top = Math.min(top, box.top)
    bottom = Math.max(bottom, box.top + box.height)
  }

  return { left, right, top, height: bottom - top }
}

/** Inset from the interaction line for loop-back horizontal segments. */
export const WRAP_LOOP_CORRIDOR_INSET = 10

/** Inset above cell tops for in-lane loop-back horizontal segments. */
export const IN_LANE_LOOP_TOP_INSET = 8

/**
 * Backward loop whose source and target sit on the same lane row — routed
 * through the corridor reserved at the top of that lane. Purely positional
 * (step indexes + shared row); no scenario or cell-ID identity.
 */
export function isInLaneWrapTrigger(
  sourceEl: HTMLElement,
  targetEl: HTMLElement,
): boolean {
  const sourceStep = parseStepIndex(sourceEl)
  const targetStep = parseStepIndex(targetEl)
  if (sourceStep === null || targetStep === null || targetStep >= sourceStep) {
    return false
  }

  const sourceRow = getLayerRow(sourceEl)
  const targetRow = getLayerRow(targetEl)
  return Boolean(sourceRow && targetRow && sourceRow === targetRow)
}

/** Horizontal lane for in-lane loop arrows — centered in the lane's top corridor. */
export function getInLaneLoopRouteY(
  sourceEl: HTMLElement,
  targetEl: HTMLElement,
  root: HTMLElement,
): number {
  const row = getLayerRow(sourceEl)
  if (row) {
    const loopCorridor = row.querySelector<HTMLElement>(
      '[data-blueprint-loop-corridor="above"]',
    )
    if (loopCorridor) {
      const corridorBox = getElementLayoutBox(loopCorridor, root)
      return corridorBox.top + corridorBox.height / 2
    }
  }

  const sourceBox = getCellContentBox(sourceEl, root)
  const targetBox = getCellContentBox(targetEl, root)
  const cellTop = Math.min(sourceBox.top, targetBox.top)
  return cellTop - IN_LANE_LOOP_TOP_INSET
}

/**
 * In-lane loop-back: up from source top, across inside the swimlane, then
 * down into the target top.
 */
export function buildInLaneTopWrapPath(
  sourceEl: HTMLElement,
  targetEl: HTMLElement,
  root: HTMLElement,
): string {
  const source = getCellTopCenter(sourceEl, root)
  const target = getCellTopCenter(targetEl, root)
  const routeY = getInLaneLoopRouteY(sourceEl, targetEl, root)

  // Wrap runs right → left; target must sit in an earlier column.
  if (target.x >= source.x) return ''

  if (routeY >= source.y) return ''

  const lineEndY = target.y - ARROW_CHEVRON_SIZE
  if (lineEndY <= routeY) return ''

  return buildRoundedPolylinePath(
    [
      source,
      { x: source.x, y: routeY },
      { x: target.x, y: routeY },
      { x: target.x, y: lineEndY },
    ],
    ARROW_CORNER_RADIUS,
  )
}


export type WrapCorridorBounds = {
  start: number
  end: number
}

/** Vertical span between a lane row bottom and the next wrap corridor or interaction line. */
export function getWrapCorridorBounds(
  sourceEl: HTMLElement,
  root: HTMLElement,
): WrapCorridorBounds | null {
  const sourceBox = getCellContentBox(sourceEl, root)
  const corridorStart = sourceBox.top + sourceBox.height

  const row = sourceEl.closest('[data-blueprint-row]')
  if (row) {
    const inlineCorridor = row.querySelector<HTMLElement>(
      '[data-blueprint-wrap-corridor="below"]',
    )
    if (inlineCorridor) {
      const corridorBox = getElementLayoutBox(inlineCorridor, root)
      const corridorBottom = corridorBox.top + corridorBox.height
      if (corridorBottom > corridorStart) {
        return { start: corridorStart, end: corridorBottom }
      }
    }

    let sibling = row.nextElementSibling
    while (sibling) {
      if (
        sibling instanceof HTMLElement &&
        sibling.dataset.blueprintWrapCorridor === 'below'
      ) {
        const corridorBox = getElementLayoutBox(sibling, root)
        const corridorBottom = corridorBox.top + corridorBox.height
        if (corridorBottom > corridorStart) {
          return { start: corridorStart, end: corridorBottom }
        }
      }
      sibling = sibling.nextElementSibling
    }

    sibling = row.nextElementSibling
    while (sibling) {
      if (
        sibling instanceof HTMLElement &&
        sibling.dataset.blueprintRow !== undefined
      ) {
        const nextRowBox = getElementLayoutBox(sibling, root)
        if (nextRowBox.top > corridorStart) {
          return { start: corridorStart, end: nextRowBox.top }
        }
        break
      }
      sibling = sibling.nextElementSibling
    }

    sibling = row.nextElementSibling
    while (sibling) {
      if (
        sibling instanceof HTMLElement &&
        sibling.dataset.blueprintDivider === 'interaction'
      ) {
        const dividerBox = getElementLayoutBox(sibling, root)
        const corridorEnd = dividerBox.top
        if (corridorEnd > corridorStart) {
          return { start: corridorStart, end: corridorEnd }
        }
        return {
          start: corridorStart,
          end: dividerBox.top + dividerBox.height,
        }
      }
      if (
        sibling instanceof HTMLElement &&
        sibling.dataset.blueprintDivider !== undefined
      ) {
        break
      }
      sibling = sibling.nextElementSibling
    }
  }

  return {
    start: corridorStart,
    end: corridorStart + BLUEPRINT_WRAP_CORRIDOR_FALLBACK_MARGIN,
  }
}

/** Fallback corridor height when no corridor / divider markup is present. */
const BLUEPRINT_WRAP_CORRIDOR_FALLBACK_MARGIN = 36

/** Y center of the corridor between a layer row and the interaction line. */
export function getWrapCorridorY(
  sourceEl: HTMLElement,
  root: HTMLElement,
): number {
  const bounds = getWrapCorridorBounds(sourceEl, root)
  if (bounds) {
    return (bounds.start + bounds.end) / 2
  }

  const sourceBox = getCellContentBox(sourceEl, root)
  return (
    sourceBox.top +
    sourceBox.height +
    BLUEPRINT_WRAP_CORRIDOR_FALLBACK_MARGIN / 2
  )
}

/** Horizontal lane for loop-back arrows — kept low in the corridor. */
export function getWrapLoopRouteY(
  sourceEl: HTMLElement,
  root: HTMLElement,
): number {
  const bounds = getWrapCorridorBounds(sourceEl, root)
  if (!bounds) {
    return getWrapCorridorY(sourceEl, root)
  }

  const height = bounds.end - bounds.start
  const inset = Math.min(WRAP_LOOP_CORRIDOR_INSET, height * 0.35)
  return bounds.end - inset
}

/**
 * Arrow Y: source cell center by default; target center when target is much shorter.
 */
export function getArrowCenterY(
  sourceEl: HTMLElement,
  targetEl: HTMLElement,
  root: HTMLElement,
): number {
  const sourceBox = getCellContentBox(sourceEl, root)
  const targetBox = getCellContentBox(targetEl, root)
  const sourceCenterY = sourceBox.top + sourceBox.height / 2
  const targetCenterY = targetBox.top + targetBox.height / 2

  if (
    targetBox.height <
    sourceBox.height * ARROW_TARGET_MUCH_SMALLER_RATIO
  ) {
    return targetCenterY
  }

  return sourceCenterY
}

/** Loop arrows exit the source bottom and enter the target bottom (horizontal center). */
export function getWrapCellAnchors(
  sourceEl: HTMLElement,
  targetEl: HTMLElement,
  root: HTMLElement,
): CellAnchor {
  const sourceBox = getCellContentBox(sourceEl, root)
  const targetBox = getCellContentBox(targetEl, root)

  return {
    source: {
      x: (sourceBox.left + sourceBox.right) / 2,
      y: sourceBox.top + sourceBox.height,
    },
    target: {
      x: (targetBox.left + targetBox.right) / 2,
      y: targetBox.top + targetBox.height,
    },
  }
}

/** Connectors anchor to top/bottom center when source and target share a step column. */
export function getVerticalCellAnchors(
  sourceEl: HTMLElement,
  targetEl: HTMLElement,
  root: HTMLElement,
): CellAnchor {
  const sourceBox = getCellContentBox(sourceEl, root)
  const targetBox = getCellContentBox(targetEl, root)
  const sourceMidY = sourceBox.top + sourceBox.height / 2
  const targetMidY = targetBox.top + targetBox.height / 2
  const targetAbove = targetMidY < sourceMidY
  const sourceCenterX = (sourceBox.left + sourceBox.right) / 2
  const targetCenterX = (targetBox.left + targetBox.right) / 2
  const x = (sourceCenterX + targetCenterX) / 2

  if (targetAbove) {
    return {
      source: { x, y: sourceBox.top },
      target: { x, y: targetBox.top + targetBox.height },
    }
  }

  return {
    source: { x, y: sourceBox.top + sourceBox.height },
    target: { x, y: targetBox.top },
  }
}

/**
 * Straight line between vertically aligned cells in the same step column;
 * chevron tip sits on the target edge.
 */
export function buildVerticalArrowPath(
  source: Point,
  target: Point,
): string {
  const goingUp = target.y < source.y
  if (goingUp) {
    const lineEndY = target.y + ARROW_CHEVRON_SIZE
    if (lineEndY >= source.y) return ''
    return `M ${source.x} ${source.y} L ${source.x} ${lineEndY}`
  }

  const lineEndY = target.y - ARROW_CHEVRON_SIZE
  if (lineEndY <= source.y) return ''
  return `M ${source.x} ${source.y} L ${source.x} ${lineEndY}`
}

export type BidirectionalTriggerLink = {
  id: string
  source_cell_id: string
  target_cell_id: string
}

export type BidirectionalTriggerPair<T extends BidirectionalTriggerLink> = {
  first: T
  second: T
  cellAId: string
  cellBId: string
}

/** Pairs of triggers that connect the same two cells in opposite directions. */
export function findBidirectionalTriggerPairs<T extends BidirectionalTriggerLink>(
  triggers: T[],
): { pairs: BidirectionalTriggerPair<T>[]; remaining: T[] } {
  const pending = new Map<string, T>()
  const pairedIds = new Set<string>()
  const pairs: BidirectionalTriggerPair<T>[] = []

  for (const trigger of triggers) {
    const reverseKey = `${trigger.target_cell_id}->${trigger.source_cell_id}`
    const reverse = pending.get(reverseKey)
    if (reverse) {
      pairedIds.add(trigger.id)
      pairedIds.add(reverse.id)
      pairs.push({
        first: reverse,
        second: trigger,
        cellAId: reverse.source_cell_id,
        cellBId: reverse.target_cell_id,
      })
      pending.delete(reverseKey)
      continue
    }

    pending.set(
      `${trigger.source_cell_id}->${trigger.target_cell_id}`,
      trigger,
    )
  }

  return {
    pairs,
    remaining: triggers.filter((trigger) => !pairedIds.has(trigger.id)),
  }
}

/**
 * Double-headed vertical connector between two cells in the same step column.
 * The stroke is inset so arrowheads sit on the cell edges, not through them.
 */
export function buildBidirectionalVerticalArrowPath(
  cellAEl: HTMLElement,
  cellBEl: HTMLElement,
  root: HTMLElement,
): string {
  const boxA = getCellContentBox(cellAEl, root)
  const boxB = getCellContentBox(cellBEl, root)
  const aAbove =
    boxA.top + boxA.height / 2 <= boxB.top + boxB.height / 2
  const upperEl = aAbove ? cellAEl : cellBEl
  const lowerEl = aAbove ? cellBEl : cellAEl
  const anchors = getVerticalCellAnchors(upperEl, lowerEl, root)
  const y1 = anchors.source.y + ARROW_CHEVRON_SIZE
  const y2 = anchors.target.y - ARROW_CHEVRON_SIZE
  if (y2 <= y1) return ''
  return `M ${anchors.source.x} ${y1} L ${anchors.source.x} ${y2}`
}

export function buildBidirectionalArrowPath(
  cellAEl: HTMLElement,
  cellBEl: HTMLElement,
  root: HTMLElement,
): string {
  const stepA = parseStepIndex(cellAEl)
  const stepB = parseStepIndex(cellBEl)
  if (stepA === null || stepB === null || stepA !== stepB) return ''

  const rowA = getLayerRow(cellAEl)
  const rowB = getLayerRow(cellBEl)
  if (!rowA || !rowB || rowA === rowB) return ''

  return buildBidirectionalVerticalArrowPath(cellAEl, cellBEl, root)
}

/** Map integrated overlay cell ids back to canonical blueprint cell ids for arrow rules. */
export function resolveArrowLogicCellId(cellId: string): string {
  return resolveBlueprintCellId(cellId)
}

const INTEGRATED_TRIGGER_ID_PATTERN =
  /^integrated-trigger-[0-9a-f-]{36}-([0-9a-f-]{36})$/i

/** Map integrated overlay trigger ids back to canonical trigger ids. */
export function resolveArrowLogicTriggerId(triggerId: string): string {
  const match = INTEGRATED_TRIGGER_ID_PATTERN.exec(triggerId)
  return match ? match[1]! : triggerId
}

/** Top-center anchor on the visible cell card. */
export function getCellTopCenter(
  cellEl: HTMLElement,
  root: HTMLElement,
): Point {
  const box = getCellContentBox(cellEl, root)
  return {
    x: (box.left + box.right) / 2,
    y: box.top,
  }
}

/** Connectors anchor to the outer edges of the visible cell cards. */
export function getHorizontalCellAnchors(
  sourceEl: HTMLElement,
  targetEl: HTMLElement,
  root: HTMLElement,
): CellAnchor {
  const sourceBox = getCellContentBox(sourceEl, root)
  const targetBox = getCellContentBox(targetEl, root)
  const y = getArrowCenterY(sourceEl, targetEl, root)

  return {
    source: {
      x: sourceBox.right,
      y,
    },
    target: {
      x: targetBox.left,
      y,
    },
  }
}

/**
 * Straight line from source cell right edge to target cell left edge;
 * chevron tip sits on the target edge.
 */
export function buildHorizontalArrowPath(
  source: Point,
  target: Point,
): string {
  const lineEndX = target.x - ARROW_CHEVRON_SIZE
  if (lineEndX <= source.x) {
    return ''
  }

  return `M ${source.x} ${source.y} L ${lineEndX} ${source.y}`
}

/**
 * Forward connector between adjacent step columns on the same row, routed
 * through the center of the column gap.
 */
export function buildAdjacentColumnGapArrowPath(
  sourceEl: HTMLElement,
  targetEl: HTMLElement,
  root: HTMLElement,
): string {
  const sourceBox = getCellContentBox(sourceEl, root)
  const targetBox = getCellContentBox(targetEl, root)
  const y = getArrowCenterY(sourceEl, targetEl, root)
  const sourceStep = parseStepIndex(sourceEl)
  const gapX =
    (sourceStep !== null ? getStepGapCenterX(root, sourceStep) : null) ??
    (sourceBox.right + targetBox.left) / 2
  const entryX = targetBox.left - ARROW_CHEVRON_SIZE

  if (entryX <= sourceBox.right) return ''

  return buildRoundedPolylinePath(
    [
      { x: sourceBox.right, y },
      { x: gapX, y },
      { x: entryX, y },
    ],
    ARROW_CORNER_RADIUS,
  )
}

/**
 * Forward connector across one or more step columns on the same row, routed
 * through each column gap.
 */
export function buildSpanningColumnGapArrowPath(
  sourceEl: HTMLElement,
  targetEl: HTMLElement,
  root: HTMLElement,
): string {
  const sourceBox = getCellContentBox(sourceEl, root)
  const targetBox = getCellContentBox(targetEl, root)
  const y = getArrowCenterY(sourceEl, targetEl, root)
  const sourceStep = parseStepIndex(sourceEl)
  const targetStep = parseStepIndex(targetEl)
  const entryX = targetBox.left - ARROW_CHEVRON_SIZE

  if (sourceStep === null || targetStep === null || targetStep <= sourceStep) {
    return ''
  }

  if (entryX <= sourceBox.right) return ''

  const points: Point[] = [{ x: sourceBox.right, y }]

  for (let gapIndex = sourceStep; gapIndex < targetStep; gapIndex++) {
    const gapX = getStepGapCenterX(root, gapIndex)
    if (gapX !== null) {
      points.push({ x: gapX, y })
    }
  }

  points.push({ x: entryX, y })

  return buildRoundedPolylinePath(points, ARROW_CORNER_RADIUS)
}

/** Rounded corners at each interior vertex of an axis-aligned polyline. */
export function buildRoundedPolylinePath(
  points: Point[],
  radius: number,
): string {
  if (points.length < 2) return ''
  if (points.length === 2) {
    return `M ${points[0].x} ${points[0].y} L ${points[1].x} ${points[1].y}`
  }

  const parts = [`M ${points[0].x} ${points[0].y}`]

  for (let i = 1; i < points.length - 1; i++) {
    const prev = points[i - 1]
    const corner = points[i]
    const next = points[i + 1]

    const inLen = Math.hypot(corner.x - prev.x, corner.y - prev.y)
    const outLen = Math.hypot(next.x - corner.x, next.y - corner.y)
    if (inLen === 0 || outLen === 0) {
      parts.push(`L ${corner.x} ${corner.y}`)
      continue
    }

    const cornerRadius = Math.min(radius, inLen / 2, outLen / 2)
    if (cornerRadius <= 0) {
      parts.push(`L ${corner.x} ${corner.y}`)
      continue
    }

    const inUx = (corner.x - prev.x) / inLen
    const inUy = (corner.y - prev.y) / inLen
    const outUx = (next.x - corner.x) / outLen
    const outUy = (next.y - corner.y) / outLen

    parts.push(
      `L ${corner.x - inUx * cornerRadius} ${corner.y - inUy * cornerRadius}`,
    )
    parts.push(
      `Q ${corner.x} ${corner.y} ${corner.x + outUx * cornerRadius} ${corner.y + outUy * cornerRadius}`,
    )
  }

  const end = points[points.length - 1]
  parts.push(`L ${end.x} ${end.y}`)
  return parts.join(' ')
}

/**
 * Orthogonal wrap: same-lane loops ride the corridor reserved at the top of
 * the lane; cross-lane loops drop into the corridor below the source row,
 * across, then up into the target bottom.
 */
export function buildWrapArrowPath(
  sourceEl: HTMLElement,
  targetEl: HTMLElement,
  root: HTMLElement,
): string {
  if (isInLaneWrapTrigger(sourceEl, targetEl)) {
    return buildInLaneTopWrapPath(sourceEl, targetEl, root)
  }

  const { source, target } = getWrapCellAnchors(sourceEl, targetEl, root)
  const corridorY = getWrapLoopRouteY(sourceEl, root)

  // Wrap runs right → left; target must sit in an earlier column.
  if (target.x >= source.x) {
    return ''
  }

  const lineEndY = target.y + ARROW_CHEVRON_SIZE

  return buildRoundedPolylinePath(
    [
      source,
      { x: source.x, y: corridorY },
      { x: target.x, y: corridorY },
      { x: target.x, y: lineEndY },
    ],
    ARROW_CORNER_RADIUS,
  )
}

/** Forward gap arrow, same-column vertical connector, or backward wrap. */
export function buildArrowPath(
  sourceEl: HTMLElement,
  targetEl: HTMLElement,
  root: HTMLElement,
): string {
  const sourceStep = parseStepIndex(sourceEl)
  const targetStep = parseStepIndex(targetEl)

  if (
    sourceStep !== null &&
    targetStep !== null &&
    sourceStep === targetStep
  ) {
    const anchors = getVerticalCellAnchors(sourceEl, targetEl, root)
    const obstructing = getSameColumnObstructingCells(
      sourceEl,
      targetEl,
      root,
    )
    if (obstructing.length > 0) {
      const gutterX = getVerticalRouteGutterX(root, sourceStep, sourceEl)
      const detourAnchors = getVerticalGutterDetourAnchors(
        sourceEl,
        targetEl,
        root,
      )
      return buildVerticalGutterDetourPath(
        detourAnchors.source,
        detourAnchors.target,
        gutterX,
      )
    }
    return buildVerticalArrowPath(anchors.source, anchors.target)
  }

  if (isWrapTrigger(sourceEl, targetEl)) {
    return buildWrapArrowPath(sourceEl, targetEl, root)
  }

  if (
    sourceStep !== null &&
    targetStep !== null &&
    targetStep === sourceStep + 1 &&
    getLayerRow(sourceEl) === getLayerRow(targetEl)
  ) {
    return buildAdjacentColumnGapArrowPath(sourceEl, targetEl, root)
  }

  if (isCrossLayerForwardTrigger(sourceEl, targetEl)) {
    return buildCrossLayerForwardArrowPath(sourceEl, targetEl, root)
  }

  if (getSameRowObstructingCells(sourceEl, targetEl).length > 0) {
    return buildHorizontalGutterDetourPath(sourceEl, targetEl, root)
  }

  const anchors = getHorizontalCellAnchors(sourceEl, targetEl, root)
  return buildHorizontalArrowPath(anchors.source, anchors.target)
}
