import { asEntityStatus } from '@/lib/entityStatus'
import type { BlueprintCell } from '@/types/blueprint'
import type { Database } from '@/types/database'

/**
 * The Cell field list: one descriptor per column the board reads for a cell.
 *
 * A cell's columns were named in five places that had to agree by hand — the
 * board select, the normalizer's raw shape, the normalizer's mapping, the
 * panel's fields and the agent's arguments — and the first three were held
 * together by a test that compared the select STRING to the normalizer
 * SOURCE, because a type could not see that a column named in one was
 * dropped from the other. This list is the one place; the select and the
 * normalizer are functions of it, so a column added here is selected and
 * mapped in the same edit, and a column left out is left out of both.
 *
 * The keys are typed against the generated cell row, so a descriptor for a
 * column the schema does not have is a type error, and against the
 * normalized cell, so every field the list names has somewhere to land.
 *
 * What is derived from the list today: the cells block of the board select
 * and the normalized cell. The panel's fields, the read-only rows, the
 * agent's argument schema and the one save are the next derivations; each
 * moves on its own, which is why the descriptors already carry the label,
 * the hint, the write route, the agent argument name and the budget those
 * derivations will read. Nothing reads them yet except a person.
 */

export type CellRow = Database['public']['Tables']['cells']['Row']

/** A column the board reads for a cell: on the generated row AND on the normalized cell. */
export type CellFieldKey = keyof CellRow & keyof BlueprintCell

/**
 * Where a field sits in the cell's anatomy. Structure is where the cell is —
 * its lane, step and place in the slot — and moves only through an
 * authoring RPC. Content is what the cell says and who it belongs to. Spec
 * is what the cell is like. The glossary's Spec entry is the source for the
 * last two; structure is the word it uses for the first.
 */
export type CellFieldGroup = 'structure' | 'content' | 'spec'

/**
 * The write path a field takes. `rpc` is an authoring RPC (structure moves
 * that way, and so does the frame, through `set_cell_featured_image`);
 * `content` and `spec` are the two direct-write mutations, each over its
 * own column grants and each capturing its own inverse for the ledger. The
 * route is the mutation, not the grant statement: `owner` and
 * `perceived_owner` were granted alongside the spec columns and are written
 * by the content mutation, because to a person they are what the cell says
 * about itself. `null` is a field nothing writes after the row exists.
 */
export type CellWriteRoute = 'rpc' | 'content' | 'spec' | null

export type CellFieldDescriptor<K extends CellFieldKey = CellFieldKey> = {
  /** The column, spelled as the schema spells it. */
  key: K
  /** The word a person sees above the field. */
  label: string
  /** The sentence under it. */
  hint: string
  group: CellFieldGroup
  writeRoute: CellWriteRoute
  /**
   * Whether every raw cell carries the column. The board query selects them
   * all, but the no-database fallback and the hand-written fixtures carry
   * only what they need, so the raw shape makes the rest optional.
   */
  required: boolean
  /**
   * The name the agent's cell-writing tools take the field under, where the
   * agent may set it — always the column's own name, which the type says,
   * so the argument schema derived from this list cannot advertise one
   * spelling and read another. Absent means the agent has no argument for
   * the field.
   */
  agentArg?: K
  /**
   * `canvas` where the canvas length budget applies to the text — the rung
   * is per lane, decided by `cellBudgetKindForLane`, and this only says the
   * guidance is read for the field at all.
   */
  budget?: 'canvas'
  /**
   * How the raw column becomes the normalized value. Absent means the value
   * passes through with `null` for an absent column, which is what most
   * fields want; the exceptions narrow (`status`), default (`position`) or
   * retype (`value_props`).
   */
  normalize?: (value: CellRow[K] | null | undefined) => BlueprintCell[K]
}

export type AnyCellField = { [K in CellFieldKey]: CellFieldDescriptor<K> }[CellFieldKey]

/**
 * The list, in the order the select names them. `as const` keeps each key
 * and `required` flag literal so the raw shape can tell a required column
 * from an optional one; `satisfies` checks each descriptor against its own
 * column and types each `normalize` against it.
 */
