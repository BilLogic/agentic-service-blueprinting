import {
  APPLICATION_SAD_PATH_FALLBACK,
  APPLICATION_SAD_PATH_ID,
  DISCOVERY_HAPPY_FINAL_STEP_ID,
  DISCOVERY_SAD_FINAL_STEP_ID,
} from '@/data/applicationHappyPathFallback'
import type { BlueprintData } from '@/types/blueprint'

/** Sad-path outcome must use its own step column so integrated view does not stack over happy. */
export function repairDiscoverySadPathBlueprint(
  data: BlueprintData,
  fallback: BlueprintData = APPLICATION_SAD_PATH_FALLBACK,
): BlueprintData {
  if (data.path.id !== APPLICATION_SAD_PATH_ID) {
    return data
  }

  const sadFinalStep = fallback.steps.find(
    (step) => step.id === DISCOVERY_SAD_FINAL_STEP_ID,
  )
  if (!sadFinalStep) {
    return data
  }

  const usesHappyFinalStep = data.steps.some(
    (step) => step.id === DISCOVERY_HAPPY_FINAL_STEP_ID,
  )
  const hasSadFinalStep = data.steps.some(
    (step) => step.id === DISCOVERY_SAD_FINAL_STEP_ID,
  )
  const cellsOnHappyFinal = data.cells.some(
    (cell) => cell.step_id === DISCOVERY_HAPPY_FINAL_STEP_ID,
  )

  if (!usesHappyFinalStep && hasSadFinalStep && !cellsOnHappyFinal) {
    return data
  }

  const steps = [
    ...data.steps.filter((step) => step.id !== DISCOVERY_HAPPY_FINAL_STEP_ID),
    ...(hasSadFinalStep
      ? data.steps.filter((step) => step.id === DISCOVERY_SAD_FINAL_STEP_ID)
      : [sadFinalStep]),
  ].sort((a, b) => a.column_position - b.column_position)

  const cells = data.cells.map((cell) =>
    cell.step_id === DISCOVERY_HAPPY_FINAL_STEP_ID
      ? { ...cell, step_id: DISCOVERY_SAD_FINAL_STEP_ID }
      : cell,
  )

  const cellIds = new Set(cells.map((cell) => cell.id))
  for (const fallbackCell of fallback.cells) {
    if (
      fallbackCell.step_id === DISCOVERY_SAD_FINAL_STEP_ID &&
      !cellIds.has(fallbackCell.id)
    ) {
      cells.push(fallbackCell)
      cellIds.add(fallbackCell.id)
    }
  }

  const triggerKeys = new Set(
    data.triggers.map(
      (trigger) => `${trigger.source_cell_id}:${trigger.target_cell_id}`,
    ),
  )
  const triggers = [...data.triggers]
  for (const fallbackTrigger of fallback.triggers) {
    const key = `${fallbackTrigger.source_cell_id}:${fallbackTrigger.target_cell_id}`
    if (!triggerKeys.has(key)) {
      triggers.push(fallbackTrigger)
      triggerKeys.add(key)
    }
  }

  return { ...data, steps, cells, triggers }
}

export function remapDiscoverySadFinalStepId(stepId: string, pathId: string): string {
  if (
    pathId === APPLICATION_SAD_PATH_ID &&
    stepId === DISCOVERY_HAPPY_FINAL_STEP_ID
  ) {
    return DISCOVERY_SAD_FINAL_STEP_ID
  }
  return stepId
}
