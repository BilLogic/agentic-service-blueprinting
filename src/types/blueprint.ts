import type { TouchpointRoleValue } from '@/lib/touchpointRole'
import type { PathKind } from '@/types/database'

export type BlueprintPath = {
  id: string
  name: string
  summary: string | null
  note: string | null
  kind: PathKind
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
 * `summary` and `role` are THIS moment's own: the same tool
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
  /**
   * The registry entry this placement names, or null for a NAME-ONLY
   * placement — one whose touchpoint the registry lacks (#112). Drawn
   * dashed on the board, offered a "Link to registry" action in the panel.
   * Also null on a hand-written fixture, which has no registry at all.
   */
  touchpointId: string | null
  name: string
  /** The registry entry's kind, or null where there is no registry row to read. */
  kind: string | null
  /**
   * The registry entry's stock icon / logo URL, or absent where the registry
   * has none. A property of the touchpoint the service owns, authored once and
   * read off the row (#326) — never a tool name matched against a table baked
   * into the renderer. Optional so a fallback board, which has no registry,
   * simply omits it.
   */
  iconUrl?: string | null
  summary: string | null
  /**
   * Core or peripheral AT THIS MOMENT, or null for the unmarked majority.
   * Null is a state of its own, not a quiet `peripheral` — see
   * `src/lib/touchpointRole.ts`. What the placement points at is in the
   * cell's resources, carrying this placement's id (#111).
   */
  role: TouchpointRoleValue
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
export type ResourceKind = 'link' | 'attachment'

export type CellResource = {
  /**
   * The row's id, so a later write can name the row it means (#110). Null
   * on a fallback board, which has no rows to name.
   */
  id: string | null
  name: string
  /** `link` or `attachment` — what the row is, decided when it is made. */
  kind: ResourceKind
  /** The table refuses a row without one; null only on a fallback board. */
  url: string | null
  /**
   * The placement this resource belongs to, when it is a placement's — a
   * link or the image a touchpoint shows here. Still the cell's row, so it
   * renders in the cell's list; edited from the touchpoint.
   */
  placementId: string | null
  /** The resource its owner leads with. */
  featured: boolean
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
  frame: string | null
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
  /** leads_to = makes the target happen, drawn (default); enables = makes it possible, panel only. */
  kind?: 'leads_to' | 'enables'
  /** What this edge is called, e.g. a channel tag like "Email". */
  name?: string | null
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
