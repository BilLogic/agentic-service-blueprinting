import {
  BLUEPRINT_OVERHEAD_RAIL_CORRIDOR_MARGIN,
  BLUEPRINT_WRAP_CORRIDOR_MARGIN,
  STEP_COLUMN_GAP,
} from '@/lib/blueprintLayout'

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

function isCrossLaneForwardTrigger(
  sourceEl: HTMLElement,
  targetEl: HTMLElement,
): boolean {
  const sourceStep = parseStepIndex(sourceEl)
  const targetStep = parseStepIndex(targetEl)
  if (sourceStep === null || targetStep === null) return false
  if (targetStep <= sourceStep) return false

  const sourceRow = getLaneRow(sourceEl)
  const targetRow = getLaneRow(targetEl)
  return Boolean(sourceRow && targetRow && sourceRow !== targetRow)
}

/** Is a horizontal run at `y` between two X values clear of every other card? */
function isHorizontalRunClear(
  root: HTMLElement,
  fromX: number,
  toX: number,
  y: number,
  exclude: readonly HTMLElement[],
): boolean {
  return (
    getCellsOverlappingRect(
      root,
      {
        left: Math.min(fromX, toX),
        right: Math.max(fromX, toX),
        top: y - ARROW_DETOUR_CLEARANCE,
        bottom: y + ARROW_DETOUR_CLEARANCE,
      },
      exclude,
    ).length === 0
  )
}

/**
 * Forward cross-column connector between different lane rows: exit the source
 * horizontally, travel in a column gap, then rise or drop into the target.
 *
 * The long horizontal leg is the one that can strike a card, and which side it
 * is safe on depends on the board: the source's own row may carry the columns
 * the connector skips, or the target's may, or both. So the leg is placed on
 * whichever row is clear, and when neither is, the run moves out of the rows
 * entirely and crosses in the strip above the target lane. Travelling far along
 * a lane at a card's own centre line is never assumed.
 */
export function buildCrossLaneForwardArrowPath(
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
  const preTargetX =
    getPreTargetGapCenterX(root, sourceEl, targetEl) ??
    (sourceStep !== null ? getStepGapCenterX(root, sourceStep) : null) ??
    (sourceBox.right + targetBox.left) / 2
  const exitGapX =
    sourceStep !== null
      ? getVerticalRouteRightGutterX(root, sourceStep, sourceEl)
      : preTargetX

  if (lineEndX <= sourceBox.right) return ''

  const ends = [sourceEl, targetEl]

  // Drop late: the long leg runs along the SOURCE row to the gap before the
  // target column. Only when that row is empty in between.
  if (isHorizontalRunClear(root, sourceBox.right, preTargetX, sourceY, ends)) {
    return buildRoundedPolylinePath(
      [
        { x: sourceBox.right, y: sourceY },
        { x: preTargetX, y: sourceY },
        { x: preTargetX, y: targetY },
        { x: lineEndX, y: targetY },
      ],
      ARROW_CORNER_RADIUS,
    )
  }

  // Drop early: leave through the gap right after the source and run the long
  // leg along the TARGET row instead.
  if (
    exitGapX > sourceBox.right &&
    isHorizontalRunClear(root, exitGapX, lineEndX, targetY, ends)
  ) {
    return buildRoundedPolylinePath(
      [
        { x: sourceBox.right, y: sourceY },
        { x: exitGapX, y: sourceY },
        { x: exitGapX, y: targetY },
        { x: lineEndX, y: targetY },
      ],
      ARROW_CORNER_RADIUS,
    )
  }

  // Both rows are occupied in between: cross above the target lane, where the
  // row's own headroom leaves the strip clear, and drop in at the last gap.
  const bandY = getLaneContentTop(targetEl, root) - ARROW_DETOUR_CLEARANCE
  return buildRoundedPolylinePath(
    [
      { x: sourceBox.right, y: sourceY },
      { x: exitGapX, y: sourceY },
      { x: exitGapX, y: bandY },
      { x: preTargetX, y: bandY },
      { x: preTargetX, y: targetY },
      { x: lineEndX, y: targetY },
    ],
    ARROW_CORNER_RADIUS,
  )
}

