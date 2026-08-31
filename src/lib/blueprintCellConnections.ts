import { buildBlueprintCellSelection, getTechPillItems } from '@/lib/blueprintCellSelection'
import { resolveBlueprintCellId } from '@/lib/resolveBlueprintCellId'
import { shouldUsePillCellContent } from '@/lib/blueprintLayout'
import type { BlueprintCellSelection } from '@/types/blueprintCellDetail'
import type { BlueprintCell, BlueprintCellTrigger, BlueprintData } from '@/types/blueprint'
import { cellResources } from '@/lib/cellResources'
import { cellTouchpoints } from '@/lib/cellTouchpoints'

export type BlueprintCellConnectionKind = 'interaction' | 'connection'

export type BlueprintCellConnection = {
  triggerId: string
  cellId: string
  laneName: string
  lanePosition: number
  stepName: string
  stepIndex: number
  kind: BlueprintCellConnectionKind
  /** Link semantics from the dependency row: makes it happen vs makes it possible. */
  linkKind: 'leads_to' | 'enables'
  /** Short edge label chip (e.g. a channel tag like "Email"). */
  linkLabel: string | null
  /** Why-line shown under the dependency row. */
  linkNote: string | null
  isTech: boolean
  techItems: string[]
  contentPreview: string
}

export type BlueprintCellConnections = {
  incoming: BlueprintCellConnection[]
  outgoing: BlueprintCellConnection[]
}

function findCell(blueprint: BlueprintData, cellId: string): BlueprintCell | undefined {
  const resolvedId = resolveBlueprintCellId(cellId)
  return blueprint.cells.find((cell) => cell.id === resolvedId)
}

function resolveLane(blueprint: BlueprintData, laneId: string) {
  return blueprint.lanes.find((lane) => lane.id === laneId)
}

function resolveStepName(blueprint: BlueprintData, stepId: string): string {
  return blueprint.steps.find((step) => step.id === stepId)?.name ?? 'Unknown step'
}

function contentPreview(content: string): string {
  const firstLine = content.trim().split('\n')[0]?.trim() ?? ''
  if (firstLine.length <= 72) return firstLine
  return `${firstLine.slice(0, 69)}…`
}

function resolveStepIndex(blueprint: BlueprintData, stepId: string): number {
  return blueprint.steps.findIndex((step) => step.id === stepId)
}

function toConnection(
  blueprint: BlueprintData,
  trigger: BlueprintCellTrigger,
  cellId: string,
  selectedStepIndex: number,
): BlueprintCellConnection | null {
  const cell = findCell(blueprint, cellId)
  if (!cell) return null

  const stepIndex = resolveStepIndex(blueprint, cell.step_id)
  if (stepIndex < 0) return null

  const lane = resolveLane(blueprint, cell.lane_id)
  const laneName = lane?.name ?? 'Unknown lane'
  const lanePosition = lane?.position ?? -1
  const isTech = lane ? shouldUsePillCellContent(lane) : false
  const techItems = isTech ? getTechPillItems(cell.content) : []

  return {
    triggerId: trigger.id,
    cellId,
    laneName,
    lanePosition,
    stepName: resolveStepName(blueprint, cell.step_id),
    stepIndex,
    kind: stepIndex === selectedStepIndex ? 'interaction' : 'connection',
    linkKind: trigger.kind === 'enables' ? 'enables' : 'leads_to',
    linkLabel: trigger.label ?? null,
    linkNote: trigger.note ?? null,
    isTech,
    techItems,
    contentPreview: contentPreview(cell.content),
  }
}

export function getBlueprintForPath(
  blueprints: BlueprintData[],
  pathId: string,
): BlueprintData | undefined {
  return blueprints.find((blueprint) => blueprint.path.id === pathId)
}

export function getBlueprintCellConnections(
  blueprint: BlueprintData,
  cellId: string,
): BlueprintCellConnections {
  const resolvedCellId = resolveBlueprintCellId(cellId)
  const selectedCell = findCell(blueprint, resolvedCellId)
  const selectedStepIndex =
    selectedCell !== undefined
      ? resolveStepIndex(blueprint, selectedCell.step_id)
      : -1

  const incoming: BlueprintCellConnection[] = []
  const outgoing: BlueprintCellConnection[] = []

  for (const trigger of blueprint.triggers) {
    if (trigger.target_cell_id === resolvedCellId) {
      const connection = toConnection(
        blueprint,
        trigger,
        trigger.source_cell_id,
        selectedStepIndex,
      )
      if (connection) incoming.push(connection)
    }
    if (trigger.source_cell_id === resolvedCellId) {
      const connection = toConnection(
        blueprint,
        trigger,
        trigger.target_cell_id,
        selectedStepIndex,
      )
      if (connection) outgoing.push(connection)
    }
  }

  return { incoming, outgoing }
}

export type LinkedTechEntry = {
  id: string
  cellId: string
  item: string
}

export function getLinkedTechFromConnections(
  connections: BlueprintCellConnections,
): LinkedTechEntry[] {
  const entries: LinkedTechEntry[] = []
  const seen = new Set<string>()

  for (const connection of [
    ...connections.incoming,
    ...connections.outgoing,
  ]) {
    if (!connection.isTech) continue

    for (const item of connection.techItems) {
      const id = `${connection.cellId}:${item}`
      if (seen.has(id)) continue
      seen.add(id)
      entries.push({ id, cellId: connection.cellId, item })
    }
  }

  return entries
}

