import {
  BLUEPRINT_WRAP_CORRIDOR_MARGIN,
  STEP_COLUMN_GAP,
} from '@/lib/blueprintLayout'
import {
  allocateAnchorSlots,
  allocateCorridorLanes,
  anchorPointFor,
  chooseCorridor,
  planConfluences,
  type Confluence,
  type CorridorLaneAssignment,
  type CorridorRun,
  type Direction,
  type Side,
  type SlotAssignment,
  type SlotRequest,
} from '@/lib/arrowAnchorSlots'

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

/* ---------------------------------------------------- anchor slots (#347)

  A contested cell side hands out one ordered slot per endpoint instead of
  stacking every arrow on the edge midpoint. The allocation itself lives in
  the pure `arrowAnchorSlots` module (allocateAnchorSlots / anchorPointFor);
  this file owns the wiring: classifying each endpoint's natural side,
  planning the slots for a whole band, and translating an assignment back
  into the point a builder anchors on.

  Determinism is load-bearing — slots come from the caller's ordered dependency
  list (`sortKey` = list index), never from Map or DOM order, so the same
  data always draws the same picture across single, side-by-side, and merged.

  A lone or uncontested endpoint keeps `count === 1` and stays on its
  preferred side, so `anchorPointFor` lands it on the exact edge midpoint the
  engine drew before — byte-for-byte. Only a contested side moves anything.
*/

/** One endpoint's slot on a cell, or absent when the band was not planned. */
let activeAnchorPlan: Map<string, SlotAssignment> | null = null

/** One run's corridor lane on the band, or absent when it was not planned. */
let activeCorridorPlan: Map<string, CorridorLaneAssignment> | null = null

/** A minimal source/target-cell shape a slot plan can be built from. */
export type AnchorSlotDependency = {
  id: string
  source_cell_id: string
  target_cell_id: string
}

function anchorPlanKey(dependencyId: string, direction: Direction): string {
  return `${dependencyId}:${direction}`
}

/** The side each end of a dependency naturally anchors on, today. */
function endpointSides(
  sourceEl: HTMLElement,
  targetEl: HTMLElement,
  root: HTMLElement,
): { sourceSide: Side; targetSide: Side } {
  if (isWrapDependency(sourceEl, targetEl)) {
    // A backward loop drops out of the source's bottom and rises into the
    // target's bottom — both ends live on the bottom edge.
    return { sourceSide: 'bottom', targetSide: 'bottom' }
  }

  const sourceStep = parseStepIndex(sourceEl)
  const targetStep = parseStepIndex(targetEl)
  if (sourceStep !== null && targetStep !== null && sourceStep === targetStep) {
    const sourceBox = getCellContentBox(sourceEl, root)
    const targetBox = getCellContentBox(targetEl, root)
    const targetBelow =
      targetBox.top + targetBox.height / 2 > sourceBox.top + sourceBox.height / 2
    return targetBelow
      ? { sourceSide: 'bottom', targetSide: 'top' }
      : { sourceSide: 'top', targetSide: 'bottom' }
  }

  // Forward (adjacent, spanning, or cross-lane): out leaves the right face
  // toward the later column, in arrives on the left face from the earlier one.
  return { sourceSide: 'right', targetSide: 'left' }
}

/**
 * Plan the anchor slots for one band's dependencies.
 *
 * Registers two endpoints per dependency (its out at the source, its in at
 * the target), each on the side it anchors on today, ordered by list index.
 * The result replaces the active plan, which `buildArrowPath` then consults.
 * Pass the same list the arrow loop iterates, in the same order.
 */
export function planAnchorSlots(
  root: HTMLElement,
  dependencies: readonly AnchorSlotDependency[],
): void {
  const requests: SlotRequest[] = []
  dependencies.forEach((dependency, index) => {
    const sourceEl = root.querySelector<HTMLElement>(
      `[data-blueprint-cell="${dependency.source_cell_id}"]`,
    )
    const targetEl = root.querySelector<HTMLElement>(
      `[data-blueprint-cell="${dependency.target_cell_id}"]`,
    )
    if (!sourceEl || !targetEl) return

    const { sourceSide, targetSide } = endpointSides(sourceEl, targetEl, root)
    requests.push({
      id: anchorPlanKey(dependency.id, 'out'),
      cellId: dependency.source_cell_id,
      direction: 'out',
      preferredSide: sourceSide,
      sortKey: index,
    })
    requests.push({
      id: anchorPlanKey(dependency.id, 'in'),
      cellId: dependency.target_cell_id,
      direction: 'in',
      preferredSide: targetSide,
      sortKey: index,
    })
  })

  activeAnchorPlan = allocateAnchorSlots(requests)
}

/** Forget the active plan, so an unplanned build reads no stale slots. */
export function clearAnchorSlotPlan(): void {
  activeAnchorPlan = null
}

