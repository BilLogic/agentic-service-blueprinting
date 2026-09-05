import type { BlueprintStep } from '@/types/blueprint'
import type { PathKind } from '@/types/database'

/*
 * What survives of the integrated-grid vocabulary: the path-tagged shapes the
 * arrow overlay (`IntegratedDependencyArrows`) and its per-band mapper
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
  lane_id: string
  step_id: string
  path_id: string
  kind: PathKind
  content: string
  frame: string | null
  summary: string | null
  opacity: number
}

export type IntegratedBlueprintDependency = {
  id: string
  source_cell_id: string
  target_cell_id: string
  path_id: string
  kind: PathKind
  opacity: number
}
