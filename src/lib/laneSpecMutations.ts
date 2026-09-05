import type { SupabaseClient } from '@supabase/supabase-js'
import { recordChange } from '@/lib/authoringSession'
import { toAuthoringError } from '@/lib/authoringErrors'
import { requireRowsWritten } from '@/lib/optimisticConcurrency'
import type { Database, Json } from '@/types/database'

type Client = SupabaseClient<Database>

export type LaneSpecUpdate = {
  ownerTeam: string
  kpis: string[]
  tools: string[]
  /**
   * The registry row this lane's actor is, or null for a structural row.
   * Fans out with everything else: the same label in the same scenario is the
   * same person, so it cannot be two different members of the cast.
   */
  stakeholderId: string | null
}

/**
 * Write a lane's spec columns — to EVERY lane in the scenario with this label.
 *
 * A lane row belongs to one path, so "Regular Tutor" in a four-path scenario
 * is four rows. Writing only the row the panel was opened from would leave the
 * same lane claiming a different owner depending on which path you were
 * looking at, which is not a state a reader could make sense of. The panel
 * says the count before saving; this is where the count comes true.
 *
 * `owner_team`, `kpis` and `tools` carry a column-level grant for exactly this
 * (`20260729120000_derived_layer.sql`); `name` and `lane_role` do not go
 * through here — renaming a lane is a structural edit with its own RPC.
 *
 * Empty is stored as `null` (text) or `[]` (jsonb) to match what the import
 * writes, so "not specified" has one representation per column type.
 */
export async function updateLaneSpec(
  client: Client,
  laneIds: string[],
  update: LaneSpecUpdate,
  /** The values being replaced — captured so the change can be reverted. */
  previous?: LaneSpecUpdate,
  /** `record: false` = revert path; see updateCellSpec for the why. */
  options: { record?: boolean } = {},
): Promise<void> {
  if (laneIds.length === 0) {
    throw new Error('That lane no longer exists — nothing to save onto.')
  }

  const kpis = update.kpis.map((entry) => entry.trim()).filter(Boolean)
  const tools = update.tools.map((entry) => entry.trim()).filter(Boolean)

  const { data, error } = await client
    .from('lanes')
    .update({
      owner_team: update.ownerTeam.trim() || null,
      kpis: kpis as unknown as Json,
      tools: tools as unknown as Json,
      stakeholder_id: update.stakeholderId,
    })
    .in('id', laneIds)
    .select('id')
  if (error) throw toAuthoringError(error)
  // See `requireRowsWritten`: a zero-row update is a 200, and reverting one
  // would drop the entry from the ledger having written nothing.
  requireRowsWritten(data, 'lane')

  // Direct table write — `call()` never sees it, so it logs itself.
  if (options.record !== false) {
    recordChange(
      'update_lane_spec',
      { lane_ids: laneIds },
      previous
        ? {
            fn: 'update_lane_spec',
            args: { lane_ids: laneIds, update: previous },
          }
        : undefined,
    )
  }
}
