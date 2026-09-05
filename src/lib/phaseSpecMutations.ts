import type { SupabaseClient } from '@supabase/supabase-js'
import { recordChange } from '@/lib/authoringSession'
import { toAuthoringError } from '@/lib/authoringErrors'
import { requireRowsWritten } from '@/lib/optimisticConcurrency'
import type { Database } from '@/types/database'

type Client = SupabaseClient<Database>

export type PhaseSpecUpdate = {
  summary: string
  businessImpact: string
  operationalRequirements: string
}

/**
 * Write a phase's spec columns.
 *
 * All three columns carry a column grant for the signed-in author.
 * `business_impact` and `operational_requirements` have since
 * `20260729120000_derived_layer.sql` narrowed `phases` to exactly those two;
 * `summary` since `21000127000000_a_phase_may_say_what_it_is.sql` — the rename
 * that turned `description` into `summary` moved the column and not a grant
 * that had never existed, which this panel was the first thing to notice. A
 * deployment that narrows the table again gets the refusal back as the
 * sentence `toAuthoringError` makes of it.
 *
 * `name` is not here: renaming a phase is a structural edit with its own RPC
 * and its own ledger entry.
 */
export async function updatePhaseSpec(
  client: Client,
  phaseId: string,
  update: PhaseSpecUpdate,
  /** The values being replaced — captured so the change can be reverted. */
  previous?: PhaseSpecUpdate,
  /** `record: false` = revert path; see updateCellSpec for the why. */
  options: { record?: boolean } = {},
): Promise<void> {
  const { data, error } = await client
    .from('phases')
    .update({
      summary: update.summary.trim() || null,
      business_impact: update.businessImpact.trim() || null,
      operational_requirements: update.operationalRequirements.trim() || null,
    })
    .eq('id', phaseId)
    .select('id')
  if (error) throw toAuthoringError(error)
  requireRowsWritten(data, 'phase')

  if (options.record !== false) {
    recordChange(
      'update_phase_spec',
      { phase_id: phaseId },
      previous
        ? {
            fn: 'update_phase_spec',
            args: { phase_id: phaseId, update: previous },
          }
        : undefined,
    )
  }
}
