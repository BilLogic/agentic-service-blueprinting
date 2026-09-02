import type { SupabaseClient } from '@supabase/supabase-js'
import { updateScenarioLayout } from '@/lib/authoringRpc'
import { invalidateStructure } from '@/lib/queryClient'
import type { Database } from '@/types/database'
import type { SlideViewType } from '@/types/nav'

type Client = SupabaseClient<Database>

/** What became of a toggle: a row changed, or only this session's view did. */
export type LayoutChangeOutcome = 'written' | 'session-only'

/**
 * Persist a scenario's layout when this session may, and say which happened.
 *
 * One decision, made once. Every caller of the display setter — the header
 * toggle, the phase-wide filter, the agent's `set_scenario_view` — goes
 * through this, so there is exactly one place that knows an editor's choice
 * is a row and a viewer's choice is not:
 *
 *   - an editor (`canWrite`) writes `scenarios.layout` through the recorded
 *     `update_scenario_layout`, inverse included, and the structure queries
 *     refetch so the stored value comes back as the slide's own `layout`;
 *   - anon and view-only sessions hold no write on the column, so their
 *     choice is `session-only` and lives in the editor's override map.
 *
 * `previous` is what the reader was LOOKING AT — override included — because
 * that is what "take it back" has to restore; the row may have said
 * something else all along.
 */
export async function persistScenarioLayout(
  client: Client | null,
  canWrite: boolean,
  input: {
    scenarioId: string
    layout: SlideViewType
    previous: SlideViewType | undefined
  },
): Promise<LayoutChangeOutcome> {
  if (!client || !canWrite) return 'session-only'
  await updateScenarioLayout(client, {
    scenarioId: input.scenarioId,
    layout: input.layout,
    previousLayout: input.previous,
  })
  invalidateStructure()
  return 'written'
}
