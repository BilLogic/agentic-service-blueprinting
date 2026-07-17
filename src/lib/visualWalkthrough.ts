import { buildCellLookup, getCellAt } from '@/lib/normalizeBlueprint'
import { isBlueprintStepVisualPlaceholder } from '@/lib/blueprintVisualPlaceholder'
import type { BlueprintData } from '@/types/blueprint'
import type { PathType } from '@/types/database'

export const VISUAL_WALKTHROUGH_LAYER_NAMES = [
  'Partner Action: Teacher',
  'Lead Tutor',
  'Regular Tutor',
] as const

export const VISUAL_LAYER_SHORT_LABELS: Record<string, string> = {
  'Partner Action: Teacher': 'Partner',
  'Lead Tutor': 'Lead Tutor',
  'Regular Tutor': 'Regular Tutor',
}

export type VisualWalkthroughLayerEntry = {
  layerName: string
  content: string
  picture: string
}

export type VisualStepPictureEntry = {
  layerName: string
  label: string
  picture: string
  description: string
}

export type VisualWalkthroughStep = {
  stepIndex: number
  stepName: string
  layerEntries: VisualWalkthroughLayerEntry[]
  pictures: string[]
}

export type VisualWalkthroughSession = {
  pathId: string
  pathName: string
  pathDescription: string | null
  pathType: PathType
  steps: VisualWalkthroughStep[]
}

export function filterWalkthroughBlueprints(
  blueprints: BlueprintData[],
): BlueprintData[] {
  return blueprints.filter(
    (blueprint) => buildVisualWalkthroughSession(blueprint).steps.length > 0,
  )
}

export function pickWalkthroughBlueprint(
  blueprints: BlueprintData[],
): BlueprintData | null {
  if (blueprints.length === 0) return null
  return (
    blueprints.find((blueprint) => blueprint.path.path_type === 'happy') ??
    blueprints[0]
  )
}

type VisualPictureBlueprint = Pick<BlueprintData, 'layers' | 'cells'>

function resolveCellDescription(cell: BlueprintData['cells'][number] | undefined): string {
  return cell?.description?.trim() || cell?.content.trim() || ''
}

export function resolveVisualStepPictureEntries(
  blueprint: VisualPictureBlueprint,
  stepId: string,
): VisualStepPictureEntry[] {
  const cellLookup = buildCellLookup(blueprint.cells)
  const layerByName = new Map(blueprint.layers.map((layer) => [layer.name, layer]))

  return VISUAL_WALKTHROUGH_LAYER_NAMES.flatMap((name) => {
    const layer = layerByName.get(name)
    if (!layer) return []
    const cell = getCellAt(cellLookup, layer.id, stepId)
    if (!cell?.content.trim()) return []
    const picture = cell.picture?.trim()
    if (!picture || isBlueprintStepVisualPlaceholder(picture)) return []
    return [
      {
        layerName: name,
        label: VISUAL_LAYER_SHORT_LABELS[name] ?? name,
        picture,
        description: resolveCellDescription(cell),
      },
    ]
  })
}

/** True when Partner, Lead Tutor, or Regular Tutor has a cell in this step. */
export function stepHasVisualWalkthroughLayerCells(
  blueprint: VisualPictureBlueprint,
  stepId: string,
): boolean {
  const cellLookup = buildCellLookup(blueprint.cells)
  const layerByName = new Map(blueprint.layers.map((layer) => [layer.name, layer]))

  return VISUAL_WALKTHROUGH_LAYER_NAMES.some((name) => {
    const layer = layerByName.get(name)
    if (!layer) return false
    const cell = getCellAt(cellLookup, layer.id, stepId)
    return Boolean(cell?.content.trim())
  })
}

export function resolveVisualStepPictures(
  blueprint: VisualPictureBlueprint,
  stepId: string,
): string[] {
  return resolveVisualStepPictureEntries(blueprint, stepId).map(
    (entry) => entry.picture,
  )
}

export function buildVisualWalkthroughSession(
  blueprint: BlueprintData,
): VisualWalkthroughSession {
  const steps = [...blueprint.steps]
    .sort((a, b) => a.column_position - b.column_position)
    .map((step, stepIndex) => {
      const pictureEntries = resolveVisualStepPictureEntries(blueprint, step.id)
      return {
        stepIndex,
        stepName: step.name,
        layerEntries: pictureEntries.map((entry) => ({
          layerName: entry.layerName,
          content: entry.description,
          picture: entry.picture,
        })),
        pictures: pictureEntries.map((entry) => entry.picture),
      }
    })
  return {
    pathId: blueprint.path.id,
    pathName: blueprint.path.name,
    pathDescription: blueprint.path.description,
    pathType: blueprint.path.path_type,
    steps,
  }
}
