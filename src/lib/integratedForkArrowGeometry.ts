import {
  ARROW_CHEVRON_SIZE,
  buildRoundedPolylinePath,
  getArrowCenterY,
  getCellContentBox,
  getWrapCorridorBounds,
  getWrapLoopRouteY,
  parseStepIndex,
  type Point,
} from '@/lib/blueprintArrowGeometry'
import { STEP_COLUMN_GAP } from '@/lib/blueprintLayout'
import { BLUEPRINT_THEME } from '@/lib/blueprintTheme'
import type {
  IntegratedBlueprintCell,
  IntegratedBlueprintStep,
  IntegratedBlueprintTrigger,
} from '@/types/integratedBlueprint'
import type { PathType } from '@/types/database'

/** Visual tokens for integrated path fork junctions. */
export const INTEGRATED_FORK_THEME = {
  /** Shared approach line before the branch node (stroke uses path color). */
  trunkWidth: 1.5,
  trunkWidthDimmed: 1.5,
  /** Branch-node disc — subtle, matches blueprint chrome. */
  nodeRadius: 4,
  nodeFill: '#AEAEB2',
  /** Canvas knock-out ring so the node reads on busy lanes. */
  nodeHaloRadius: 6.5,
  nodeHaloFill: BLUEPRINT_THEME.canvas,
  /** Branch strokes. */
  branchWidth: 1.5,
  branchWidthDimmed: 1.5,
  /** Minimum clearance below skipped cells for the detour lane. */
  detourClearance: 8,
  /** Minimum vertical gap between detour and loop-back corridors. */
  detourWrapMinGap: 14,
  /** Fallback drop when no obstructing cells are found. */
  detourDrop: 34,
  detourLaneOffset: 5,
  detourCornerRadius: 11,
  /** Cubic ease on the primary (straight) branch. */
  straightEase: 18,
  /** Angle on the node where the detour exits (degrees, 0 = east). */
  detourExitAngle: 96,
} as const

export type IntegratedForkGroup = {
  id: string
  sourceLayerId: string
  sourceStepId: string
  branches: IntegratedBlueprintTrigger[]
}

export function detectIntegratedForkGroups(
  triggers: IntegratedBlueprintTrigger[],
  cells: IntegratedBlueprintCell[],
  steps: IntegratedBlueprintStep[],
): { groups: IntegratedForkGroup[]; forkTriggerIds: Set<string> } {
  const cellById = new Map(cells.map((cell) => [cell.id, cell]))
  const stepById = new Map(steps.map((step) => [step.id, step]))
  const grouped = new Map<string, IntegratedBlueprintTrigger[]>()

  for (const trigger of triggers) {
    const source = cellById.get(trigger.source_cell_id)
    const target = cellById.get(trigger.target_cell_id)
    if (!source || !target) continue
    if (source.step_id === target.step_id) continue

    const key = `${source.layer_id}:${source.step_id}`
    const list = grouped.get(key) ?? []
    list.push(trigger)
    grouped.set(key, list)
  }

  const groups: IntegratedForkGroup[] = []
  const forkTriggerIds = new Set<string>()

  grouped.forEach((branches, key) => {
    if (branches.length < 2) return

    const targetStepIds = new Set(
      branches.map((branch) => cellById.get(branch.target_cell_id)?.step_id),
    )
    if (targetStepIds.size < 2) return

    const [sourceLayerId, sourceStepId] = key.split(':')
    const sourceStep = stepById.get(sourceStepId)
    if (!sourceStep) return

    const sorted = [...branches].sort((a, b) => {
      const targetA = cellById.get(a.target_cell_id)
      const targetB = cellById.get(b.target_cell_id)
      const stepA = targetA ? stepById.get(targetA.step_id) : undefined
      const stepB = targetB ? stepById.get(targetB.step_id) : undefined
      return (stepA?.column_position ?? 0) - (stepB?.column_position ?? 0)
    })

    const group: IntegratedForkGroup = {
      id: key,
      sourceLayerId,
      sourceStepId,
      branches: sorted,
    }
    groups.push(group)
    for (const branch of sorted) {
      forkTriggerIds.add(branch.id)
    }
  })

  return { groups, forkTriggerIds }
}

