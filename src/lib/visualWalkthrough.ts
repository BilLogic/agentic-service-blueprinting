import { buildCellLookup, getCellAt } from '@/lib/normalizeBlueprint'
import { isBlueprintStepVisualPlaceholder } from '@/lib/blueprintVisualPlaceholder'
import {
  BACKSTAGE_ACTIONS_ROLE,
  BACKSTAGE_TECH_ROLE,
  FRONTSTAGE_ACTIONS_ROLE,
  FRONTSTAGE_TECH_ROLE,
  getLayerRole,
  STEP_VISUAL_ROLE,
  SUPPORT_SYSTEMS_ROLE,
  VISUAL_ROLE,
} from '@/lib/layerRoles'
import type { BlueprintData, BlueprintLayer } from '@/types/blueprint'
import type { PathType } from '@/types/database'

/**
 * Visual walkthrough / presentation mode (play button + modal).
 * Iteration flag — flip when the walkthrough is ready to ship.
 */
export const BLUEPRINT_VISUAL_WALKTHROUGH_ENABLED = false

export function isBlueprintVisualWalkthroughEnabled(): boolean {
  return BLUEPRINT_VISUAL_WALKTHROUGH_ENABLED
}

/**
 * Walkthrough (and Visual-row) pictures come from actor lanes: layers whose
 * role is null, org-defined, or customer_actions — i.e. everything except the
 * canonical stage/tech/visual rendering roles. Derived from `layer_role`, not
 * layer display names, so it works in any language.
 */
const NON_ACTOR_ROLES: readonly string[] = [
  FRONTSTAGE_ACTIONS_ROLE,
  BACKSTAGE_ACTIONS_ROLE,
  FRONTSTAGE_TECH_ROLE,
  BACKSTAGE_TECH_ROLE,
  SUPPORT_SYSTEMS_ROLE,
  VISUAL_ROLE,
  STEP_VISUAL_ROLE,
]

export function isWalkthroughActorLayer(layer: {
  name: string
  role?: string | null
}): boolean {
  const role = getLayerRole(layer)
  return role === null || !NON_ACTOR_ROLES.includes(role)
}

function getActorLayers(layers: readonly BlueprintLayer[]): BlueprintLayer[] {
  return layers.filter((layer) => isWalkthroughActorLayer(layer))
}

/**
 * True when an artwork batch bakes its own gray rounded frame into the PNG,
 * so the renderer scales it up slightly to hide the double frame. The template
 * ships no such batches; orgs can match their own picture path prefixes here.
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

  return getActorLayers(blueprint.layers).flatMap((layer) => {
    const cell = getCellAt(cellLookup, layer.id, stepId)
    if (!cell?.content.trim()) return []
    const picture = cell.picture?.trim()
    if (!picture || isBlueprintStepVisualPlaceholder(picture)) return []
    return [
      {
        layerName: layer.name,
        label: layer.name,
        picture,
        description: resolveCellDescription(cell),
      },
    ]
  })
}

/** True when any actor lane has a cell in this step. */
export function stepHasVisualWalkthroughLayerCells(
  blueprint: VisualPictureBlueprint,
  stepId: string,
): boolean {
  const cellLookup = buildCellLookup(blueprint.cells)

  return getActorLayers(blueprint.layers).some((layer) => {
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
