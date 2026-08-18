import type { BlueprintStep, CellLink } from '@/types/blueprint'
import type { PathType } from '@/types/database'

/*
 * What survives of the integrated-grid vocabulary: the path-tagged shapes the
 * arrow overlay (`IntegratedTriggerArrows`) and its per-band mapper
 * (`getComparePathArrowData`) exchange. The merged grid itself — and the
 * `IntegratedBlueprintData` container, its opacity rules and the
 * `mergeIntegratedBlueprint` builder — retired with Compare v3's stacked
 * arrangement.
 */

export type IntegratedBlueprintStep = BlueprintStep & {
  pathStepIds: Record<string, string>
}

export type IntegratedBlueprintCell = {
  id: string
  layer_id: string
  step_id: string
  path_id: string
  path_type: PathType
  content: string
  picture: string | null
  description: string | null
  links: CellLink[]
  opacity: number
}

export type IntegratedBlueprintTrigger = {
  id: string
  source_cell_id: string
  target_cell_id: string
  path_id: string
  path_type: PathType
  opacity: number
}
