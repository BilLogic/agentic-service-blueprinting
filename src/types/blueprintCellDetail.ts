import type { PathType } from '@/types/database'
import type { CellLink } from '@/types/blueprint'

export type BlueprintCellPathEntry = {
  cellId: string
  pathId: string
  pathName: string
  pathDescription?: string | null
  pathType: PathType
  content: string
  picture?: string | null
  description?: string | null
  links?: CellLink[]
}

export type BlueprintCellSelection = {
  scenarioName: string
  layerName: string
  stepId: string
  stepName: string
  stepIndex: number
  /** Set when a single tech pill is selected (Front Stage Tech, Back Stage Tech). */
  techItem?: string
  paths: BlueprintCellPathEntry[]
}
