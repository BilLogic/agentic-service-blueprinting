import { isBlueprintStoryboardLaneEnabled } from '@/lib/blueprintDisplayFlags'
import { shouldUseStoryboardContent } from '@/lib/blueprintLayout'
import type { BlueprintData } from '@/types/blueprint'

function filterHiddenStoryboardLanes(
  data: BlueprintData,
  scenarioId?: string,
): BlueprintData {
  if (isBlueprintStoryboardLaneEnabled(scenarioId)) {
    return data
  }

  const hiddenLaneIds = new Set(
    data.lanes
      .filter((lane) => shouldUseStoryboardContent(lane))
      .map((lane) => lane.id),
  )

  if (hiddenLaneIds.size === 0) {
    return data
  }

  const cells = data.cells.filter((cell) => !hiddenLaneIds.has(cell.lane_id))
  const hiddenCellIds = new Set(
    data.cells
      .filter((cell) => hiddenLaneIds.has(cell.lane_id))
      .map((cell) => cell.id),
  )
  const dependencies = data.dependencies.filter(
    (dependency) =>
      !hiddenCellIds.has(dependency.source_cell_id) &&
      !hiddenCellIds.has(dependency.target_cell_id),
  )

  return {
    ...data,
    lanes: data.lanes.filter((lane) => !hiddenLaneIds.has(lane.id)),
    cells,
    dependencies,
  }
}

export function applyBlueprintDisplayFilters(
  data: BlueprintData,
  scenarioId?: string,
  _pathId?: string,
): BlueprintData {
  return filterHiddenStoryboardLanes(data, scenarioId)
}
