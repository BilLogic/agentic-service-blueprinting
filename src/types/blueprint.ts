import type { PathType } from '@/types/database'

export type BlueprintPath = {
  id: string
  name: string
  description: string | null
  note: string | null
  path_type: PathType
}

export type BlueprintLayer = {
  id: string
  /** Display label — free-form, any language. */
  name: string
  /** Semantic role key (`layers.layer_role`); null/absent = generic swimlane. */
  role?: string | null
  row_position: number
}

export type BlueprintStep = {
  id: string
  name: string
  column_position: number
}

/** Structured link on a cell (stored as JSONB; type is usually "url"). */
export type CellLink = {
  type: string
  label: string
  url?: string
  /** Long-form copy for `tech_description` links keyed by tech pill label. */
  description?: string
  /** Screenshot or illustration for `tech_description` links keyed by tech pill label. */
  picture?: string
  /** Multiple images for a tech pill (e.g. logo + screenshot). Takes precedence over `picture`. */
  pictures?: string[]
}

export type BlueprintCell = {
  id: string
  layer_id: string
  step_id: string
  /** Cell Label — primary text shown in the blueprint grid. */
  content: string
  picture: string | null
  description: string | null
  links: CellLink[]
  /**
   * Order within a slot (one lane, one step). Tech lanes hold one cell per
   * touchpoint; everything else holds a single cell at 0. Optional because
   * rows predating the split never carry it — absent reads as 0.
   */
  slot_position?: number
}

export type BlueprintCellTrigger = {
  id: string
  source_cell_id: string
  target_cell_id: string
  /** trigger = temporal "sets off" (default); needs = functional dependency. */
  kind?: 'trigger' | 'needs'
  /** Short edge label, e.g. a channel tag like "Email". */
  label?: string | null
  /** Why-line shown in the cell panel dependencies tab. */
  note?: string | null
}

export type BlueprintData = {
  path: BlueprintPath
  layers: BlueprintLayer[]
  steps: BlueprintStep[]
  cells: BlueprintCell[]
  triggers: BlueprintCellTrigger[]
}
