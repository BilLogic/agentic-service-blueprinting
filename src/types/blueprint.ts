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
}

export type BlueprintCellTrigger = {
  id: string
  source_cell_id: string
  target_cell_id: string
}

export type BlueprintData = {
  path: BlueprintPath
  layers: BlueprintLayer[]
  steps: BlueprintStep[]
  cells: BlueprintCell[]
  triggers: BlueprintCellTrigger[]
}
