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
import type { BlueprintData } from '@/types/blueprint'

/**
 * Visual-row step pictures come from actor lanes: layers whose role is null,
 * org-defined, or customer_actions — i.e. everything except the canonical
 * stage/tech/visual rendering roles. Derived from `layer_role`, not layer
 * display names, so it works in any language.
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

function isActorLayer(layer: { name: string; role?: string | null }): boolean {
  const role = getLayerRole(layer)
  return role === null || !NON_ACTOR_ROLES.includes(role)
}

/**
 * True when an artwork batch bakes its own gray rounded frame into the PNG,
 * so the renderer scales it up slightly to hide the double frame. The template
 * ships no such batches; orgs can match their own picture path prefixes here.
 */
export function hasEmbeddedVisualFrame(_picture: string): boolean {
  return false
}

export type VisualStepPictureEntry = {
  layerName: string
  label: string
  picture: string
  description: string
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

  return blueprint.layers
    .filter((layer) => isActorLayer(layer))
    .flatMap((layer) => {
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
