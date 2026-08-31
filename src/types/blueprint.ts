import type { PathType } from '@/types/database'

export type BlueprintPath = {
  id: string
  name: string
  summary: string | null
  note: string | null
  path_type: PathType
}

export type BlueprintLane = {
  id: string
  /** Display label — free-form, any language. */
  name: string
  /** Semantic role key (`lanes.lane_role`); null/absent = generic swimlane. */
  role?: string | null
  position: number
  /**
   * Lane spec (`lanes.kpis` / `lanes.tools`), carried so a no-DB build
   * serves what a database read serves. Optional: most lanes set neither.
   */
  kpis?: string[]
  tools?: string[]
}

export type BlueprintStep = {
  id: string
  name: string
  position: number
}

/**
 * One touchpoint, used at one cell.
 *
 * `summary`, `screenshots` and `url` are THIS moment's own: the same tool
 * describes a different screen and points at a different design file at a
 * different step, which is the distinction a label-keyed link entry could not
 * hold. Built by `cellTouchpoints.ts` from either source.
 */
export type CellTouchpoint = {
  /**
   * The `cell_touchpoints` row this came from, and the only handle an editor
   * may write through — a placement is identified by its id, never by the
   * name it currently shows.
   *
   * Null on a board that has no rows behind it: the template's own sample
   * fixture writes null, while a fallback generated from an IR carries the
   * UUIDv5 the import would mint for that row, which is the id it has once
   * imported.
   */
  id: string | null
  name: string
  summary: string | null
  /** Screenshots or illustrations for this moment, in author order. */
  screenshots: string[]
  /** The design file for THIS moment, not for the tool. */
  url: string | null
}

/**
 * One thing a cell — or one touchpoint placement — points at.
 *
 * A link is one kind of resource, which is why `kind` carries the subtype and
 * the type is named for the parent. `name` is what the thing on the other end
 * is called; this vocabulary reserves `title` for authored content a reader
 * reads and gives a NAME to a thing a reader navigates to.
 *
 * Built by `cellResources.ts` from either source: `resources` rows from the
 * database, or the `url`-typed entries of a fallback blueprint's `links`.
 */
export type ResourceKind = 'link' | 'other'

export type CellResource = {
  name: string
  /** `link` for everything the split carried across; the column allows `other`. */
  kind: ResourceKind
  /** Null only for a kind that is not a link — the table refuses a link without one. */
  url: string | null
}

export type BlueprintCell = {
  id: string
  /**
   * The authored qualified key (`cells.cell_key`) — service/phase/scenario/
   * path/lane/step. The same string the cell's UUIDv5 is derived from, so a
   * no-DB build can answer "which authored cell is this?" without a database.
   */
  cell_key?: string
  lane_id: string
  step_id: string
  /** Cell Label — primary text shown in the blueprint grid. */
  content: string
  picture: string | null
  summary: string | null
  /**
   * Touchpoints placed at this cell.
   *
   * Optional because the hand-written test fixtures do not write it and both
   * generators and the normalizer always do — read it through
   * `cellTouchpoints(cell)` rather than directly.
   */
  touchpoints?: CellTouchpoint[]
  /**
   * What this cell points at. Optional for the same reason; ask
   * `cellResources(cell)`.
   */
  resources?: CellResource[]
  /**
   * Order within a slot (one lane, one step). Tech lanes hold one cell per
   * touchpoint; everything else holds a single cell at 0. Optional because
   * rows predating the split never carry it — absent reads as 0.
   */
  position?: number
  /**
   * Cell spec (`cells.owner` … `cells.value_props`), carried so the no-DB
   * fallback can serve the cell panel's spec sections the same way a database
   * read does. Optional on every cell: most cells set none of them, and rows
   * predating the columns carry none.
   */
  owner?: string | null
  /** Who the person on the other side believes owns this moment. */
  perceived_owner?: string | null
  /** Role / responsibility / requirements of this moment. */
  function?: string | null
  /** Communication, look, feel, sound of this moment. */
  form?: string | null
  /** Value delivered, as `{ for, value }` pairs. */
  value_props?: { for: string; value: string }[]
}

export type BlueprintCellTrigger = {
  id: string
  source_cell_id: string
  target_cell_id: string
  /** trigger = temporal "sets off" (default); needs = functional dependency. */
  kind?: 'leads_to' | 'enables'
  /** Short edge label, e.g. a channel tag like "Email". */
  label?: string | null
  /** Why-line shown in the cell panel dependencies tab. */
  note?: string | null
}

export type BlueprintData = {
  path: BlueprintPath
  lanes: BlueprintLane[]
  steps: BlueprintStep[]
  cells: BlueprintCell[]
  triggers: BlueprintCellTrigger[]
}
