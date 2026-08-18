import { getLayerRole, VISUAL_ROLE, STEP_VISUAL_ROLE } from '@/lib/layerRoles'
import { buildCellLookup, getCellAt } from '@/lib/normalizeBlueprint'
import { isBlueprintStepVisualPlaceholder } from '@/lib/blueprintVisualPlaceholder'
import { pickPreferredPath } from '@/lib/pathSelection'
import type { BlueprintData } from '@/types/blueprint'
import type { PathType } from '@/types/database'

/**
 * The lanes a walkthrough steps through, named by the blueprint rather than
 * by this module: an adopter's actor lanes carry their own names, so the
 * roster is discovered from the data (see `getVisualWalkthroughLayerNames`)
 * and this constant stays empty as the pinned-order override.
 *
 * A fork that wants a fixed lane order for its walkthrough lists its lane
 * names here; anything listed wins, anything else follows board order.
 */
export const VISUAL_WALKTHROUGH_LAYER_NAMES: readonly string[] = []

/** Short lane labels for the walkthrough chrome; defaults to the lane name. */
export const VISUAL_LAYER_SHORT_LABELS: Record<string, string> = {}

/**
 * Whether a step picture already carries its own frame, so the walkthrough
 * should not draw one around it. No path convention in the template: an
 * adopter whose artwork bakes in a frame keys it off their own asset paths.
 */
export function hasEmbeddedVisualFrame(_picture: string): boolean {
  return false
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
  scenarioName?: string
  phaseName?: string
  steps: VisualWalkthroughStep[]
}

export type VisualWalkthroughContextMeta = {
  scenarioName?: string
  phaseName?: string
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
  const preferredPath = pickPreferredPath(
    blueprints.map((blueprint) => blueprint.path),
  )
  return (
    blueprints.find((blueprint) => blueprint.path.id === preferredPath?.id) ??
    blueprints[0]
  )
}

type VisualPictureBlueprint = Pick<BlueprintData, 'layers' | 'cells'>

/**
 * The lanes a walkthrough steps through, in board order: every lane that is
 * NOT one of the visual rows — those hold the artwork the walkthrough shows,
 * so stepping through them would show each picture next to itself.
 *
 * `VISUAL_WALKTHROUGH_LAYER_NAMES` overrides this when a fork pins its own
 * roster; empty (the template default) means "whatever the board has", which
 * is the only rule that survives an adopter naming their lanes themselves.
 */
function getWalkthroughLayerNames(
  blueprint: VisualPictureBlueprint,
): string[] {
  if (VISUAL_WALKTHROUGH_LAYER_NAMES.length > 0) {
    return [...VISUAL_WALKTHROUGH_LAYER_NAMES]
  }

  return blueprint.layers
    .filter((layer) => {
      const role = getLayerRole(layer)
      return role !== VISUAL_ROLE && role !== STEP_VISUAL_ROLE
    })
    .map((layer) => layer.name)
}

function resolveCellDescription(cell: BlueprintData['cells'][number] | undefined): string {
  return cell?.description?.trim() || cell?.content.trim() || ''
}

export function resolveVisualStepPictureEntries(
  blueprint: VisualPictureBlueprint,
  stepId: string,
): VisualStepPictureEntry[] {
  const cellLookup = buildCellLookup(blueprint.cells)
  const layerByName = new Map(blueprint.layers.map((layer) => [layer.name, layer]))

  return getWalkthroughLayerNames(blueprint).flatMap((name) => {
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

/** True when any walkthrough lane has a cell in this step. */
export function stepHasVisualWalkthroughLayerCells(
  blueprint: VisualPictureBlueprint,
  stepId: string,
): boolean {
  const cellLookup = buildCellLookup(blueprint.cells)
  const layerByName = new Map(blueprint.layers.map((layer) => [layer.name, layer]))

  return getWalkthroughLayerNames(blueprint).some((name) => {
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
  meta?: VisualWalkthroughContextMeta,
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
    scenarioName: meta?.scenarioName?.trim() || undefined,
    phaseName: meta?.phaseName?.trim() || undefined,
    steps,
  }
}