function endpointSlot(
  dependencyId: string | undefined,
  direction: Direction,
): SlotAssignment | undefined {
  if (!activeAnchorPlan || dependencyId === undefined) return undefined
  return activeAnchorPlan.get(anchorPlanKey(dependencyId, direction))
}

/** True once an endpoint's side is genuinely contested — the only time it moves. */
function slotMoves(slot: SlotAssignment | undefined): slot is SlotAssignment {
  return slot !== undefined && (slot.count > 1 || slot.displaced)
}

function anchorBoxFor(box: LayoutBox): {
  left: number
  right: number
  top: number
  bottom: number
} {
  return {
    left: box.left,
    right: box.right,
    top: box.top,
    bottom: box.top + box.height,
  }
}

/**
 * The Y an endpoint anchors on for a left/right (vertical) edge, or undefined
 * when nothing moves it off the midpoint. Forward endpoints never displace —
 * an out only ever shares a side with other outs — so the assignment's own
 * side is honoured directly.
 */
function verticalEdgeSlotY(
  box: LayoutBox,
  slot: SlotAssignment | undefined,
  naturalSide: Side,
): number | undefined {
  if (!slotMoves(slot)) return undefined
  const side = slot.side === naturalSide ? slot.side : naturalSide
  return anchorPointFor(anchorBoxFor(box), {
    side,
    index: slot.side === naturalSide ? slot.index : 1,
    count: slot.side === naturalSide ? slot.count : 2,
  }).y
}

/** How a wrap endpoint leaves/enters the bottom edge when its side is contested. */
type WrapSlotLeg = { centerX?: number; forceSide?: 'right' }

function wrapSlotLeg(
  box: LayoutBox,
  slot: SlotAssignment | undefined,
): WrapSlotLeg {
  if (!slotMoves(slot)) return {}
  // The out yields when it contests an in on the bottom (a head keeps its
  // side); the allocator slides it to the fallback side, which the leg
  // renders as a side-gutter departure.
  if (slot.displaced) return { forceSide: 'right' }
  return {
    centerX: anchorPointFor(anchorBoxFor(box), {
      side: 'bottom',
      index: slot.index,
      count: slot.count,
    }).x,
  }
}

/* ------------------------------------------------ confluence + fan-out (#348)

  When ≥2 dependencies arrive at ONE target cell from the SAME side, their last
  segments should merge into one path-coloured trunk with a single head — the
  reader is told "these all cause that", which is one fact, not N. Fan-out is
  the mirror: one source departing to ≥2 targets on one side shares a trunk that
  fans into separate heads.

  Auto-detected, no cell-id gate. `planConfluences` (arrivals) and its mirror
  `groupFanOutDepartures` (departures) read the anchor plan the band already
  allocated and report every cell+side that ≥2 endpoints share. This is the
  geometry the retired overhead-rail bus special-cased for a heavily-crossed
  row; it is now one instance of the generic mechanism.

  Only forward (horizontal) arrivals/departures merge: a forward arrival lands
  on the target's LEFT, a forward departure leaves the source's RIGHT, and a
  horizontal trunk can only gather those. Backward loops (bottom) and same-
  column connectors (top/bottom) keep their own heads — merging them would
  invent a route that does not exist — so every non-forward situation draws
  exactly as before.

  Merging is applied ONLY when it reduces overlap: a lone arrival is never a
  confluence (`planConfluences` already drops size-1 groups), and a group whose
  gather cannot sit clear between its members and the shared edge declines the
  merge and lets those members route individually.
*/

/** One drawn piece of a merged group — a shared trunk, or a member's leg. */
export type ArrowMergeSegment = {
  /** Stable, deterministic id (target/source-derived for a trunk, the member's
   *  dependency id for a leg). */
  id: string
  d: string
  /** A confluence trunk and a fan-out drop carry the head; a fan-out trunk and
   *  a confluence tap do not. */
  showMarker: boolean
  /** Dependency ids whose colour/opacity this segment follows. A trunk lists
   *  every member (shared colour when unanimous, else neutral; opacity = max);
   *  a leg lists its one member. */
  memberDependencyIds: string[]
}

export type ArrowMergePlan = {
  segments: ArrowMergeSegment[]
  /** Every member dependency id across all merged groups. The caller must NOT
   *  also route these through `buildArrowPath`: the merge already draws them. */
  consumed: Set<string>
}

const EMPTY_ARROW_MERGE_PLAN: ArrowMergePlan = {
  segments: [],
  consumed: new Set(),
}

/** The dependency id an endpoint id (`${dependencyId}:${direction}`) belongs to. */
function dependencyIdOfEndpoint(endpointId: string): string {
  const at = endpointId.lastIndexOf(':')
  return at === -1 ? endpointId : endpointId.slice(0, at)
}