export function pointOnForkNode(center: Point, angleDeg: number): Point {
  const rad = (angleDeg * Math.PI) / 180
  const r = INTEGRATED_FORK_THEME.nodeRadius
  return {
    x: center.x + r * Math.cos(rad),
    y: center.y + r * Math.sin(rad),
  }
}

export function getIntegratedForkCircleCenter(
  sourceEl: HTMLElement,
  root: HTMLElement,
): Point {
  const sourceBox = getCellContentBox(sourceEl, root)
  const y = sourceBox.top + sourceBox.height / 2
  return {
    x: sourceBox.right + STEP_COLUMN_GAP / 2,
    y,
  }
}

/** Trunk runs beneath the node so the fill cleanly caps the shared segment. */
export function buildIntegratedForkTrunkPath(
  sourceEl: HTMLElement,
  circle: Point,
  root: HTMLElement,
): string {
  const sourceBox = getCellContentBox(sourceEl, root)
  const y = circle.y
  const startX = sourceBox.right
  const endX = circle.x
  if (endX <= startX) return ''
  return `M ${startX} ${y} L ${endX} ${y}`
}

/** Primary branch: soft cubic ease-out from the node into the next step. */
export function buildIntegratedForkStraightBranchPath(
  circle: Point,
  sourceEl: HTMLElement,
  targetEl: HTMLElement,
  root: HTMLElement,
): string {
  const y = getArrowCenterY(sourceEl, targetEl, root)
  const targetBox = getCellContentBox(targetEl, root)
  const start = pointOnForkNode(circle, 0)
  const endX = targetBox.left - ARROW_CHEVRON_SIZE
  if (endX <= start.x) return ''

  const span = endX - start.x
  const ease = Math.min(INTEGRATED_FORK_THEME.straightEase, span * 0.14)

  return `M ${start.x} ${start.y} C ${start.x + ease} ${y} ${endX - ease} ${y} ${endX} ${y}`
}

function getLayerRow(el: HTMLElement): HTMLElement | null {
  return el.closest('[data-blueprint-row]')
}

/** Cells in the same lane whose columns sit strictly between source and target. */
function getObstructingCellElements(
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
  const layerId = layerRow?.dataset.layerId
  if (!layerRow || !layerId) return []

  const obstructing: HTMLElement[] = []
  layerRow.querySelectorAll<HTMLElement>('[data-blueprint-cell]').forEach((el) => {
    const idx = parseStepIndex(el)
    if (idx === null || idx < lo || idx > hi) return
    obstructing.push(el)
  })

  return obstructing
}

/** Y for the horizontal detour lane — below skipped cells, above the loop-back corridor. */
function getIntegratedDetourLaneY(
  root: HTMLElement,
  sourceEl: HTMLElement,
  circle: Point,
  obstructingEls: HTMLElement[],
): number {
  const sourceBox = getCellContentBox(sourceEl, root)
  let laneBottom = sourceBox.top + sourceBox.height

  for (const el of obstructingEls) {
    const box = getCellContentBox(el, root)
    laneBottom = Math.max(laneBottom, box.top + box.height)
  }

  const { detourClearance, detourWrapMinGap, detourDrop } = INTEGRATED_FORK_THEME
  let detourY = laneBottom + detourClearance

  const corridor = getWrapCorridorBounds(sourceEl, root)
  if (corridor) {
    const loopY = getWrapLoopRouteY(sourceEl, root)
    const maxDetourY = loopY - detourWrapMinGap
    const corridorHeight = corridor.end - corridor.start
    const minDetourY =
      corridor.start + Math.min(detourClearance, corridorHeight * 0.22)
    detourY = Math.min(detourY, maxDetourY)
    detourY = Math.max(detourY, minDetourY, laneBottom + 4)
    return detourY
  }

  return Math.max(detourY, circle.y + detourDrop)
}

/** Center of the column gap immediately before the target step. */
function getPreTargetGapCenterX(
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
  const rightEl = targetEl

  if (leftEl) {
    const leftBox = getCellContentBox(leftEl, root)
    const rightBox = getCellContentBox(rightEl, root)
    return (leftBox.right + rightBox.left) / 2
  }

  const targetBox = getCellContentBox(targetEl, root)
  return targetBox.left - STEP_COLUMN_GAP / 2
}

