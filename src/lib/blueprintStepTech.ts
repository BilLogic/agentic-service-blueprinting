import {
  buildTechPillSelection,
  getTechPillItems,
} from '@/lib/blueprintCellSelection'
import { resolveBlueprintCellId } from '@/lib/resolveBlueprintCellId'
import { shouldUsePillCellContent } from '@/lib/blueprintLayout'
import type { BlueprintCellSelection } from '@/types/blueprintCellDetail'
import type { BlueprintData } from '@/types/blueprint'

export type BlueprintStepTechEntry = {
  id: string
  cellId: string
  item: string
  layerName: string
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

  const pillLayers = blueprint.layers
    .filter((layer) => shouldUsePillCellContent(layer))
    .sort((a, b) => a.row_position - b.row_position)

  const entries: BlueprintStepTechEntry[] = []

  for (const layer of pillLayers) {
    const cell = blueprint.cells.find(
      (entry) => entry.layer_id === layer.id && entry.step_id === stepId,
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
        layerName: layer.name,
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
): BlueprintCellSelection | null {
  const cell = blueprint.cells.find(
    (entry) => entry.id === resolveBlueprintCellId(cellId),
  )
  if (!cell) return null

  const layer = blueprint.layers.find((entry) => entry.id === cell.layer_id)
  const stepIndex = blueprint.steps.findIndex((entry) => entry.id === cell.step_id)
  const step = blueprint.steps[stepIndex]
  if (!layer || !step || stepIndex < 0) return null

  if (!getTechPillItems(cell.content).includes(techItem)) return null

  return buildTechPillSelection(
    {
      scenarioName,
      layerName: layer.name,
      stepId: step.id,
      stepName: step.name,
      stepIndex,
      cellId: cell.id,
      cellContent: cell.content,
      cellPicture: cell.picture,
      cellDescription: cell.description,
      cellLinks: cell.links,
      pathId: blueprint.path.id,
      pathName: blueprint.path.name,
      pathDescription: blueprint.path.description,
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
