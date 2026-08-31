import {
  buildTechPillSelection,
  getTechPillItems,
} from '@/lib/blueprintCellSelection'
import { resolveBlueprintCellId } from '@/lib/resolveBlueprintCellId'
import { shouldUsePillCellContent } from '@/lib/blueprintLayout'
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

  const pillLanes = blueprint.lanes
    .filter((lane) => shouldUsePillCellContent(lane))
    .sort((a, b) => a.position - b.position)

  const entries: BlueprintStepTechEntry[] = []

  for (const lane of pillLanes) {
    const cell = blueprint.cells.find(
      (entry) => entry.lane_id === lane.id && entry.step_id === stepId,
    )
    if (!cell) continue

    for (const item of getTechPillItems(cell.content)) {
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

export function buildTechPillSelectionForItem(
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

  if (!getTechPillItems(cell.content).includes(techItem)) return null

  return buildTechPillSelection(
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
      pathType: blueprint.path.path_type,
    },
    techItem,
  )
}

export function scrollBlueprintTechPillIntoView(
  cellId: string,
  techItem: string,
): void {
  const cellRoot = document.querySelector<HTMLElement>(
    `[data-blueprint-cell="${cellId}"]`,
  )
  const pill =
    cellRoot?.querySelector<HTMLElement>(
      `[data-blueprint-tech-pill="${techItem}"]`,
    ) ??
    document.querySelector<HTMLElement>(
      `[data-blueprint-tech-pill="${techItem}"]`,
    )

  pill?.scrollIntoView({
    behavior: 'smooth',
    block: 'nearest',
    inline: 'nearest',
  })
}