/** Alternate branch: fan out from the node, glide below skipped cells, rise in the gap, enter horizontally. */
export function buildIntegratedForkDetourBranchPath(
  circle: Point,
  sourceEl: HTMLElement,
  targetEl: HTMLElement,
  root: HTMLElement,
): string {
  const targetBox = getCellContentBox(targetEl, root)
  const targetY = getArrowCenterY(sourceEl, targetEl, root)
  const entryX = targetBox.left - ARROW_CHEVRON_SIZE
  const obstructingEls = getObstructingCellElements(sourceEl, targetEl)
  const detourY = getIntegratedDetourLaneY(root, sourceEl, circle, obstructingEls)
  const forkGapX = circle.x
  const start = pointOnForkNode(circle, INTEGRATED_FORK_THEME.detourExitAngle)

  const riseX =
    getPreTargetGapCenterX(root, sourceEl, targetEl) ??
    entryX - Math.max(28, INTEGRATED_FORK_THEME.detourCornerRadius * 2.5)

  return buildRoundedPolylinePath(
    [
      start,
      { x: forkGapX + INTEGRATED_FORK_THEME.detourLaneOffset, y: start.y + 6 },
      { x: forkGapX, y: detourY },
      { x: riseX, y: detourY },
      { x: riseX, y: targetY },
      { x: entryX, y: targetY },
    ],
    INTEGRATED_FORK_THEME.detourCornerRadius,
  )
}

export function pickStraightForkBranch(
  group: IntegratedForkGroup,
  cells: IntegratedBlueprintCell[],
  steps: IntegratedBlueprintStep[],
): IntegratedBlueprintTrigger {
  const stepById = new Map(steps.map((step) => [step.id, step]))
  const sourceStep = stepById.get(group.sourceStepId)
  const immediateColumn = (sourceStep?.column_position ?? 0) + 1

  const immediate = group.branches.find((branch) => {
    const target = cells.find((cell) => cell.id === branch.target_cell_id)
    const targetStep = target ? stepById.get(target.step_id) : undefined
    return targetStep?.column_position === immediateColumn
  })

  return immediate ?? group.branches[0]
}

/** Detour only when a branch skips one or more columns; shared next-step paths stay straight. */
export function shouldUseIntegratedForkDetour(
  branch: IntegratedBlueprintTrigger,
  cells: IntegratedBlueprintCell[],
  steps: IntegratedBlueprintStep[],
  group: IntegratedForkGroup,
): boolean {
  const stepById = new Map(steps.map((step) => [step.id, step]))
  const sourceStep = stepById.get(group.sourceStepId)
  if (!sourceStep) return true

  const target = cells.find((cell) => cell.id === branch.target_cell_id)
  const targetStep = target ? stepById.get(target.step_id) : undefined
  if (!targetStep) return true

  return targetStep.column_position > sourceStep.column_position + 1
}

export function getIntegratedForkBranchStrokeWidth(opacity: number): number {
  return opacity >= 1
    ? INTEGRATED_FORK_THEME.branchWidth
    : INTEGRATED_FORK_THEME.branchWidthDimmed
}

export function getIntegratedForkTrunkStrokeWidth(opacity: number): number {
  return opacity >= 1
    ? INTEGRATED_FORK_THEME.trunkWidth
    : INTEGRATED_FORK_THEME.trunkWidthDimmed
}

/** Node + trunk opacity — active when at least one connected branch is selected. */
export function getIntegratedForkNodeOpacity(
  branches: ReadonlyArray<{ opacity: number }>,
): number {
  if (branches.length === 0) return 1
  return Math.max(...branches.map((branch) => branch.opacity))
}

/** Trunk color follows the sole active branch, otherwise the straight/primary path. */
export function getIntegratedForkTrunkPathType(
  branches: ReadonlyArray<{ pathType: PathType; opacity: number }>,
  straightPathType: PathType,
): PathType {
  const active = branches.filter((branch) => branch.opacity >= 1)
  if (active.length === 1) return active[0].pathType
  return straightPathType
}