/** A cell's own card centre Y (not target-adjusted — the trunk is its own run). */
function cellCardCenterY(box: LayoutBox): number {
  return box.top + box.height / 2
}

/**
 * Departures that share a source side — the mirror of `planConfluences`, which
 * groups arrivals. Same contract: ≥2 endpoints on one cell+side, size-1 groups
 * dropped, deterministic order independent of Map insertion.
 */
function groupFanOutDepartures(
  assignments: Iterable<SlotAssignment>,
): Confluence[] {
  const groups = new Map<string, SlotAssignment[]>()
  for (const assignment of assignments) {
    if (assignment.direction !== 'out') continue
    const key = `${assignment.cellId}:${assignment.side}`
    const list = groups.get(key)
    if (list) list.push(assignment)
    else groups.set(key, [assignment])
  }

  const out: Confluence[] = []
  for (const [key, members] of groups) {
    if (members.length < 2) continue
    const sorted = members.sort((a, b) => a.index - b.index)
    out.push({
      id: `fan-out:${key}`,
      targetCellId: sorted[0].cellId,
      side: sorted[0].side,
      memberIds: sorted.map((member) => member.id),
    })
  }
  return out.sort((a, b) => (a.id < b.id ? -1 : 1))
}

/** Fallback junction offset when no column gap is measurable (call-time so it
 *  reads `ARROW_CORNER_RADIUS` after the module's consts have initialised). */
function mergeJunctionMinOffset(): number {
  return Math.max(28, ARROW_CORNER_RADIUS * 2.5)
}

type ConfluenceMember = {
  dependencyId: string
  sourceRight: number
  sourceY: number
}

/**
 * The merged trunk + per-source taps for one same-side confluence, or null when
 * the gather cannot sit clear (in which case the members route individually and
 * nothing is consumed).
 */
function buildConfluenceSegments(
  group: Confluence,
  root: HTMLElement,
  cellById: (id: string) => HTMLElement | null,
  depById: Map<string, AnchorSlotDependency>,
): ArrowMergeSegment[] | null {
  const targetEl = cellById(group.targetCellId)
  if (!targetEl) return null
  const targetBox = getCellContentBox(targetEl, root)
  const entryX = targetBox.left - ARROW_CHEVRON_SIZE
  const targetY = cellCardCenterY(targetBox)

  const members: ConfluenceMember[] = []
  let firstSourceEl: HTMLElement | null = null
  for (const endpointId of group.memberIds) {
    const dependencyId = dependencyIdOfEndpoint(endpointId)
    const dependency = depById.get(dependencyId)
    if (!dependency) return null
    const sourceEl = cellById(dependency.source_cell_id)
    if (!sourceEl) return null
    firstSourceEl ??= sourceEl
    const box = getCellContentBox(sourceEl, root)
    members.push({
      dependencyId,
      sourceRight: box.right,
      sourceY: cellCardCenterY(box),
    })
  }
  if (members.length < 2 || !firstSourceEl) return null

  const junctionX =
    getPreTargetGapCenterX(root, firstSourceEl, targetEl) ??
    entryX - mergeJunctionMinOffset()

  // The trunk only reduces overlap when it can sit clear to the left of the
  // target edge and to the right of every source; otherwise decline the merge.
  if (entryX <= junctionX) return null
  for (const member of members) {
    if (junctionX <= member.sourceRight) return null
  }

  const memberIds = members.map((member) => member.dependencyId)
  const segments: ArrowMergeSegment[] = []

  // The trunk gathers along a vertical at the junction, then turns into the
  // target with the single head. When the target Y is an extreme of the gather
  // it is one rounded stroke; when it sits between members (both sides), the
  // spine and the headed approach are two pieces.
  const ys = members.map((member) => member.sourceY)
  const spineTop = Math.min(...ys, targetY)
  const spineBottom = Math.max(...ys, targetY)
  const trunkId = `${group.targetCellId}-confluence-${group.side}`

  if (spineTop < targetY && targetY < spineBottom) {
    const spine = buildRoundedPolylinePath(
      [
        { x: junctionX, y: spineTop },
        { x: junctionX, y: spineBottom },
      ],
      ARROW_CORNER_RADIUS,
    )
    const approach = buildRoundedPolylinePath(
      [
        { x: junctionX, y: targetY },
        { x: entryX, y: targetY },
      ],
      ARROW_CORNER_RADIUS,
    )
    if (!spine || !approach) return null
    segments.push({
      id: `${trunkId}-spine`,
      d: spine,
      showMarker: false,
      memberDependencyIds: memberIds,
    })
    segments.push({
      id: trunkId,
      d: approach,
      showMarker: true,
      memberDependencyIds: memberIds,
    })
  } else {
    const farEnd = spineTop === targetY ? spineBottom : spineTop
    const trunk = buildRoundedPolylinePath(
      [
        { x: junctionX, y: farEnd },
        { x: junctionX, y: targetY },
        { x: entryX, y: targetY },
      ],
      ARROW_CORNER_RADIUS,
    )
    if (!trunk) return null
    segments.push({
      id: trunkId,
      d: trunk,
      showMarker: true,
      memberDependencyIds: memberIds,
    })
  }

  for (const member of members) {
    const tap = buildRoundedPolylinePath(
      [
        { x: member.sourceRight, y: member.sourceY },
        { x: junctionX, y: member.sourceY },
      ],
      ARROW_CORNER_RADIUS,
    )
    if (!tap) return null
    segments.push({
      id: member.dependencyId,
      d: tap,
      showMarker: false,
      memberDependencyIds: [member.dependencyId],
    })
  }

  return segments
}