export function getFlowConnections(
  connections: BlueprintCellConnections,
): BlueprintCellConnections {
  return {
    incoming: connections.incoming.filter((connection) => !connection.isTech),
    outgoing: connections.outgoing.filter((connection) => !connection.isTech),
  }
}

export type FlowConnectionDirection = 'prev' | 'next' | 'both'

export type DirectedFlowConnection = BlueprintCellConnection & {
  direction: FlowConnectionDirection
}

function dedupeByCellId(items: BlueprintCellConnection[]): BlueprintCellConnection[] {
  const seen = new Map<string, BlueprintCellConnection>()
  for (const item of items) {
    if (!seen.has(item.cellId)) {
      seen.set(item.cellId, item)
    }
  }
  return [...seen.values()]
}

export function getDirectedConnections(
  incoming: BlueprintCellConnection[],
  outgoing: BlueprintCellConnection[],
): DirectedFlowConnection[] {
  const byCellId = new Map<
    string,
    { connection: BlueprintCellConnection; prev: boolean; next: boolean }
  >()

  for (const item of incoming) {
    if (item.kind !== 'connection') continue
    const existing = byCellId.get(item.cellId)
    if (existing) {
      existing.prev = true
    } else {
      byCellId.set(item.cellId, { connection: item, prev: true, next: false })
    }
  }

  for (const item of outgoing) {
    if (item.kind !== 'connection') continue
    const existing = byCellId.get(item.cellId)
    if (existing) {
      existing.next = true
    } else {
      byCellId.set(item.cellId, { connection: item, prev: false, next: true })
    }
  }

  return [...byCellId.values()].map(({ connection, prev, next }) => ({
    ...connection,
    direction: prev && next ? 'both' : prev ? 'prev' : 'next',
  }))
}

export type FlowInteractionDirection = 'up' | 'down'

export type DirectedFlowInteraction = BlueprintCellConnection & {
  direction: FlowInteractionDirection
}

export function getSelectedCellLanePosition(
  blueprint: BlueprintData,
  cellId: string,
): number {
  const cell = findCell(blueprint, cellId)
  if (!cell) return -1
  return resolveLane(blueprint, cell.lane_id)?.position ?? -1
}

function interactionDirectionFromRows(
  linkedPosition: number,
  selectedPosition: number,
): 'up' | 'down' {
  if (linkedPosition < selectedPosition) return 'up'
  return 'down'
}

export function getDirectedInteractions(
  incoming: BlueprintCellConnection[],
  outgoing: BlueprintCellConnection[],
  selectedLanePosition: number,
): DirectedFlowInteraction[] {
  const byCellId = new Map<string, BlueprintCellConnection>()

  for (const item of [...incoming, ...outgoing]) {
    if (item.kind !== 'interaction') continue
    if (!byCellId.has(item.cellId)) {
      byCellId.set(item.cellId, item)
    }
  }

  return [...byCellId.values()].map((connection) => ({
    ...connection,
    direction: interactionDirectionFromRows(
      connection.lanePosition,
      selectedLanePosition,
    ),
  }))
}

export function getUniqueInteractions(
  incoming: BlueprintCellConnection[],
  outgoing: BlueprintCellConnection[],
): BlueprintCellConnection[] {
  return dedupeByCellId([
    ...incoming.filter((item) => item.kind === 'interaction'),
    ...outgoing.filter((item) => item.kind === 'interaction'),
  ])
}

export function buildBlueprintCellSelectionForId(
  blueprint: BlueprintData,
  cellId: string,
  scenarioName: string,
  phaseName?: string,
): BlueprintCellSelection | null {
  const cell = findCell(blueprint, cellId)
  if (!cell) return null

  const lane = blueprint.lanes.find((entry) => entry.id === cell.lane_id)
  const stepIndex = blueprint.steps.findIndex((entry) => entry.id === cell.step_id)
  const step = blueprint.steps[stepIndex]
  if (!lane || !step || stepIndex < 0) return null

  return buildBlueprintCellSelection({
    scenarioName,
    phaseName,
    laneName: lane.name,
    stepId: step.id,
    stepName: step.name,
    stepIndex,
    cellId: cell.id,
    cellContent: cell.content,
    cellPicture: cell.picture,
    cellSummary: cell.summary,
    cellTouchpoints: cellTouchpoints(cell),
    cellResources: cellResources(cell),
    pathId: blueprint.path.id,
    pathName: blueprint.path.name,
    pathSummary: blueprint.path.summary,
    pathType: blueprint.path.path_type,
  })
}

export function scrollBlueprintCellIntoView(cellId: string): void {
  const element = document.querySelector<HTMLElement>(
    `[data-blueprint-cell="${CSS.escape(cellId)}"]`,
  )
  if (!element) return
  // Inside the zoom/pan camera, "scroll" is a lie (todo 027 §5): the
  // viewport is overflow-hidden and moves by transform, but a programmatic
  // scrollIntoView still sets scrollTop on the hidden-overflow box — which
  // every camera calculation assumes is zero, so the board afterwards zooms
  // toward a point offset from the fingers. Cells on a canvas are brought
  // into view by the camera (the focus-cells pipeline); this helper only
  // scrolls surfaces that genuinely scroll.
  if (element.closest('[data-zoom-pan-viewport]')) return
  element.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'nearest' })
}
