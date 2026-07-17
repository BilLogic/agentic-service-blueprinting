import type { BlueprintData } from '@/types/blueprint'
import {
  getIntegratedCellDisplayOpacity,
  INTEGRATED_UNSELECTED_OPACITY,
  type IntegratedBlueprintCell,
  type IntegratedBlueprintData,
  type IntegratedBlueprintStep,
  type IntegratedBlueprintTrigger,
} from '@/types/integratedBlueprint'

function pathOpacity(pathId: string, selectedPathIds: string[]): number {
  if (selectedPathIds.length === 0) {
    return INTEGRATED_UNSELECTED_OPACITY
  }
  return selectedPathIds.includes(pathId)
    ? 1
    : INTEGRATED_UNSELECTED_OPACITY
}

function pickPrimaryBlueprint(blueprints: BlueprintData[]): BlueprintData {
  return (
    blueprints.find((blueprint) => blueprint.path.path_type === 'happy') ??
    blueprints[0]
  )
}

function mergeSteps(
  blueprints: BlueprintData[],
  primary: BlueprintData,
): IntegratedBlueprintStep[] {
  const integratedSteps: IntegratedBlueprintStep[] = []
  const integratedStepById = new Map<string, IntegratedBlueprintStep>()

  const appendSteps = (blueprint: BlueprintData) => {
    for (const step of [...blueprint.steps].sort(
      (a, b) => a.column_position - b.column_position,
    )) {
      const existing = integratedStepById.get(step.id)
      if (existing) {
        existing.pathStepIds[blueprint.path.id] = step.id
        continue
      }

      const integrated: IntegratedBlueprintStep = {
        id: step.id,
        name: step.name,
        column_position: integratedSteps.length + 1,
        pathStepIds: { [blueprint.path.id]: step.id },
      }
      integratedStepById.set(step.id, integrated)
      integratedSteps.push(integrated)
    }
  }

  appendSteps(primary)
  for (const blueprint of blueprints) {
    if (blueprint.path.id === primary.path.id) continue
    appendSteps(blueprint)
  }

  integratedSteps.forEach((step, index) => {
    step.column_position = index + 1
  })

  return integratedSteps
}

export function mergeIntegratedBlueprint(
  blueprints: BlueprintData[],
  selectedPathIds: string[],
): IntegratedBlueprintData | null {
  if (blueprints.length === 0) return null

  const primary = pickPrimaryBlueprint(blueprints)
  const layers = [...primary.layers].sort(
    (a, b) => a.row_position - b.row_position,
  )
  const layerNameToId = new Map(layers.map((layer) => [layer.name, layer.id]))
  const steps = mergeSteps(blueprints, primary)

  const integratedStepIds = new Set(steps.map((step) => step.id))
  const integratedStepById = new Map(steps.map((step) => [step.id, step]))
  const cells: IntegratedBlueprintCell[] = []
  const cellIdByPathCell = new Map<string, string>()

  for (const blueprint of blueprints) {
    for (const cell of blueprint.cells) {
      const layer = blueprint.layers.find((entry) => entry.id === cell.layer_id)
      const resolvedStepId = cell.step_id
      const step =
        blueprint.steps.find((entry) => entry.id === resolvedStepId) ??
        (integratedStepIds.has(resolvedStepId)
          ? integratedStepById.get(resolvedStepId)
          : undefined)
      if (!layer || !step) continue

      const integratedLayerId = layerNameToId.get(layer.name)
      if (!integratedLayerId || !integratedStepIds.has(step.id)) continue

      const integratedStep = integratedStepById.get(step.id)
      if (!integratedStep) continue

      const integratedCellId = `integrated-cell-${blueprint.path.id}-${cell.id}`
      cellIdByPathCell.set(`${blueprint.path.id}:${cell.id}`, integratedCellId)

      const mergedCell: IntegratedBlueprintCell = {
        id: integratedCellId,
        layer_id: integratedLayerId,
        step_id: step.id,
        path_id: blueprint.path.id,
        path_type: blueprint.path.path_type,
        content: cell.content,
        picture: cell.picture,
        description: cell.description,
        links: cell.links,
        opacity: pathOpacity(blueprint.path.id, selectedPathIds),
      }

      cells.push({
        ...mergedCell,
        opacity: getIntegratedCellDisplayOpacity(mergedCell, integratedStep),
      })
    }
  }

  const triggers: IntegratedBlueprintTrigger[] = []
  for (const blueprint of blueprints) {
    for (const trigger of blueprint.triggers) {
      const sourceCellId = cellIdByPathCell.get(
        `${blueprint.path.id}:${trigger.source_cell_id}`,
      )
      const targetCellId = cellIdByPathCell.get(
        `${blueprint.path.id}:${trigger.target_cell_id}`,
      )
      if (!sourceCellId || !targetCellId) continue

      triggers.push({
        id: `integrated-trigger-${blueprint.path.id}-${trigger.id}`,
        source_cell_id: sourceCellId,
        target_cell_id: targetCellId,
        path_id: blueprint.path.id,
        path_type: blueprint.path.path_type,
        opacity: pathOpacity(blueprint.path.id, selectedPathIds),
      })
    }
  }

  return {
    paths: blueprints.map((blueprint) => ({
      id: blueprint.path.id,
      name: blueprint.path.name,
      description: blueprint.path.description,
      note: blueprint.path.note,
      path_type: blueprint.path.path_type,
    })),
    layers,
    steps,
    cells,
    triggers,
  }
}

/** Per-path blueprint slices for shared compare row-height math on integrated grids. */
export function deriveSourceBlueprintsFromIntegrated(
  data: IntegratedBlueprintData,
): BlueprintData[] {
  return data.paths.map((path) => ({
    path: {
      id: path.id,
      name: path.name,
      description: path.description,
      note: path.note,
      path_type: path.path_type,
    },
    layers: data.layers,
    steps: data.steps
      .filter((step) => path.id in step.pathStepIds)
      .sort((a, b) => a.column_position - b.column_position)
      .map((step) => ({
        id: step.id,
        name: step.name,
        column_position: step.column_position,
      })),
    cells: data.cells
      .filter((cell) => cell.path_id === path.id)
      .map((cell) => ({
        id: cell.id,
        layer_id: cell.layer_id,
        step_id: cell.step_id,
        content: cell.content,
        picture: cell.picture,
        description: cell.description,
        links: cell.links,
      })),
    triggers: [],
  }))
}

/** Layout adapter for shared blueprint sizing helpers. */
export function integratedBlueprintToLayoutData(
  data: IntegratedBlueprintData,
): BlueprintData {
  return {
    path: {
      id: 'integrated',
      name: 'Integrated',
      description: null,
      note: null,
      path_type: 'happy',
    },
    layers: data.layers,
    steps: data.steps.map((step) => ({
      id: step.id,
      name: step.name,
      column_position: step.column_position,
    })),
    cells: data.cells.map((cell) => ({
      id: cell.id,
      layer_id: cell.layer_id,
      step_id: cell.step_id,
      content: cell.content,
      picture: cell.picture,
      description: cell.description,
      links: cell.links,
    })),
    triggers: data.triggers.map((trigger) => ({
      id: trigger.id,
      source_cell_id: trigger.source_cell_id,
      target_cell_id: trigger.target_cell_id,
    })),
  }
}