type FanOutMember = {
  dependencyId: string
  entryX: number
  targetY: number
}

/**
 * The mirror of `buildConfluenceSegments`: one source's shared trunk (no head)
 * plus a headed drop per target. Null when the gather cannot sit clear.
 */
function buildFanOutSegments(
  group: Confluence,
  root: HTMLElement,
  cellById: (id: string) => HTMLElement | null,
  depById: Map<string, AnchorSlotDependency>,
): ArrowMergeSegment[] | null {
  const sourceCellId = group.targetCellId
  const sourceEl = cellById(sourceCellId)
  if (!sourceEl) return null
  const sourceBox = getCellContentBox(sourceEl, root)
  const sourceRight = sourceBox.right
  const sourceY = cellCardCenterY(sourceBox)

  const members: FanOutMember[] = []
  let firstTargetEl: HTMLElement | null = null
  for (const endpointId of group.memberIds) {
    const dependencyId = dependencyIdOfEndpoint(endpointId)
    const dependency = depById.get(dependencyId)
    if (!dependency) return null
    const targetEl = cellById(dependency.target_cell_id)
    if (!targetEl) return null
    firstTargetEl ??= targetEl
    const box = getCellContentBox(targetEl, root)
    members.push({
      dependencyId,
      entryX: box.left - ARROW_CHEVRON_SIZE,
      targetY: cellCardCenterY(box),
    })
  }
  if (members.length < 2 || !firstTargetEl) return null

  const junctionX =
    getPreTargetGapCenterX(root, sourceEl, firstTargetEl) ??
    sourceRight + mergeJunctionMinOffset()

  if (junctionX <= sourceRight) return null
  for (const member of members) {
    if (member.entryX <= junctionX) return null
  }

  const memberIds = members.map((member) => member.dependencyId)
  const segments: ArrowMergeSegment[] = []

  const ys = members.map((member) => member.targetY)
  const spineTop = Math.min(...ys, sourceY)
  const spineBottom = Math.max(...ys, sourceY)
  const trunkId = `${sourceCellId}-fan-out-${group.side}`

  if (spineTop < sourceY && sourceY < spineBottom) {
    const stub = buildRoundedPolylinePath(
      [
        { x: sourceRight, y: sourceY },
        { x: junctionX, y: sourceY },
      ],
      ARROW_CORNER_RADIUS,
    )
    const spine = buildRoundedPolylinePath(
      [
        { x: junctionX, y: spineTop },
        { x: junctionX, y: spineBottom },
      ],
      ARROW_CORNER_RADIUS,
    )
    if (!stub || !spine) return null
    segments.push({
      id: `${trunkId}-stub`,
      d: stub,
      showMarker: false,
      memberDependencyIds: memberIds,
    })
    segments.push({
      id: trunkId,
      d: spine,
      showMarker: false,
      memberDependencyIds: memberIds,
    })
  } else {
    const farEnd = sourceY === spineTop ? spineBottom : spineTop
    const trunk = buildRoundedPolylinePath(
      [
        { x: sourceRight, y: sourceY },
        { x: junctionX, y: sourceY },
        { x: junctionX, y: farEnd },
      ],
      ARROW_CORNER_RADIUS,
    )
    if (!trunk) return null
    segments.push({
      id: trunkId,
      d: trunk,
      showMarker: false,
      memberDependencyIds: memberIds,
    })
  }

  for (const member of members) {
    const drop = buildRoundedPolylinePath(
      [
        { x: junctionX, y: member.targetY },
        { x: member.entryX, y: member.targetY },
      ],
      ARROW_CORNER_RADIUS,
    )
    if (!drop) return null
    segments.push({
      id: member.dependencyId,
      d: drop,
      showMarker: true,
      memberDependencyIds: [member.dependencyId],
    })
  }

  return segments
}

/**
 * Plan every same-side confluence and fan-out over the band's active anchor
 * plan. Call AFTER `planAnchorSlots`, over the SAME dependency list — the merge
 * reads the slots that pass allocated. `disabled` is the per-scenario
 * off-switch: it returns an empty plan, so every member routes individually and
 * the band draws exactly as it did before confluence.
 *
 * The result's `consumed` set names every dependency a trunk already draws; a
 * caller iterating `buildArrowPath` must skip those.
 */
