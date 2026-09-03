import type { PathKind } from '@/types/database'
import type { CellResource, CellTouchpoint } from '@/types/blueprint'

export type BlueprintCellPathEntry = {
  cellId: string
  pathId: string
  pathName: string
  pathSummary?: string | null
  pathKind: PathKind
  content: string
  frame?: string | null
  summary?: string | null
  touchpoints?: CellTouchpoint[]
  resources?: CellResource[]
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
  /** Parent service phase label when known (e.g. Pre-Session). */
  phaseName?: string
  laneName: string
  stepId: string
  stepName: string
  stepIndex: number
  /** Set when a single touchpoint is selected on a touchpoint lane. */
  techItem?: string
  paths: BlueprintCellPathEntry[]
}