function getLaneRow(el: HTMLElement): HTMLElement | null {
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

/** Gutter to the right of a step column. */
export function getVerticalRouteRightGutterX(
  root: HTMLElement,
  stepIndex: number,
  sourceEl: HTMLElement,
): number {
  const rightGap = getStepGapCenterX(root, stepIndex)
  if (rightGap !== null) return rightGap

  const sourceBox = getCellContentBox(sourceEl, root)
  return sourceBox.right + STEP_COLUMN_GAP / 2
}

/** Center of the column gap immediately before the target step. */
export function getPreTargetGapCenterX(
  root: HTMLElement,
  sourceEl: HTMLElement,
  targetEl: HTMLElement,
): number | null {
  const targetIdx = parseStepIndex(targetEl)
  if (targetIdx === null || targetIdx <= 0) return null

  const laneRow = getLaneRow(sourceEl)
  if (!laneRow) return null

  const leftEl = laneRow.querySelector<HTMLElement>(
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
  for (const el of queryBlueprintCells(root, root)) {
    if (el === sourceEl || el === targetEl) continue
    if (parseStepIndex(el) !== stepIndex) continue

    const box = getCellContentBox(el, root)
    if (box.right <= columnLeft || box.left >= columnRight) continue
    if (box.top >= gapBottom || box.top + box.height <= gapTop) continue

    obstructing.push(el)
  }

  return obstructing
}

/**
 * Cells whose card overlaps a rectangle, ignoring the arrow's own endpoints.
 *
 * The step-index-keyed helpers above answer "what sits between these two
 * cells"; this one answers "is this stretch of the canvas actually empty",
 * which is what a route needs before it commits to travelling through a
 * column. The merged compare canvas made the distinction matter: a slot
 * stacks one sub-cell per path, so the space below a cell inside its own
 * column is no longer reliably free.
 */
export function getCellsOverlappingRect(
  root: HTMLElement,
  rect: { left: number; right: number; top: number; bottom: number },
  exclude: readonly HTMLElement[],
): HTMLElement[] {
  if (rect.bottom <= rect.top || rect.right <= rect.left) return []

  const overlapping: HTMLElement[] = []
  for (const el of queryBlueprintCells(root, root)) {
    if (
      exclude.some(
        (other) => other === el || other.contains(el) || el.contains(other),
      )
    ) {
      continue
    }

    const box = getCellContentBox(el, root)
    if (box.right <= rect.left || box.left >= rect.right) continue
    if (box.top >= rect.bottom || box.top + box.height <= rect.top) continue

    overlapping.push(el)
  }

  return overlapping
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

  const laneRow = getLaneRow(sourceEl)
  if (!laneRow) return []

  const obstructing: HTMLElement[] = []
  laneRow.querySelectorAll<HTMLElement>('[data-blueprint-cell]').forEach((el) => {
    const idx = parseStepIndex(el)
    if (idx === null || idx < lo || idx > hi) return
    obstructing.push(el)
  })

  return obstructing
}

/**
 * Anchors for same-column gutter detours: exit at the source's top/bottom
 * center, but enter horizontally at the target's left edge, vertically
 * centered on the target's own card. The detour's final segment approaches
 * from the gutter side, so a top/bottom-center (vertical-entry) anchor would
 * leave the chevron riding along the target's top edge — for stacked pill
 * targets that puts the head in the gap between neighbouring pills.
 */
export function getVerticalGutterDetourAnchors(
  sourceEl: HTMLElement,
  targetEl: HTMLElement,
  root: HTMLElement,
): CellAnchor {
  const { source } = getVerticalCellAnchors(sourceEl, targetEl, root)
  const targetBox = getCellContentBox(targetEl, root)

  return {
    source,
    target: {
      // Inset so the chevron tip sits on the target's left edge, not through it.
      x: targetBox.left - ARROW_CHEVRON_SIZE,
      y: targetBox.top + targetBox.height / 2,
    },
  }
}

/** Which column gutter a same-column connector brackets through. */
export type SameColumnSide = 'left' | 'right'

export type SameColumnSideRoute = {
  side: SameColumnSide
  gutterX: number
}

/**
 * Is the whole bracket — both side stubs and the gutter run between them —
 * clear of every other card? Each leg is tested as a band `ARROW_DETOUR_CLEARANCE`
 * either side of the drawn line, so a route that merely grazes a card is
 * rejected too.
 */
function isSameColumnSideRouteClear(
  root: HTMLElement,
  side: SameColumnSide,
  gutterX: number,
  legs: readonly { box: LayoutBox; y: number }[],
  exclude: readonly HTMLElement[],
): boolean {
  for (const leg of legs) {
    const stubRect =
      side === 'left'
        ? { left: gutterX, right: leg.box.left }
        : { left: leg.box.right, right: gutterX }
    if (
      getCellsOverlappingRect(
        root,
        {
          ...stubRect,
          top: leg.y - ARROW_DETOUR_CLEARANCE,
          bottom: leg.y + ARROW_DETOUR_CLEARANCE,
        },
        exclude,
      ).length > 0
    ) {
      return false
    }
  }

  const ys = legs.map((leg) => leg.y)
  return (
    getCellsOverlappingRect(
      root,
      {
        left: gutterX - ARROW_DETOUR_CLEARANCE,
        right: gutterX + ARROW_DETOUR_CLEARANCE,
        top: Math.min(...ys) - ARROW_DETOUR_CLEARANCE,
        bottom: Math.max(...ys) + ARROW_DETOUR_CLEARANCE,
      },
      exclude,
    ).length === 0
  )
}

const SAME_COLUMN_SIDE_TIE_BREAK: Record<SameColumnSide, number> = {
  left: 0,
  right: 1,
}

type RememberedSideRoute = {
  side: SameColumnSide
  cellAEl: HTMLElement
  cellBEl: HTMLElement
}

/**
 * The side each connected pair settled on, so a pair that already has one keeps
 * it. See `resolveSameColumnSideRoute` for why.
 */
const rememberedSideRoutes = new Map<string, RememberedSideRoute>()

/** Order-independent key for a pair of cells. */
function getSameColumnPairKey(
  cellAEl: HTMLElement,
  cellBEl: HTMLElement,
): string | null {
  const idA = cellAEl.getAttribute('data-blueprint-cell')
  const idB = cellBEl.getAttribute('data-blueprint-cell')
  if (!idA || !idB) return null
  return idA <= idB ? `${idA}->${idB}` : `${idB}->${idA}`
}

/**
 * Forget pairs whose cells have left the DOM — a collapsed lane, a switched
 * scenario, a re-rendered board. Without this the memory would both pin a stale
 * side onto a cell id that came back in a different place and hold detached
 * nodes alive.
 */
function pruneRememberedSideRoutes(): void {
  for (const [key, entry] of rememberedSideRoutes) {
    if (!entry.cellAEl.isConnected || !entry.cellBEl.isConnected) {
      rememberedSideRoutes.delete(key)
    }
  }
}

/** Drop every remembered side — for tests and hard board resets. */
export function clearRememberedSameColumnSideRoutes(): void {
  rememberedSideRoutes.clear()
}

/**
 * The gutter a pair of same-column cells can be bracketed through, or null when
 * neither side is usable. Both gutters are considered; the nearer one wins so
 * the detour stays short, and left breaks a tie.
 *
 * Deliberately symmetric in its two cells — every input is a min/max over the
 * pair, never "the source's" anything — so a pair resolves to the same side
 * whichever end is the source, and the shape is stable across renders.
 *
 * The choice is also *sticky*. Clearance is a step function over every
 * neighbour's box: a card sliding a pixel across the clearance band flips the
 * preference, and this runs from a ResizeObserver, so a fold toggle or a font
 * settle would swing the connector from one gutter to the other and back
 * mid-relayout. So a pair that already has a side keeps it for as long as that
 * side is still clear, and the "which is nearer" preference is only ever
 * consulted for a pair that has no side yet. Hysteresis, not debouncing: the
 * arrow still moves the instant its gutter is genuinely blocked.
 */
export function resolveSameColumnSideRoute(
  cellAEl: HTMLElement,
  cellBEl: HTMLElement,
  root: HTMLElement,
): SameColumnSideRoute | null {
  const boxA = getCellContentBox(cellAEl, root)
  const boxB = getCellContentBox(cellBEl, root)
  const stepA = parseStepIndex(cellAEl)
  const stepB = parseStepIndex(cellBEl)
  const stepIndex =
    stepA !== null && stepB !== null
      ? Math.min(stepA, stepB)
      : (stepA ?? stepB ?? 0)
  const legs = [
    { box: boxA, y: boxA.top + boxA.height / 2 },
    { box: boxB, y: boxB.top + boxB.height / 2 },
  ]
  const exclude = [cellAEl, cellBEl]

  const cardLeft = Math.min(boxA.left, boxB.left)
  const cardRight = Math.max(boxA.right, boxB.right)
  const leftmostEl = boxA.left <= boxB.left ? cellAEl : cellBEl
  const rightmostEl = boxA.right >= boxB.right ? cellAEl : cellBEl

  const candidates: (SameColumnSideRoute & { reach: number })[] = []

  const leftGutterX = getVerticalRouteGutterX(root, stepIndex, leftmostEl)
  if (leftGutterX < cardLeft - ARROW_CHEVRON_SIZE) {
    candidates.push({
      side: 'left',
      gutterX: leftGutterX,
      reach: cardLeft - leftGutterX,
    })
  }

  const rightGutterX = getVerticalRouteRightGutterX(
    root,
    stepIndex,
    rightmostEl,
  )
  if (rightGutterX > cardRight + ARROW_CHEVRON_SIZE) {
    candidates.push({
      side: 'right',
      gutterX: rightGutterX,
      reach: rightGutterX - cardRight,
    })
  }

  candidates.sort(
    (a, b) =>
      a.reach - b.reach ||
      SAME_COLUMN_SIDE_TIE_BREAK[a.side] - SAME_COLUMN_SIDE_TIE_BREAK[b.side],
  )

  const isClear = (candidate: SameColumnSideRoute) =>
    isSameColumnSideRouteClear(
      root,
      candidate.side,
      candidate.gutterX,
      legs,
      exclude,
    )

  const pairKey = getSameColumnPairKey(cellAEl, cellBEl)
  const remembered = pairKey
    ? rememberedSideRoutes.get(pairKey)?.side
    : undefined

  if (remembered !== undefined) {
    const held = candidates.find(
      (candidate) => candidate.side === remembered,
    )
    if (held && isClear(held)) {
      return { side: held.side, gutterX: held.gutterX }
    }
  }

  for (const candidate of candidates) {
    if (isClear(candidate)) {
      if (pairKey) {
        rememberedSideRoutes.set(pairKey, {
          side: candidate.side,
          cellAEl,
          cellBEl,
        })
      }
      return { side: candidate.side, gutterX: candidate.gutterX }
    }
  }

  return null
}

/** The x a side route's stub meets a card on, chevron-inset for arrival ends. */
function getSameColumnSideStubX(
  box: LayoutBox,
  side: SameColumnSide,
  arrival: boolean,
): number {
  const inset = arrival ? ARROW_CHEVRON_SIZE : 0
  return side === 'left' ? box.left - inset : box.right + inset
}

/**
 * The bracket itself: out of one card's left (or right) edge, along the column
 * gutter, into the other card's matching edge. `fromIsArrival` is the only
 * difference between the one-way and double-headed forms — an arriving end is
 * chevron-inset off the card, a departing end sits on it.
 */
function buildSameColumnBracketPath(
  fromEl: HTMLElement,
  toEl: HTMLElement,
  root: HTMLElement,
  fromIsArrival: boolean,
  route: SameColumnSideRoute | null,
): string {
  if (!route) return ''

  const fromBox = getCellContentBox(fromEl, root)
  const toBox = getCellContentBox(toEl, root)
  const fromY = fromBox.top + fromBox.height / 2
  const toY = toBox.top + toBox.height / 2

  return buildRoundedPolylinePath(
    [
      {
        x: getSameColumnSideStubX(fromBox, route.side, fromIsArrival),
        y: fromY,
      },
      { x: route.gutterX, y: fromY },
      { x: route.gutterX, y: toY },
      { x: getSameColumnSideStubX(toBox, route.side, true), y: toY },
    ],
    ARROW_CORNER_RADIUS,
  )
}

/**
 * Two cells in one column, connected side-on through whichever column gutter
 * has room. Nothing between the two cards is crossed, and both ends read as
 * arrivals because each head sits on a card edge.
 *
 * Returns '' when neither gutter is clear (an edge column of a one-column
 * board, or a gutter another card leans into): no arrow at all beats one
 * drawn through a cell's text.
 *
 * `route` is optional so a caller that has already resolved the pair's side can
 * hand it down instead of paying for the clearance sweeps twice.
 */
export function buildSameColumnGutterDetourPath(
  upperEl: HTMLElement,
  lowerEl: HTMLElement,
  root: HTMLElement,
  route: SameColumnSideRoute | null = resolveSameColumnSideRoute(
    upperEl,
    lowerEl,
    root,
  ),
): string {
  return buildSameColumnBracketPath(upperEl, lowerEl, root, true, route)
}

/**
 * One-way version of the same bracket: a short stub out of the *side* of the
 * source card, down (or up) the adjacent gutter, and into the matching side of
 * the target. Preferred over the top/bottom gutter detour for same-column
 * connectors, which had to leave through a cell edge that another card was
 * often sitting against and so swung far out into the gutter to get around it.
 *
 * Returns '' when no side is clear, so callers can fall back.
 */
export function buildSameColumnSideAttachedPath(
  sourceEl: HTMLElement,
  targetEl: HTMLElement,
  root: HTMLElement,
  route: SameColumnSideRoute | null = resolveSameColumnSideRoute(
    sourceEl,
    targetEl,
    root,
  ),
): string {
  return buildSameColumnBracketPath(sourceEl, targetEl, root, false, route)
}

/**
 * Same-column connector routed through the left column gutter; exits at the
 * source's top/bottom center and enters the target's left edge.
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

/** A backward connector: the target sits in an earlier step column. */
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

type RootMetrics = {
  left: number
  top: number
  scaleX: number
  scaleY: number
}

type MeasurementPass = {
  root: HTMLElement | null
  rootMetrics: RootMetrics | null
  elementBoxes: Map<HTMLElement, LayoutBox>
  contentBoxes: Map<HTMLElement, LayoutBox>
  cellsByScope: Map<Element, HTMLElement[]>
}

let activeMeasurementPass: MeasurementPass | null = null

/**
 * One overlay update resolves every arrow on the band, and the routers overlap
 * heavily in what they measure: a route-clearance test alone sweeps every card
 * on the board three times per candidate gutter, and each sweep used to call
 * `getBoundingClientRect` per anchor plus once for the root. Every one of those
 * is a forced reflow.
 *
 * Wrapping an update in a pass makes each element measured exactly once for the
 * duration. Safe because a pass only ever reads layout — nothing inside mutates
 * the DOM, so no cached box can go stale mid-pass. Passes nest (the two arrow
 * lanes each run their own) and a pass that sees a different root than the one
 * it started on drops its caches rather than mixing two coordinate spaces.
 */
export function runArrowMeasurementPass<T>(run: () => T): T {
  const previous = activeMeasurementPass
  activeMeasurementPass = {
    root: null,
    rootMetrics: null,
    elementBoxes: new Map(),
    contentBoxes: new Map(),
    cellsByScope: new Map(),
  }
  pruneRememberedSideRoutes()
  try {
    return run()
  } finally {
    activeMeasurementPass = previous
  }
}

/** The active pass, with its caches reset if the root coordinate space changed. */
function getMeasurementPass(root: HTMLElement): MeasurementPass | null {
  const pass = activeMeasurementPass
  if (!pass) return null
  if (pass.root !== root) {
    pass.root = root
    pass.rootMetrics = null
    pass.elementBoxes.clear()
    pass.contentBoxes.clear()
    pass.cellsByScope.clear()
  }
  return pass
}

function measureRoot(root: HTMLElement): RootMetrics {
  const rootRect = root.getBoundingClientRect()
  return {
    left: rootRect.left,
    top: rootRect.top,
    scaleX: root.offsetWidth > 0 ? rootRect.width / root.offsetWidth : 1,
    scaleY: root.offsetHeight > 0 ? rootRect.height / root.offsetHeight : 1,
  }
}

/** Cell elements under a scope (the root, or one lane row), once per pass. */
function queryBlueprintCells(
  scope: Element,
  root: HTMLElement,
): readonly HTMLElement[] {
  const pass = getMeasurementPass(root)
  const cached = pass?.cellsByScope.get(scope)
  if (cached) return cached

  const cells = Array.from(
    scope.querySelectorAll<HTMLElement>('[data-blueprint-cell]'),
  )
  pass?.cellsByScope.set(scope, cells)
  return cells
}

/** Layout box relative to the grid root (viewport-corrected for canvas zoom). */
export function getElementLayoutBox(
  el: HTMLElement,
  root: HTMLElement,
): LayoutBox {
  const pass = getMeasurementPass(root)
  const cached = pass?.elementBoxes.get(el)
  if (cached) return cached

  const elRect = el.getBoundingClientRect()
  const rootMetrics =
    pass?.rootMetrics ?? measureRoot(root)
  if (pass) pass.rootMetrics = rootMetrics

  const box = {
    left: (elRect.left - rootMetrics.left) / rootMetrics.scaleX,
    right: (elRect.right - rootMetrics.left) / rootMetrics.scaleX,
    top: (elRect.top - rootMetrics.top) / rootMetrics.scaleY,
    height: elRect.height / rootMetrics.scaleY,
  }
  pass?.elementBoxes.set(el, box)
  return box
}

/** Inner content box — union of visible cell card edges in the lane. */
export function getCellContentBox(
  cellEl: HTMLElement,
  root: HTMLElement,
): LayoutBox {
  const pass = getMeasurementPass(root)
  const cached = pass?.contentBoxes.get(cellEl)
  if (cached) return cached

  const box = measureCellContentBox(cellEl, root)
  pass?.contentBoxes.set(cellEl, box)
  return box
}

function measureCellContentBox(
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
 * A backward connector that starts and ends on the SAME lane row: it has to
 * loop back over the cells it came from, which the corridor at the top of the
 * row is reserved for. Both facts come off the DOM — one lane row, target step
 * column earlier than the source's — which is exactly the rule
 * `laneHasInLaneLoopCorridor` applies to the data when it reserves that
 * corridor. The two must stay in step: an arrow routed through a corridor the
 * layout did not reserve would be drawn over the lane above.
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

  const sourceRow = getLaneRow(sourceEl)
  const targetRow = getLaneRow(targetEl)
  return Boolean(sourceRow && targetRow && sourceRow === targetRow)
}

/** Horizontal lane for in-lane loop arrows — centered in the in-lane corridor. */
export function getInLaneLoopRouteY(
  sourceEl: HTMLElement,
  targetEl: HTMLElement,
  root: HTMLElement,
): number {
  const row = getLaneRow(sourceEl)
  if (row) {
    const loopCorridor = row.querySelector<HTMLElement>(
      '[data-blueprint-loop-corridor="above"]',
    )
    if (loopCorridor) {
      const corridorBox = getElementLayoutBox(loopCorridor, root)
      return corridorBox.top + corridorBox.height / 2
    }
  }

  const cellTop = Math.min(
    getLaneContentTop(sourceEl, root),
    getLaneContentTop(targetEl, root),
  )
  return cellTop - IN_LANE_LOOP_TOP_INSET
}

/**
 * In-lane loop-back: up from the source top, across inside the swimlane's own
 * corridor, then down into the target top.
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

  const exitLeg = buildWrapColumnLeg(sourceEl, root, routeY, 'exit', 'above')
  const enterLeg = buildWrapColumnLeg(targetEl, root, routeY, 'enter', 'above')
  if (!exitLeg || !enterLeg) return ''

  return buildRoundedPolylinePath(
    [...exitLeg, ...enterLeg],
    ARROW_CORNER_RADIUS,
  )
}


export type WrapCorridorBounds = {
  start: number
  end: number
}

/** Bottom edge of the lowest cell card in a lane row (the source's own if alone). */
function getLaneContentBottom(
  row: Element | null,
  root: HTMLElement,
  sourceEl: HTMLElement,
  sourceBox: LayoutBox,
): number {
  let bottom = sourceBox.top + sourceBox.height
  if (!row) return bottom
  for (const el of queryBlueprintCells(row, root)) {
    if (el === sourceEl || el.contains(sourceEl) || sourceEl.contains(el)) {
      continue
    }
    const box = getCellContentBox(el, root)
    bottom = Math.max(bottom, box.top + box.height)
  }
  return bottom
}

/**
 * Top edge of the highest cell card in a cell's lane row — the mirror of
 * `getLaneContentBottom`, for the rails that run ABOVE a lane. A stacked slot
 * makes a lower sub-cell's own top useless as a rail reference: the rail has
 * to clear the sub-cells above it too.
 */
function getLaneContentTop(cellEl: HTMLElement, root: HTMLElement): number {
  const box = getCellContentBox(cellEl, root)
  const row = getLaneRow(cellEl)
  let top = box.top
  if (!row) return top
  for (const el of queryBlueprintCells(row, root)) {
    if (el === cellEl || el.contains(cellEl) || cellEl.contains(el)) continue
    top = Math.min(top, getCellContentBox(el, root).top)
  }
  return top
}

/** Vertical span between a lane row bottom and the next wrap corridor or interaction line. */
export function getWrapCorridorBounds(
  sourceEl: HTMLElement,
  root: HTMLElement,
): WrapCorridorBounds | null {
  const sourceBox = getCellContentBox(sourceEl, root)
  const row = sourceEl.closest('[data-blueprint-row]')
  /*
    The corridor starts below EVERY cell in the lane, not just below the
    source. A wrap runs the width of the lane, so any cell it passes over
    bounds it — and in the merged compare canvas a slot stacks one sub-cell
    per path, so the source's own bottom edge is routinely mid-lane, with
    another path's sub-cell sitting under it. Reading the source alone put
    the loop-back straight through that sub-cell's text.
  */
  const corridorStart = getLaneContentBottom(row, root, sourceEl, sourceBox)

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
    end: corridorStart + BLUEPRINT_WRAP_CORRIDOR_MARGIN,
  }
}

/** Y center of the corridor between a lane row and the interaction line. */
export function getWrapCorridorY(
  sourceEl: HTMLElement,
  root: HTMLElement,
): number {
  const bounds = getWrapCorridorBounds(sourceEl, root)
  if (bounds) {
    return (bounds.start + bounds.end) / 2
  }

  const sourceBox = getCellContentBox(sourceEl, root)
  return sourceBox.top + sourceBox.height + BLUEPRINT_WRAP_CORRIDOR_MARGIN / 2
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

  // A cell between the two (merged stacks a sub-cell per path inside one
  // slot) means the straight run would strike through its text. Detour
  // through a column gutter instead, entering both cards side-on so each
  // head still lands on the cell it belongs to.
  if (getSameColumnObstructingCells(upperEl, lowerEl, root).length > 0) {
    return buildSameColumnGutterDetourPath(upperEl, lowerEl, root)
  }

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

  const rowA = getLaneRow(cellAEl)
  const rowB = getLaneRow(cellBEl)
  if (!rowA || !rowB || rowA === rowB) return ''

  return buildBidirectionalVerticalArrowPath(cellAEl, cellBEl, root)
}

/** Clearance kept between the overhead rail and the cards it runs above. */
export const OVERHEAD_RAIL_CLEARANCE = 10

/**
 * A forward connector that stays on ONE lane row and clears at least one whole
 * column on the way (`targetStep >= sourceStep + 2`). The cells it passes over
 * are in its way, so instead of running along the row it climbs into the
 * corridor above, crosses on the rail, and drops back down into the target.
 *
 * An adjacent hop (`targetStep === sourceStep + 1`) skips nothing and stays in
 * the column gap between the two cards.
 *
 * This is the DOM-side twin of `laneHasOverheadArrowCorridor`, which reserves
 * the corridor from the data by the identical rule. Change one and the other
 * has to move with it, or the rail gets drawn through the lane above.
 */
export function isOverheadRailTrigger(
  sourceEl: HTMLElement,
  targetEl: HTMLElement,
): boolean {
  const sourceStep = parseStepIndex(sourceEl)
  const targetStep = parseStepIndex(targetEl)
  if (sourceStep === null || targetStep === null) return false
  if (targetStep < sourceStep + 2) return false

  const sourceRow = getLaneRow(sourceEl)
  const targetRow = getLaneRow(targetEl)
  return Boolean(sourceRow && targetRow && sourceRow === targetRow)
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

/**
 * The strip a lane reserves above itself for overhead rails, when it has one.
 * The grids differ in where they hang it — the single-path grid puts it before
 * the row, the compare shell inside it — so both placements are looked for by
 * the marker rather than inferred from the row's own box.
 */
function getOverheadRailCorridorBox(
  cellEl: HTMLElement,
  root: HTMLElement,
): LayoutBox | null {
  const row = getLaneRow(cellEl)
  if (!row) return null

  const inside = row.querySelector<HTMLElement>(
    '[data-blueprint-rail-corridor="above"]',
  )
  if (inside) return getElementLayoutBox(inside, root)

  let sibling = row.previousElementSibling
  while (sibling instanceof HTMLElement) {
    if (sibling.dataset.blueprintRailCorridor === 'above') {
      return getElementLayoutBox(sibling, root)
    }
    if (
      sibling.dataset.blueprintRow !== undefined ||
      sibling.dataset.blueprintDivider !== undefined
    ) {
      break
    }
    sibling = sibling.previousElementSibling
  }
  return null
}

/**
 * Y of the rail shared by every overhead connector above a lane row — the
 * middle of the strip the layout reserved for it.
 *
 * Measuring the reserved strip rather than counting back from the cards is
 * what keeps the rail out of the OTHER corridor: a lane that also loops back
 * on itself carries a second, thinner strip between the rail's and its cards,
 * and a rail placed half a rail-margin above the card tops would land inside
 * it, drawn on top of the loop it was supposed to clear.
 */
export function getOverheadRailY(
  sourceEl: HTMLElement,
  targetEl: HTMLElement,
  root: HTMLElement,
): number {
  const corridor =
    getOverheadRailCorridorBox(sourceEl, root) ??
    getOverheadRailCorridorBox(targetEl, root)
  if (corridor) return corridor.top + corridor.height / 2

  // Lane-wide tops, not the two cards' own: a merged slot stacks a sub-cell
  // per path, so a rail measured off a lower sub-cell would run through the
  // ones above it.
  return (
    Math.min(getLaneContentTop(sourceEl, root), getLaneContentTop(targetEl, root)) -
    BLUEPRINT_OVERHEAD_RAIL_CORRIDOR_MARGIN / 2
  )
}

/**
 * Single overhead-rail connector: up out of the source, across the rail, then
 * down into the target.
 *
 * Both climbs go through `buildWrapColumnLeg`, so a column that is not empty
 * between the card and the rail sends that end sideways into the gutter
 * instead. A merged slot stacks one sub-cell per path, and a lower sub-cell's
 * straight climb would otherwise pass through the faces of the sub-cells
 * sitting above it.
 */
export function buildOverheadRailPath(
  sourceEl: HTMLElement,
  targetEl: HTMLElement,
  root: HTMLElement,
): string {
  const target = getCellTopCenter(targetEl, root)
  const railY = getOverheadRailY(sourceEl, targetEl, root)

  if (target.y - ARROW_CHEVRON_SIZE <= railY) return ''

  const exitLeg = buildWrapColumnLeg(
    sourceEl,
    root,
    railY,
    'exit',
    'above',
    'forward',
  )
  const enterLeg = buildWrapColumnLeg(
    targetEl,
    root,
    railY,
    'enter',
    'above',
    'forward',
  )
  if (!exitLeg || !enterLeg) return ''

  return buildRoundedPolylinePath(
    [...exitLeg, ...enterLeg],
    ARROW_CORNER_RADIUS,
  )
}

/**
 * Merged bus for several overhead-rail triggers on one lane that share a
 * target: the leftmost source rises to the rail, the trunk runs to the target
 * column, intermediate sources get vertical taps, and the path ends with a
 * downward arrow into the target.
 */
export function buildOverheadRailBusPath(
  sourceEls: HTMLElement[],
  targetEl: HTMLElement,
  root: HTMLElement,
): string {
  if (sourceEls.length === 0) return ''

  const sorted = [...sourceEls].sort(
    (a, b) => (parseStepIndex(a) ?? 0) - (parseStepIndex(b) ?? 0),
  )
  const firstEl = sorted[0]
  const first = getCellTopCenter(firstEl, root)
  const target = getCellTopCenter(targetEl, root)
  const railY = getOverheadRailY(firstEl, targetEl, root)
  const lineEndY = target.y - ARROW_CHEVRON_SIZE

  if (lineEndY <= railY) return ''

  const mainPath = buildRoundedPolylinePath(
    [
      first,
      { x: first.x, y: railY },
      { x: target.x, y: railY },
      { x: target.x, y: lineEndY },
    ],
    ARROW_CORNER_RADIUS,
  )

  const tapPaths = sorted.slice(1).map((el) => {
    const leg = buildWrapColumnLeg(el, root, railY, 'exit', 'above', 'forward')
    if (!leg) return ''
    return buildRoundedPolylinePath([...leg].reverse(), ARROW_CORNER_RADIUS)
  })

  // Taps first so markerEnd lands on the main trunk's downward segment.
  return [...tapPaths, mainPath].filter(Boolean).join(' ')
}

export type OverheadRailFanOutGroup = {
  sourceCellId: string
  sourceEl: HTMLElement
  branches: Array<{ triggerId: string; targetEl: HTMLElement }>
}

/** Shared trunk: up from the source, then across above all branch targets. */
export function buildOverheadRailFanOutTrunkPath(
  sourceEl: HTMLElement,
  targetEls: HTMLElement[],
  root: HTMLElement,
): string {
  if (targetEls.length === 0) return ''

  const source = getCellTopCenter(sourceEl, root)
  const sortedTargets = [...targetEls].sort(
    (a, b) => (parseStepIndex(a) ?? 0) - (parseStepIndex(b) ?? 0),
  )
  const lastTarget = sortedTargets[sortedTargets.length - 1]!
  const railY = getOverheadRailY(sourceEl, lastTarget, root)
  const rightX = Math.max(
    ...sortedTargets.map((el) => getCellTopCenter(el, root).x),
  )

  return buildRoundedPolylinePath(
    [source, { x: source.x, y: railY }, { x: rightX, y: railY }],
    ARROW_CORNER_RADIUS,
  )
}

/** Vertical drop from the overhead rail into a branch target. */
export function buildOverheadRailFanOutDropPath(
  sourceEl: HTMLElement,
  targetEl: HTMLElement,
  root: HTMLElement,
): string {
  const target = getCellTopCenter(targetEl, root)
  const railY = getOverheadRailY(sourceEl, targetEl, root)
  if (target.y - ARROW_CHEVRON_SIZE <= railY) return ''
  const enterLeg = buildWrapColumnLeg(
    targetEl,
    root,
    railY,
    'enter',
    'above',
    'forward',
  )
  if (!enterLeg) return ''
  return buildRoundedPolylinePath(enterLeg, ARROW_CORNER_RADIUS)
}

/** Trigger ids that share a source and fan out to multiple overhead-rail targets. */
export function collectOverheadRailFanOutTriggerIds<
  T extends OverheadRailTrigger,
>(triggers: readonly T[]): Set<string> {
  const bySource = new Map<string, T[]>()

  for (const trigger of triggers) {
    const list = bySource.get(trigger.source_cell_id) ?? []
    list.push(trigger)
    bySource.set(trigger.source_cell_id, list)
  }

  const fanOutIds = new Set<string>()
  for (const list of bySource.values()) {
    const targetIds = new Set(list.map((trigger) => trigger.target_cell_id))
    if (targetIds.size < 2) continue
    for (const trigger of list) {
      fanOutIds.add(trigger.id)
    }
  }

  return fanOutIds
}

export type OverheadRailTrigger = {
  id: string
  source_cell_id: string
  target_cell_id: string
}

/** Group overhead-rail triggers into merge buses and source fan-outs. */
export function groupOverheadRailTriggers<T extends OverheadRailTrigger>(
  triggers: T[],
  content: HTMLElement,
): {
  busGroups: {
    targetCellId: string
    triggerIds: string[]
    sourceEls: HTMLElement[]
    targetEl: HTMLElement
  }[]
  fanOutGroups: OverheadRailFanOutGroup[]
  remaining: T[]
} {
  const remaining: T[] = []
  const railEntries: Array<{
    trigger: T
    sourceEl: HTMLElement
    targetEl: HTMLElement
  }> = []

  /*
    Which triggers belong on the rail is a question about step columns and lane
    rows, and only the rendered grid knows those — so the cells are resolved
    first and the single DOM rule decides, rather than a second rule guessing
    from the ids. A trigger whose cells are not on the board (a collapsed lane,
    a filtered path) is left to the generic router.
  */
  for (const trigger of triggers) {
    const sourceEl = content.querySelector<HTMLElement>(
      `[data-blueprint-cell="${trigger.source_cell_id}"]`,
    )
    const targetEl = content.querySelector<HTMLElement>(
      `[data-blueprint-cell="${trigger.target_cell_id}"]`,
    )
    if (!sourceEl || !targetEl || !isOverheadRailTrigger(sourceEl, targetEl)) {
      remaining.push(trigger)
      continue
    }

    railEntries.push({ trigger, sourceEl, targetEl })
  }

  const fanOutTriggerIds = collectOverheadRailFanOutTriggerIds(
    railEntries.map((entry) => entry.trigger),
  )
  const fanOutGroups: OverheadRailFanOutGroup[] = []
  const bySource = new Map<
    string,
    {
      sourceEl: HTMLElement
      branches: Array<{ triggerId: string; targetEl: HTMLElement }>
      targetIds: Set<string>
    }
  >()

  for (const entry of railEntries) {
    if (!fanOutTriggerIds.has(entry.trigger.id)) continue

    const existing = bySource.get(entry.trigger.source_cell_id)
    if (existing) {
      if (!existing.targetIds.has(entry.trigger.target_cell_id)) {
        existing.targetIds.add(entry.trigger.target_cell_id)
        existing.branches.push({
          triggerId: entry.trigger.id,
          targetEl: entry.targetEl,
        })
      }
    } else {
      bySource.set(entry.trigger.source_cell_id, {
        sourceEl: entry.sourceEl,
        branches: [
          { triggerId: entry.trigger.id, targetEl: entry.targetEl },
        ],
        targetIds: new Set([entry.trigger.target_cell_id]),
      })
    }
  }

  for (const [sourceCellId, group] of bySource) {
    fanOutGroups.push({
      sourceCellId,
      sourceEl: group.sourceEl,
      branches: [...group.branches].sort(
        (a, b) =>
          (parseStepIndex(a.targetEl) ?? 0) - (parseStepIndex(b.targetEl) ?? 0),
      ),
    })
  }

  const byTarget = new Map<
    string,
    { triggerIds: string[]; sourceEls: HTMLElement[]; targetEl: HTMLElement }
  >()

  for (const entry of railEntries) {
    if (fanOutTriggerIds.has(entry.trigger.id)) continue

    const existing = byTarget.get(entry.trigger.target_cell_id)
    if (existing) {
      existing.triggerIds.push(entry.trigger.id)
      existing.sourceEls.push(entry.sourceEl)
    } else {
      byTarget.set(entry.trigger.target_cell_id, {
        triggerIds: [entry.trigger.id],
        sourceEls: [entry.sourceEl],
        targetEl: entry.targetEl,
      })
    }
  }

  const busGroups = [...byTarget.entries()]
    .filter(([, group]) => group.sourceEls.length >= 2)
    .map(([targetCellId, group]) => ({
      targetCellId,
      triggerIds: group.triggerIds,
      sourceEls: group.sourceEls,
      targetEl: group.targetEl,
    }))

  for (const entry of railEntries) {
    if (fanOutTriggerIds.has(entry.trigger.id)) continue

    const busGroup = busGroups.find((group) =>
      group.triggerIds.includes(entry.trigger.id),
    )
    if (busGroup) continue

    remaining.push(entry.trigger)
  }

  return {
    busGroups,
    fanOutGroups,
    remaining,
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
 * through the center of the column gap between the two cards.
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
 * Orthogonal wrap: down from the source bottom into the space above the
 * interaction line, across, then up into the target bottom. A wrap whose two
 * ends share a lane row loops over that row instead, in its own corridor.
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

  /*
    Each end meets the corridor on the side it actually faces. A loop back to
    a lane at or above the source's own finds the corridor below both, and
    both ends face down — the ordinary case. But a backward trigger can also
    land on a lane BELOW the source, and then the corridor runs above the
    target: entering it from underneath would take the arrow down through the
    card and leave the head pointing at empty space past its far edge.
  */
  const sourceBox = getCellContentBox(sourceEl, root)
  const targetBox = getCellContentBox(targetEl, root)
  const sourceSide =
    corridorY >= sourceBox.top + sourceBox.height ? 'below' : 'above'
  const targetSide = corridorY <= targetBox.top ? 'above' : 'below'

  /*
    The drop to the corridor and the rise back out both travel INSIDE a step
    column, which the merged canvas no longer guarantees is empty below a
    card: a divergent slot stacks one sub-cell per path, so a wrap leaving the
    upper sub-cell used to descend straight through the lower one's text.
    Where that happens the vertical leg moves into the column's gutter and
    meets the card side-on instead.
  */
  const exitLeg = buildWrapColumnLeg(
    sourceEl,
    root,
    corridorY,
    'exit',
    sourceSide,
  )
  const enterLeg = buildWrapColumnLeg(
    targetEl,
    root,
    corridorY,
    'enter',
    targetSide,
  )
  // No clear leg on one side (a blocked column with no usable gutter — an
  // edge column of a one-column board). Drawing the straight leg anyway
  // would strike through the sub-cell under the card, so drop the arrow.
  if (!exitLeg || !enterLeg) return ''

  return buildRoundedPolylinePath(
    [...exitLeg, ...enterLeg],
    ARROW_CORNER_RADIUS,
  )
}

/**
 * One end of a corridor route: the points that take it between a card and the
 * corridor — `below` the lane for a loop under it, `above` for an overhead
 * rail or an in-lane loop. Straight up or down the column when that stretch of
 * the column is clear, otherwise out of the card's side, into the gutter, and
 * along there.
 *
 * `direction` says which way the corridor run travels, and the side detour
 * follows it so the route never doubles back: a `backward` wrap leaves by the
 * source's left edge and meets the target on its right, a `forward` rail does
 * the mirror.
 */
export function buildWrapColumnLeg(
  cellEl: HTMLElement,
  root: HTMLElement,
  corridorY: number,
  end: 'exit' | 'enter',
  side: 'below' | 'above' = 'below',
  direction: 'backward' | 'forward' = 'backward',
): Point[] | null {
  const box = getCellContentBox(cellEl, root)
  const centerX = (box.left + box.right) / 2
  const edgeY = side === 'below' ? box.top + box.height : box.top
  const blocked =
    getCellsOverlappingRect(
      root,
      {
        left: box.left,
        right: box.right,
        top: Math.min(edgeY, corridorY),
        bottom: Math.max(edgeY, corridorY),
      },
      [cellEl],
    ).length > 0

  if (!blocked) {
    const tipY =
      side === 'below' ? edgeY + ARROW_CHEVRON_SIZE : edgeY - ARROW_CHEVRON_SIZE
    return end === 'exit'
      ? [
          { x: centerX, y: edgeY },
          { x: centerX, y: corridorY },
        ]
      : [
          { x: centerX, y: corridorY },
          { x: centerX, y: tipY },
        ]
  }

  const stepIndex = parseStepIndex(cellEl) ?? 0
  const midY = box.top + box.height / 2
  // A backward route leaves left and arrives from the right; a forward one
  // mirrors that. The tail starts ON the card edge — only the head end is held
  // a chevron short, so the arrowhead lands on the edge instead of inside it.
  const leavesLeft = direction === 'backward'

  if (end === 'exit') {
    const gutterX = leavesLeft
      ? getVerticalRouteGutterX(root, stepIndex, cellEl)
      : getVerticalRouteRightGutterX(root, stepIndex, cellEl)
    const edgeX = leavesLeft ? box.left : box.right
    if (leavesLeft ? gutterX >= edgeX : gutterX <= edgeX) return null
    return [
      { x: edgeX, y: midY },
      { x: gutterX, y: midY },
      { x: gutterX, y: corridorY },
    ]
  }

  const gutterX = leavesLeft
    ? getVerticalRouteRightGutterX(root, stepIndex, cellEl)
    : getVerticalRouteGutterX(root, stepIndex, cellEl)
  const entryX = leavesLeft
    ? box.right + ARROW_CHEVRON_SIZE
    : box.left - ARROW_CHEVRON_SIZE
  if (leavesLeft ? gutterX <= entryX : gutterX >= entryX) return null
  return [
    { x: gutterX, y: corridorY },
    { x: gutterX, y: midY },
    { x: entryX, y: midY },
  ]
}

/**
 * The router: every trigger arrow's shape is decided here, from where its two
 * cells sit on the rendered grid. Same step column, adjacent columns, a
 * forward skip, a backward wrap, a hop between lanes — each has one route, and
 * the tests below run from the most specific shape to the least, so a trigger
 * reaches the plain horizontal line only when nothing narrower claims it.
 */
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
      // Side-on first: a stub out of the card's own left/right edge and a run
      // down the adjacent gutter hugs the column, where leaving through the
      // top/bottom edge has to swing around whatever is stacked against it.
      const sideRoute = resolveSameColumnSideRoute(sourceEl, targetEl, root)
      if (sideRoute) {
        return buildSameColumnSideAttachedPath(
          sourceEl,
          targetEl,
          root,
          sideRoute,
        )
      }

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
    getLaneRow(sourceEl) === getLaneRow(targetEl)
  ) {
    return buildAdjacentColumnGapArrowPath(sourceEl, targetEl, root)
  }

  if (isOverheadRailTrigger(sourceEl, targetEl)) {
    return buildOverheadRailPath(sourceEl, targetEl, root)
  }

  if (isCrossLaneForwardTrigger(sourceEl, targetEl)) {
    return buildCrossLaneForwardArrowPath(sourceEl, targetEl, root)
  }

  if (getSameRowObstructingCells(sourceEl, targetEl).length > 0) {
    return buildHorizontalGutterDetourPath(sourceEl, targetEl, root)
  }

  const anchors = getHorizontalCellAnchors(sourceEl, targetEl, root)
  return buildHorizontalArrowPath(anchors.source, anchors.target)
}
