import type { SupabaseClient } from '@supabase/supabase-js'
import { recordChange } from '@/lib/authoringSession'
import { requireRowsWritten } from '@/lib/optimisticConcurrency'
import type { ValueProp } from '@/lib/valueProps'
import type { Database, Json } from '@/types/database'

type Client = SupabaseClient<Database>

export type CellSpecUpdate = {
  function: string
  form: string
  valueProps: ValueProp[]
}

/**
 * Write the cell's spec columns.
 *
 * These are the only cell columns the app may write: `function`, `form`, and
 * `value_props` carry a column-level grant precisely so the panel can edit
 * them without opening the blueprint's structural content to the same path.
 * Content, lane, step and path stay the import pipeline's business.
 *
 * Empty strings are stored as `null` rather than `''` so "not specified"
 * has one representation — the read path hides a section when its field is
 * empty, and two kinds of empty would make that check inconsistent.
 */
export async function updateCellSpec(
  client: Client,
  cellId: string,
  update: CellSpecUpdate,
  /** The values being replaced — captured so the change can be reverted. */
  previous?: CellSpecUpdate,
  /** `record: false` = revert path; see updateCellContent for the why. */
  options: { record?: boolean } = {},
): Promise<void> {
  const valueProps = update.valueProps
    .map((entry) => ({ for: entry.for.trim(), value: entry.value.trim() }))
    .filter((entry) => entry.for || entry.value)

  const { data, error } = await client
    .from('cells')
    .update({
      function: update.function.trim() || null,
      form: update.form.trim() || null,
      value_props: (valueProps.length > 0 ? valueProps : null) as Json,
    })
    .eq('id', cellId)
    .select('id')
  if (error) throw new Error(error.message)
  // See `requireRowsWritten`: a zero-row update is a 200, and reverting one
  // would drop the entry from the ledger having written nothing.
  requireRowsWritten(data, 'cell')
  // Direct table write — `call()` never sees it, so it logs itself.
  if (options.record !== false) {
    recordChange(
      'update_cell_spec',
      { cell_id: cellId },
      previous
        ? { fn: 'update_cell_spec', args: { cell_id: cellId, update: previous } }
        : undefined,
    )
  }
}
