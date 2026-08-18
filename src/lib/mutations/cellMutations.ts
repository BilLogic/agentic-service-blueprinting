import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database, Json } from '@/types/database'

type Client = SupabaseClient<Database>

/**
 * Direct-column cell edits. Content/description/owner and the spec columns
 * carry column-level grants from the derived-layer migration precisely so
 * the panel (and the agent) can edit what a cell *says* without opening the
 * cell's position — path, layer, step — to the same path. Where a cell sits
 * is structure, and structure goes through the RPCs in authoringRpc.ts.
 */

/**
 * The cell-content budget: a canvas cell is read at a glance, and the lane
 * grid's row rhythm assumes ~5-6 wrapped lines. Detail beyond the cap
 * belongs in `description`, which the panel scrolls.
 */
export const CELL_CONTENT_MAX = 120

/** Returns an actionable refusal when content exceeds the budget. */
export function checkCellContentLength(content: string): string | null {
  if (content.length <= CELL_CONTENT_MAX) return null
  return (
    `Cell content is ${content.length} characters — the cap is ${CELL_CONTENT_MAX}. ` +
    'A cell is read at a glance on the canvas; keep the complete predicate in content ' +
    'and move supporting detail (statistics, caveats, evidence) into the description.'
  )
}

/**
 * A matched-nothing UPDATE is a 200 with an empty array, not an error.
 * Zero-row writes are failures here — "Cell updated" over a row that no
 * longer exists is the ledger claiming a change the database does not have.
 */
function requireRowsWritten(rows: unknown[] | null, noun: string): void {
  if (!rows || rows.length === 0)
    throw new Error(`The ${noun} was not written — it may have been deleted since you read it.`)
}

export type CellContentUpdate = {
  /** The text in the cell on the grid. */
  content: string
  description: string
  owner: string
  perceivedOwner: string
}

/**
 * Write the cell's own text. `content` is the one field that is never
 * nulled: a cell with no text is a blank box that cannot be told apart
 * from a gap in the blueprint, so an empty label is refused rather than
 * stored. Empty strings elsewhere store as null so "not specified" has one
 * representation.
 */
export async function updateCellContent(
  client: Client,
  cellId: string,
  update: CellContentUpdate,
): Promise<void> {
  const content = update.content.trim()
  if (!content) {
    throw new Error('A cell needs text — an empty one reads as a gap in the grid.')
  }

  const { data, error } = await client
    .from('cells')
    .update({
      content,
      description: update.description.trim() || null,
      owner: update.owner.trim() || null,
      perceived_owner: update.perceivedOwner.trim() || null,
    })
    .eq('id', cellId)
    .select('id')
  if (error) throw new Error(error.message)
  requireRowsWritten(data, 'cell')
}

export type ValueProp = { for: string; value: string }

export type CellSpecUpdate = {
  function: string
  form: string
  valueProps: ValueProp[]
}

/** Write the cell's spec columns (function / form / value_props). */
export async function updateCellSpec(
  client: Client,
  cellId: string,
  update: CellSpecUpdate,
): Promise<void> {
  const valueProps = update.valueProps
    .map((entry) => ({ for: entry.for.trim(), value: entry.value.trim() }))
    .filter((entry) => entry.for || entry.value)

  const { data, error } = await client
    .from('cells')
    .update({
      function: update.function.trim() || null,
      form: update.form.trim() || null,
      value_props: valueProps as unknown as Json,
    })
    .eq('id', cellId)
    .select('id')
  if (error) throw new Error(error.message)
  requireRowsWritten(data, 'cell')
}