export function planArrowConfluences(
  root: HTMLElement,
  dependencies: readonly AnchorSlotDependency[],
  options: { disabled?: boolean } = {},
): ArrowMergePlan {
  if (options.disabled || !activeAnchorPlan) return EMPTY_ARROW_MERGE_PLAN

  const depById = new Map<string, AnchorSlotDependency>()
  for (const dependency of dependencies) depById.set(dependency.id, dependency)

  const cellCache = new Map<string, HTMLElement | null>()
  const cellById = (id: string): HTMLElement | null => {
    const cached = cellCache.get(id)
    if (cached !== undefined) return cached
    const el = root.querySelector<HTMLElement>(`[data-blueprint-cell="${id}"]`)
    cellCache.set(id, el)
    return el
  }

  const segments: ArrowMergeSegment[] = []
  const consumed = new Set<string>()

  // Confluence: forward arrivals land on 'left', the only side a horizontal
  // trunk can gather.
  for (const group of planConfluences(activeAnchorPlan.values())) {
    if (group.side !== 'left') continue
    const built = buildConfluenceSegments(group, root, cellById, depById)
    if (!built) continue
    segments.push(...built)
    for (const endpointId of group.memberIds) {
      consumed.add(dependencyIdOfEndpoint(endpointId))
    }
  }

  // Fan-out: the mirror — forward departures leave on 'right'. A dependency the
  // confluence already merged never merges twice.
  for (const group of groupFanOutDepartures(activeAnchorPlan.values())) {
    if (group.side !== 'right') continue
    const liveMemberIds = group.memberIds.filter(
      (endpointId) => !consumed.has(dependencyIdOfEndpoint(endpointId)),
    )
    if (liveMemberIds.length < 2) continue
    const built = buildFanOutSegments(
      { ...group, memberIds: liveMemberIds },
      root,
      cellById,
      depById,
    )
    if (!built) continue
    segments.push(...built)
    for (const endpointId of liveMemberIds) {
      consumed.add(dependencyIdOfEndpoint(endpointId))
    }
  }

  return { segments, consumed }
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

function isCrossLayerForwardDependency(
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
 * Forward cross-column connector between different lane rows: exit the source
 * horizontally, travel in the column gap, then rise or drop into the target.
 */
export function buildCrossLayerForwardArrowPath(
  sourceEl: HTMLElement,
  targetEl: HTMLElement,
  root: HTMLElement,
  sourceSlotY?: number,
  targetSlotY?: number,
): string {
  const sourceBox = getCellContentBox(sourceEl, root)
  const targetBox = getCellContentBox(targetEl, root)
  const sourceY = sourceSlotY ?? sourceBox.top + sourceBox.height / 2
  const targetY = targetSlotY ?? targetBox.top + targetBox.height / 2
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

/**
 * Anchors for same-column gutter detours: exit at the source's top/bottom
 * center, but enter horizontally at the target's left edge, vertically
 * centered on the target's own card. The detour's final segment approaches
 * from the gutter side, so a top/bottom-center (vertical-entry) anchor would
 * leave the chevron riding along the target's top edge — for stacked touchpoint
 * targets that puts the head in the gap between neighbouring touchpoints.
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

/* --------------------------------------------------- gap-first corridors (#349)

  A same-row forward run that a column blocks has to detour. The lane it
  detours through used to be hand-pinned — always overhead, above the
  obstruction — which squeezes into whatever room sits between the cards and
  the band edge even when the underneath lane is wide open. `chooseCorridor`
  (pure, in `arrowAnchorSlots`) replaces the pin: this half measures the clear
  gap each lane affords within the run's own x-span and hands both candidates
  to the scorer, which picks the roomier. Plan §3's gap-first order falls out
  of that — the widest gap wins, and the behind-cell tuck only when neither
  lane clears the run.
*/

/** Adjacent co-traveller lanes sit this far apart in the detour corridor. */
export const ARROW_CORRIDOR_LANE_PITCH = 14

/** A corridor narrower than this cannot hold the run clear of the cards. */
const HORIZONTAL_DETOUR_MIN_ROOM = ARROW_DETOUR_CLEARANCE * 2

type HorizontalDetourCorridor = {
  routeY: number
  sourceRight: number
  exitGapX: number
  riseX: number
  entryX: number
  lane: 'overhead' | 'underneath'
  /** The detour line before any co-traveller offset. */
  baseDetourY: number
  /** The stretch of the corridor the run occupies (for co-traveller overlap). */
  spanLeft: number
  spanRight: number
}

/**
 * The corridor a same-row obstructed forward run detours through, scored gap-
 * first, or null when the run is not that shape. Pure geometry over the DOM —
 * `planArrowCorridors` and `buildHorizontalGutterDetourPath` both call it, so
 * the plan that assigns lanes and the builder that draws them agree on which
 * corridor each run rides.
 */
function computeHorizontalDetourCorridor(
  sourceEl: HTMLElement,
  targetEl: HTMLElement,
  root: HTMLElement,
): HorizontalDetourCorridor | null {
  const obstructing = getSameRowObstructingCells(sourceEl, targetEl)
  if (obstructing.length === 0) return null

  const sourceStep = parseStepIndex(sourceEl)
  if (sourceStep === null) return null

  const sourceBox = getCellContentBox(sourceEl, root)
  const targetBox = getCellContentBox(targetEl, root)
  const routeY = getArrowCenterY(sourceEl, targetEl, root)
  const entryX = targetBox.left - ARROW_CHEVRON_SIZE
  const exitGapX =
    getStepGapCenterX(root, sourceStep) ?? sourceBox.right + STEP_COLUMN_GAP / 2
  const riseX =
    getPreTargetGapCenterX(root, sourceEl, targetEl) ??
    entryX - Math.max(28, ARROW_CORNER_RADIUS * 2.5)

  const spanLeft = Math.min(exitGapX, riseX)
  const spanRight = Math.max(exitGapX, riseX)

  let obsTop = Infinity
  let obsBottom = -Infinity
  for (const el of obstructing) {
    const box = getCellContentBox(el, root)
    obsTop = Math.min(obsTop, box.top)
    obsBottom = Math.max(obsBottom, box.top + box.height)
  }

  // The corridor's room is the clear gap between the obstruction band and the
  // nearest card the run would meet in that direction, within its own x-span —
  // so a lane a neighbouring card leans into reports a small gap and loses.
  const rootBox = getElementLayoutBox(root, root)
  let ceiling = rootBox.top
  let floor = rootBox.top + rootBox.height
  for (const el of queryBlueprintCells(root, root)) {
    if (el === sourceEl || el === targetEl) continue
    const box = getCellContentBox(el, root)
    if (box.right <= spanLeft || box.left >= spanRight) continue
    const cellBottom = box.top + box.height
    if (cellBottom <= obsTop) ceiling = Math.max(ceiling, cellBottom)
    else if (box.top >= obsBottom) floor = Math.min(floor, box.top)
  }

  const chosen = chooseCorridor(
    [
      { id: 'overhead', line: obsTop - ARROW_DETOUR_CLEARANCE, room: obsTop - ceiling },
      { id: 'underneath', line: obsBottom + ARROW_DETOUR_CLEARANCE, room: floor - obsBottom },
    ],
    routeY,
    HORIZONTAL_DETOUR_MIN_ROOM,
  )
  if (!chosen) return null

  return {
    routeY,
    sourceRight: sourceBox.right,
    exitGapX,
    riseX,
    entryX,
    lane: chosen.id === 'underneath' ? 'underneath' : 'overhead',
    baseDetourY: chosen.line,
    spanLeft,
    spanRight,
  }
}

/**
 * Plan the co-traveller offsets for one band's corridor detours.
 *
 * Collects every dependency that would take a horizontal gutter detour, scores
 * the corridor each rides, and hands the runs to `allocateCorridorLanes` so two
 * that share one lane fan onto adjacent lanes instead of drawing one doubled
 * line. Call over the dependencies the band will actually route (confluence
 * members excluded — a merged trunk is not a corridor run). The result replaces
 * the active plan, which `buildHorizontalGutterDetourPath` then consults.
 */
export function planArrowCorridors(
  root: HTMLElement,
  dependencies: readonly AnchorSlotDependency[],
): void {
  const runs: CorridorRun[] = []
  dependencies.forEach((dependency, index) => {
    const sourceEl = root.querySelector<HTMLElement>(
      `[data-blueprint-cell="${dependency.source_cell_id}"]`,
    )
    const targetEl = root.querySelector<HTMLElement>(
      `[data-blueprint-cell="${dependency.target_cell_id}"]`,
    )
    if (!sourceEl || !targetEl) return

    const corridor = computeHorizontalDetourCorridor(sourceEl, targetEl, root)
    if (!corridor) return

    runs.push({
      id: dependency.id,
      lane: corridor.lane,
      line: corridor.baseDetourY,
      start: corridor.spanLeft,
      end: corridor.spanRight,
      sortKey: index,
    })
  })

  activeCorridorPlan = allocateCorridorLanes(runs)
}

/** Forget the active corridor plan, so an unplanned build reads no stale lane. */
export function clearArrowCorridorPlan(): void {
  activeCorridorPlan = null
}

/** The lane a run was assigned, or absent when its corridor was uncontested. */
function corridorLaneFor(
  dependencyId: string | undefined,
): CorridorLaneAssignment | undefined {
  if (!activeCorridorPlan || dependencyId === undefined) return undefined
  return activeCorridorPlan.get(dependencyId)
}

/**
 * Horizontal connector that detours around skipped cells, riding the gap-first
 * corridor `computeHorizontalDetourCorridor` scored. When it shares that
 * corridor with another run, the corridor plan nudges it onto an adjacent lane
 * (`dependencyId` looks up its offset); a run sharing its corridor with nothing
 * keeps lane 0 and draws exactly on the scored line.
 */
export function buildHorizontalGutterDetourPath(
  sourceEl: HTMLElement,
  targetEl: HTMLElement,
  root: HTMLElement,
  dependencyId?: string,
): string {
  const corridor = computeHorizontalDetourCorridor(sourceEl, targetEl, root)
  if (!corridor) return ''

  const lane = corridorLaneFor(dependencyId)
  const laneDirection = corridor.lane === 'underneath' ? 1 : -1
  const detourY =
    corridor.baseDetourY +
    (lane ? lane.index * ARROW_CORRIDOR_LANE_PITCH * laneDirection : 0)

  return buildRoundedPolylinePath(
    [
      { x: corridor.sourceRight, y: corridor.routeY },
      { x: corridor.exitGapX, y: corridor.routeY },
      { x: corridor.exitGapX, y: detourY },
      { x: corridor.riseX, y: detourY },
      { x: corridor.riseX, y: corridor.routeY },
      { x: corridor.entryX, y: corridor.routeY },
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

export function isWrapDependency(
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

export type BidirectionalDependencyLink = {
  id: string
  source_cell_id: string
  target_cell_id: string
}

export type BidirectionalDependencyPair<T extends BidirectionalDependencyLink> = {
  first: T
  second: T
  cellAId: string
  cellBId: string
}

/** Pairs of dependencies that connect the same two cells in opposite directions. */
export function findBidirectionalDependencyPairs<T extends BidirectionalDependencyLink>(
  dependencies: T[],
): { pairs: BidirectionalDependencyPair<T>[]; remaining: T[] } {
  const pending = new Map<string, T>()
  const pairedIds = new Set<string>()
  const pairs: BidirectionalDependencyPair<T>[] = []

  for (const dependency of dependencies) {
    const reverseKey = `${dependency.target_cell_id}->${dependency.source_cell_id}`
    const reverse = pending.get(reverseKey)
    if (reverse) {
      pairedIds.add(dependency.id)
      pairedIds.add(reverse.id)
      pairs.push({
        first: reverse,
        second: dependency,
        cellAId: reverse.source_cell_id,
        cellBId: reverse.target_cell_id,
      })
      pending.delete(reverseKey)
      continue
    }

    pending.set(
      `${dependency.source_cell_id}->${dependency.target_cell_id}`,
      dependency,
    )
  }

  return {
    pairs,
    remaining: dependencies.filter((dependency) => !pairedIds.has(dependency.id)),
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

  const rowA = getLayerRow(cellAEl)
  const rowB = getLayerRow(cellBEl)
  if (!rowA || !rowB || rowA === rowB) return ''

  return buildBidirectionalVerticalArrowPath(cellAEl, cellBEl, root)
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
 * through the center of the column gap (e.g. step 3 → 4 on one lane).
 */
export function buildAdjacentColumnGapArrowPath(
  sourceEl: HTMLElement,
  targetEl: HTMLElement,
  root: HTMLElement,
  sourceSlotY?: number,
  targetSlotY?: number,
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

  const sourceY = sourceSlotY ?? y
  const targetY = targetSlotY ?? y

  // Uncontested: one straight run at a single Y, byte-identical to before.
  if (sourceY === targetY) {
    return buildRoundedPolylinePath(
      [
        { x: sourceBox.right, y: sourceY },
        { x: gapX, y: sourceY },
        { x: entryX, y: sourceY },
      ],
      ARROW_CORNER_RADIUS,
    )
  }

  // A contested end sits on its own slot, so the run jogs across in the gap.
  return buildRoundedPolylinePath(
    [
      { x: sourceBox.right, y: sourceY },
      { x: gapX, y: sourceY },
      { x: gapX, y: targetY },
      { x: entryX, y: targetY },
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
 * Orthogonal wrap (e.g. step 8 → step 1): down from source bottom into the space
 * above the interaction line, across, then up into the target bottom.
 */
export function buildWrapArrowPath(
  sourceEl: HTMLElement,
  targetEl: HTMLElement,
  root: HTMLElement,
  sourceSlot?: SlotAssignment,
  targetSlot?: SlotAssignment,
): string {
  const { source, target } = getWrapCellAnchors(sourceEl, targetEl, root)
  const corridorY = getWrapLoopRouteY(sourceEl, root)

  // Wrap runs right → left; target must sit in an earlier column.
  if (target.x >= source.x) {
    return ''
  }

  const exitSlot = wrapSlotLeg(getCellContentBox(sourceEl, root), sourceSlot)
  const enterSlot = wrapSlotLeg(getCellContentBox(targetEl, root), targetSlot)

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
    'below',
    exitSlot,
  )
  const enterLeg = buildWrapColumnLeg(
    targetEl,
    root,
    corridorY,
    'enter',
    'below',
    enterSlot,
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
 * One end of a wrap: the points that take the route between a card and the
 * corridor it runs along — `below` the lane for a loop under it, `above` for
 * an overhead rail. Straight up or down the column when that stretch of the
 * column is clear, otherwise out of the card's side, into the gutter, and
 * along there.
 *
 * A wrap runs right → left, so the source leaves by its left edge and the
 * target is met on its right edge — the detour never doubles back.
 */
export function buildWrapColumnLeg(
  cellEl: HTMLElement,
  root: HTMLElement,
  corridorY: number,
  end: 'exit' | 'enter',
  side: 'below' | 'above' = 'below',
  slot: WrapSlotLeg = {},
): Point[] | null {
  const box = getCellContentBox(cellEl, root)
  const centerX = slot.centerX ?? (box.left + box.right) / 2
  const edgeY = side === 'below' ? box.top + box.height : box.top

  // A contested out yielded the bottom to an in and slid to the fallback
  // side: leave through the card's right face and down the right gutter,
  // mirroring the side-on arrival a blocked column already uses.
  if (end === 'exit' && slot.forceSide === 'right') {
    const stepIndex = parseStepIndex(cellEl) ?? 0
    const midY = box.top + box.height / 2
    const gutterX = getVerticalRouteRightGutterX(root, stepIndex, cellEl)
    const entryX = box.right + ARROW_CHEVRON_SIZE
    if (gutterX <= entryX) return null
    return [
      { x: entryX, y: midY },
      { x: gutterX, y: midY },
      { x: gutterX, y: corridorY },
    ]
  }

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
  if (end === 'exit') {
    const gutterX = getVerticalRouteGutterX(root, stepIndex, cellEl)
    const entryX = box.left - ARROW_CHEVRON_SIZE
    if (gutterX >= entryX) return null
    return [
      { x: entryX, y: midY },
      { x: gutterX, y: midY },
      { x: gutterX, y: corridorY },
    ]
  }

  const gutterX = getVerticalRouteRightGutterX(root, stepIndex, cellEl)
  const entryX = box.right + ARROW_CHEVRON_SIZE
  if (gutterX <= entryX) return null
  return [
    { x: gutterX, y: corridorY },
    { x: gutterX, y: midY },
    { x: entryX, y: midY },
  ]
}

/** Forward gap arrow, same-column vertical connector, or backward wrap. */
export function buildArrowPath(
  sourceEl: HTMLElement,
  targetEl: HTMLElement,
  root: HTMLElement,
  _sourceCellId?: string,
  _targetCellId?: string,
  dependencyId?: string,
): string {
  const sourceStep = parseStepIndex(sourceEl)
  const targetStep = parseStepIndex(targetEl)

  // Anchor slots for this arrow's two endpoints, if the band was planned.
  // Absent or uncontested (`count === 1`, not displaced) leaves every anchor
  // on today's midpoint; only a contested side hands out a distinct slot.
  const sourceSlot = endpointSlot(dependencyId, 'out')
  const targetSlot = endpointSlot(dependencyId, 'in')

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

  if (isWrapDependency(sourceEl, targetEl)) {
    return buildWrapArrowPath(sourceEl, targetEl, root, sourceSlot, targetSlot)
  }

  if (
    sourceStep !== null &&
    targetStep !== null &&
    targetStep === sourceStep + 1 &&
    getLayerRow(sourceEl) === getLayerRow(targetEl)
  ) {
    return buildAdjacentColumnGapArrowPath(
      sourceEl,
      targetEl,
      root,
      verticalEdgeSlotY(getCellContentBox(sourceEl, root), sourceSlot, 'right'),
      verticalEdgeSlotY(getCellContentBox(targetEl, root), targetSlot, 'left'),
    )
  }

  if (isCrossLayerForwardDependency(sourceEl, targetEl)) {
    return buildCrossLayerForwardArrowPath(
      sourceEl,
      targetEl,
      root,
      verticalEdgeSlotY(getCellContentBox(sourceEl, root), sourceSlot, 'right'),
      verticalEdgeSlotY(getCellContentBox(targetEl, root), targetSlot, 'left'),
    )
  }

  if (getSameRowObstructingCells(sourceEl, targetEl).length > 0) {
    return buildHorizontalGutterDetourPath(
      sourceEl,
      targetEl,
      root,
      dependencyId,
    )
  }

  const anchors = getHorizontalCellAnchors(sourceEl, targetEl, root)
  return buildHorizontalArrowPath(anchors.source, anchors.target)
}
