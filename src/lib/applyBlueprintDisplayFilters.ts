import { isBlueprintVisualLayerEnabled } from '@/lib/blueprintDisplayFlags'
import { shouldUseVisualContent } from '@/lib/blueprintLayout'
import type { BlueprintData } from '@/types/blueprint'

function filterHiddenVisualLayers(
  data: BlueprintData,
  scenarioId?: string,
): BlueprintData {
  if (isBlueprintVisualLayerEnabled(scenarioId)) {
    return data
  }

  const hiddenLayerIds = new Set(
    data.layers
      .filter((layer) => shouldUseVisualContent(layer))
      .map((layer) => layer.id),
  )

  if (hiddenLayerIds.size === 0) {
    return data
  }

  const cells = data.cells.filter((cell) => !hiddenLayerIds.has(cell.layer_id))
  const hiddenCellIds = new Set(
    data.cells
      .filter((cell) => hiddenLayerIds.has(cell.layer_id))
      .map((cell) => cell.id),
  )
  const triggers = data.triggers.filter(
    (trigger) =>
      !hiddenCellIds.has(trigger.source_cell_id) &&
      !hiddenCellIds.has(trigger.target_cell_id),
  )

  return {
    ...data,
    layers: data.layers.filter((layer) => !hiddenLayerIds.has(layer.id)),
    cells,
    triggers,
  }
}

export function applyBlueprintDisplayFilters(
  data: BlueprintData,
  scenarioId?: string,
  _pathId?: string,
): BlueprintData {
  return filterHiddenVisualLayers(data, scenarioId)
}
