import type { EntityStatus } from '@/lib/entityStatus'
import type { SupabaseClient } from '@supabase/supabase-js'
import { recordChange } from '@/lib/authoringSession'
import { toAuthoringError } from '@/lib/authoringErrors'
import { requireRowsWritten } from '@/lib/optimisticConcurrency'
import type { Database } from '@/types/database'

type Client = SupabaseClient<Database>

/**
 * Write a scenario's summary.
 *
 * One column, so one function. `layout` is deliberately not writable from
 * here: it is set by using the header toggle, which writes it through
 * `update_scenario_layout` (#280), and a properties panel is the wrong place
 * to change what you are looking at. `name` is a structural rename with its
 * own RPC.
 */
export async function updateScenarioSummary(
  client: Client,
  scenarioId: string,
  summary: string,
  previous?: string,
  options: { record?: boolean } = {},
): Promise<void> {
  const { data, error } = await client
    .from('scenarios')
    .update({ summary: summary.trim() || null })
    .eq('id', scenarioId)
    .select('id')
  if (error) throw toAuthoringError(error)
  requireRowsWritten(data, 'scenario')

  if (options.record !== false) {
    recordChange(
      'update_scenario_spec',
      { scenario_id: scenarioId },
      previous === undefined
        ? undefined
        : {
            fn: 'update_scenario_spec',
            args: { scenario_id: scenarioId, summary: previous },
          },
    )
  }
}

export type PathSpecUpdate = {
  summary: string
  note: string
  status: EntityStatus
}

/**
 * Write a path's summary and note.
 *
 * The two are a pair by design: `summary` answers *when does this
 * route apply* and is a fact about the service; `note` is the author's aside
 * and is not. They are written together because they are edited together, in
 * the one place a path can be edited at all.
 */
export async function updatePathSpec(
  client: Client,
  pathId: string,
  update: PathSpecUpdate,
  previous?: PathSpecUpdate,
  options: { record?: boolean } = {},
): Promise<void> {
  const { data, error } = await client
    .from('paths')
    .update({
      summary: update.summary.trim() || null,
      note: update.note.trim() || null,
      status: update.status,
    })
    .eq('id', pathId)
    .select('id')
  if (error) throw toAuthoringError(error)
  requireRowsWritten(data, 'path')

  if (options.record !== false) {
    recordChange(
      'update_path_spec',
      { path_id: pathId },
      previous
        ? { fn: 'update_path_spec', args: { path_id: pathId, update: previous } }
        : undefined,
    )
  }
}
