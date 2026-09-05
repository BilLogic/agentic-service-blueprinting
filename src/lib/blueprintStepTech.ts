import {
  buildTouchpointSelection,
  getTouchpointItems,
} from '@/lib/blueprintCellSelection'
import { resolveBlueprintCellId } from '@/lib/resolveBlueprintCellId'
import { shouldUseTouchpointCellContent } from '@/lib/blueprintLayout'
import type { BlueprintCellSelection } from '@/types/blueprintCellDetail'
import type { BlueprintData } from '@/types/blueprint'
import { cellResources } from '@/lib/cellResources'
import { cellTouchpoints } from '@/lib/cellTouchpoints'

export type BlueprintStepTechEntry = {
  id: string
  cellId: string
  item: string
  laneName: string
  stepIndex: number
}

type ExcludeStepTechSelection = {
  cellId: string
  item: string
}

export function getBlueprintStepTechItems(
  blueprint: BlueprintData,
  stepId: string,
  exclude?: ExcludeStepTechSelection | null,
): BlueprintStepTechEntry[] {
  const stepIndex = blueprint.steps.findIndex((step) => step.id === stepId)
  if (stepIndex < 0) return []

  const touchpointLanes = blueprint.lanes
    .filter((lane) => shouldUseTouchpointCellContent(lane))
    .sort((a, b) => a.position - b.position)

  const entries: BlueprintStepTechEntry[] = []

  for (const lane of touchpointLanes) {
    const cell = blueprint.cells.find(
      (entry) => entry.lane_id === lane.id && entry.step_id === stepId,
    )
    if (!cell) continue

    for (const item of getTouchpointItems(cell.content)) {
      if (
        exclude &&
        resolveBlueprintCellId(exclude.cellId) === cell.id &&
        exclude.item === item
      ) {
        continue
      }

      entries.push({
        id: `${cell.id}:${item}`,
        cellId: cell.id,
        item,
        laneName: lane.name,
        stepIndex,
      })
    }
  }

  return entries
}

export function buildTouchpointSelectionForItem(
  blueprint: BlueprintData,
  cellId: string,
  techItem: string,
  scenarioName: string,
  phaseName?: string,
): BlueprintCellSelection | null {
  const cell = blueprint.cells.find(
    (entry) => entry.id === resolveBlueprintCellId(cellId),
  )
  if (!cell) return null

  const lane = blueprint.lanes.find((entry) => entry.id === cell.lane_id)
  const stepIndex = blueprint.steps.findIndex((entry) => entry.id === cell.step_id)
  const step = blueprint.steps[stepIndex]
  if (!lane || !step || stepIndex < 0) return null

  if (!getTouchpointItems(cell.content).includes(techItem)) return null

  return buildTouchpointSelection(
    {
      scenarioName,
      phaseName,
      laneName: lane.name,
      stepId: step.id,
      stepName: step.name,
      stepIndex,
      cellId: cell.id,
      cellContent: cell.content,
      cellFrame: cell.frame,
      cellSummary: cell.summary,
      cellTouchpoints: cellTouchpoints(cell),
      cellResources: cellResources(cell),
      pathId: blueprint.path.id,
      pathName: blueprint.path.name,
      pathSummary: blueprint.path.summary,
      pathKind: blueprint.path.kind,
    },
    techItem,
  )
}

export function scrollBlueprintTouchpointCellIntoView(
  cellId: string,
  techItem: string,
): void {
  const cellRoot = document.querySelector<HTMLElement>(
    `[data-blueprint-cell="${cellId}"]`,
  )
  const touchpoint =
    cellRoot?.querySelector<HTMLElement>(
      `[data-blueprint-touchpoint="${techItem}"]`,
    ) ??
    document.querySelector<HTMLElement>(
      `[data-blueprint-touchpoint="${techItem}"]`,
    )

  touchpoint?.scrollIntoView({
    behavior: 'smooth',
    block: 'nearest',
    inline: 'nearest',
  })
}
