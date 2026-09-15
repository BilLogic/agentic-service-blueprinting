import { specWriter, type SpecLevel } from '@/lib/specWrite'
import { invalidateQueries } from '@/lib/queryClient'
import { queryKeys } from '@/lib/queryKeys'

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
 * A lane's spec columns — on EVERY lane in the scenario with this label.
 *
 * A lane row belongs to one path, so "Blueprint owner" in a four-path scenario
 * is four rows, and the write is addressed by the set of them rather than by
 * one id. Writing only the row the panel was opened from would leave the same
 * lane claiming a different owner depending on which path you were looking at,
 * which is not a state a reader could make sense of. The panel says the count
 * before saving; this is where the count comes true.
 *
 * `owner_team`, `kpis` and `tools` carry a column-level grant for exactly
 * this: UPDATE on `lanes` is revoked wholesale and handed back one column at a
 * time. `name` and `lane_role` do not go through here — renaming a lane is a
 * structural edit with its own RPC.
 *
 * Empty is stored as `null` (text) or `[]` (jsonb) to match what the import
 * writes, so "not specified" has one representation per column type.
 */
const LANE_SPEC: SpecLevel<readonly string[], LaneSpecUpdate> = {
  table: 'lanes',
  addressedBy: 'id',
  subject: 'lane',
  columns: (update) => ({
    owner_team: update.ownerTeam.trim() || null,
    kpis: update.kpis.map((entry) => entry.trim()).filter(Boolean),
    tools: update.tools.map((entry) => entry.trim()).filter(Boolean),
    stakeholder_id: update.stakeholderId,
  }),
  // Every sibling lane row moves with this write, so the whole family.
  invalidate: () => invalidateQueries(queryKeys.laneSpec.prefix),
  fn: 'update_lane_spec',
  targetArg: 'lane_ids',
  previousAs: 'update',
}

/** Write a lane's spec columns, onto every row carrying its label. */
export const updateLaneSpec = specWriter(LANE_SPEC)
