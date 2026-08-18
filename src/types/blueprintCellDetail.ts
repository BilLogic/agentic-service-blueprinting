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

/**
 * Which sibling surface the floating panel is showing. `details` is the cell
 * detail view (selection or draft); `differences` is the compare ledger,
 * which needs no selection at all.
 *
 * Lives here rather than beside the provider so pure helpers can reason about
 * the panel without importing React — `detailClickCloses` in cellPickGrammar
 * is the reason it moved.
 */
export type BlueprintPanelSurface = 'details' | 'differences'

export type BlueprintCellSelection = {
  scenarioName: string
  /** Parent lifecycle phase label when known (e.g. Pre-Session). */
  phaseName?: string
  layerName: string
  stepId: string
  stepName: string
  stepIndex: number
  /** Set when a single tech pill is selected (Front Stage Tech, Back Stage Tech). */
  techItem?: string
  paths: BlueprintCellPathEntry[]
}
