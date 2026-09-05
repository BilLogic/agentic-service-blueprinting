import type { SupabaseClient } from '@supabase/supabase-js'
import { recordChange } from '@/lib/authoringSession'
import { toAuthoringError } from '@/lib/authoringErrors'
import { requireRowsWritten } from '@/lib/optimisticConcurrency'
import type { Database } from '@/types/database'

type Client = SupabaseClient<Database>

/**
 * Write a step's summary — the sentence the storyboard frame is captioned
 * with, and the only thing a reader can scan a column by without reading
 * five cells.
 *
 * One column, so one function. `name` is a structural rename with its own
 * RPC, and a step's POSITION belongs to `path_steps`, not here.
 */
export async function updateStepSummary(
  client: Client,
  stepId: string,
  summary: string,
  previous?: string,
  options: { record?: boolean } = {},
): Promise<void> {
  const { data, error } = await client
    .from('steps')
    .update({ summary: summary.trim() || null })
    .eq('id', stepId)
    .select('id')
  if (error) throw toAuthoringError(error)
  requireRowsWritten(data, 'step')

  if (options.record !== false) {
    recordChange(
      'update_step_spec',
      { step_id: stepId },
      previous === undefined
        ? undefined
        : {
            fn: 'update_step_spec',
            args: { step_id: stepId, summary: previous },
          },
    )
  }
}