export const CELL_FIELDS = [
  {
    key: 'id',
    label: 'Id',
    hint: 'The cell, to everything that points at it.',
    group: 'structure',
    writeRoute: null,
    required: true,
  },
  {
    key: 'lane_id',
    label: 'Lane',
    hint: 'Whose row the moment is on.',
    group: 'structure',
    writeRoute: 'rpc',
    required: true,
  },
  {
    key: 'step_id',
    label: 'Step',
    hint: 'Which moment of the journey this is.',
    group: 'structure',
    writeRoute: 'rpc',
    required: true,
  },
  {
    key: 'position',
    label: 'Position',
    hint: 'The order inside the slot, where a lane holds more than one cell at a step.',
    group: 'structure',
    writeRoute: 'rpc',
    required: false,
    // Sorted on by every slot. Without the default a slot holding more than
    // one cell compares undefined to undefined and renders in whatever order
    // the database returned.
    normalize: (value) => value ?? 0,
  },
  {
    key: 'content',
    label: 'Content',
    hint: 'What this cell says on the grid.',
    group: 'content',
    writeRoute: 'content',
    required: true,
    agentArg: 'content',
    budget: 'canvas',
  },
  {
    key: 'frame',
    label: 'Featured image',
    hint: 'The one picture this cell leads with.',
    group: 'content',
    writeRoute: 'rpc',
    required: false,
  },
  {
    key: 'summary',
    label: 'Summary',
    hint: 'The tl;dr — what the detailed fields below add up to.',
    group: 'content',
    writeRoute: 'content',
    required: false,
    agentArg: 'summary',
  },
  {
    key: 'status',
    label: 'Status',
    hint: 'How far along the thing this cell describes is, from proposed to live to on its way out.',
    group: 'content',
    writeRoute: 'content',
    required: false,
    // Narrowed rather than passed through: the column is plain text under a
    // check constraint, and a value the renderer has no treatment for reads
    // as shipped rather than as an unrecognised marker.
    normalize: (value) => asEntityStatus(value),
  },
  {
    key: 'function',
    label: 'Function',
    hint: 'What this cell has to accomplish.',
    group: 'spec',
    writeRoute: 'spec',
    required: false,
    agentArg: 'function',
  },
  {
    key: 'form',
    label: 'Form',
    hint: 'How it comes across.',
    group: 'spec',
    writeRoute: 'spec',
    required: false,
    agentArg: 'form',
  },
  {
    key: 'value_props',
    label: 'Value proposition',
    hint: 'Who gets what from it.',
    group: 'spec',
    writeRoute: 'spec',
    required: false,
    agentArg: 'value_props',
    // The column is jsonb; the cell type names the shape the panel renders.
    // Absent rather than empty, so "unset" and "set to nothing" stay apart.
    normalize: (value) => (value ?? undefined) as BlueprintCell['value_props'],
  },
  {
    key: 'owner',
    label: 'Owner',
    hint: 'The team accountable for this moment.',
    group: 'content',
    writeRoute: 'content',
    required: false,
    agentArg: 'owner',
  },
  {
    key: 'perceived_owner',
    label: 'Perceived owner',
    hint: 'Who the person on the other side thinks they are dealing with. A gap between the two is a finding.',
    group: 'content',
    writeRoute: 'content',
    required: false,
    agentArg: 'perceived_owner',
  },
] as const satisfies readonly AnyCellField[]

export type CellField = (typeof CELL_FIELDS)[number]

type RequiredKey = Extract<CellField, { required: true }>['key']
type OptionalKey = Exclude<CellField['key'], RequiredKey>

/**
 * A cell as the board query returns it: every column the list names, the
 * required ones present and the rest optional and nullable, because the
 * fallback and the fixtures carry only what they need. The normalizer's
 * raw cell is this plus the embedded relations, which have descriptors of
 * their own.
 */
export type RawCellColumns = Pick<CellRow, RequiredKey> & {
  [K in OptionalKey]?: CellRow[K] | null
}

/** The normalized values of every field the list names. */
export type CellFieldValues = { [K in CellField['key']]: BlueprintCell[K] }

/**
 * PostgREST reads a reserved word as a keyword unless it is quoted; the
 * one such column a cell has is `function`. Quoting only the reserved word
 * keeps the select readable, and the scripts that walk select strings see
 * the same spelling they always did.
 */
const RESERVED_IN_SELECT = new Set<string>(['function'])

function selectSpelling(key: string): string {
  return RESERVED_IN_SELECT.has(key) ? `"${key}"` : key
}

/**
 * The columns of the board select's cells block, from the list. Takes the
 * list so a test can hand it a different one and watch the select move.
 */
export function cellSelectColumns(fields: readonly AnyCellField[] = CELL_FIELDS): string {
  return fields.map((descriptor) => selectSpelling(descriptor.key)).join(',\n    ')
}

/** The cells block's columns as the board select carries them. */
export const CELL_SELECT_COLUMNS = cellSelectColumns()

/**
 * The normalized field values of one raw cell, from the list: each field's
 * own `normalize` where it has one, otherwise the column with `null` for an
 * absent value. Takes the list for the same reason `cellSelectColumns` does.
 */
export function cellFieldsFromRow(
  row: RawCellColumns,
  fields: readonly AnyCellField[] = CELL_FIELDS,
): CellFieldValues {
  // Erased on purpose. Each descriptor's `normalize` is typed against its
  // own column, and the list is a union of them; TypeScript cannot carry
  // that correlation through a loop (the key that picks the column and the
  // function that reads it are the same union member, but the checker sees
  // two independent unions). The correlation is checked where the list is
  // written — `satisfies` types every `normalize` against its key — so this
  // reads each field untyped and hands back the shape the list promises.
  const values: Record<string, unknown> = {}
  for (const descriptor of fields) {
    const raw = (row as Record<string, unknown>)[descriptor.key]
    values[descriptor.key] = descriptor.normalize
      ? (descriptor.normalize as (value: unknown) => unknown)(raw)
      : (raw ?? null)
  }
  return values as CellFieldValues
}
