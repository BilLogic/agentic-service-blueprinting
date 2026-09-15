import type { EntityStatus } from '@/lib/entityStatus'
import { specWriter, type SpecLevel } from '@/lib/specMutations'
import { invalidateQueries } from '@/lib/queryClient'
import { queryKeys } from '@/lib/queryKeys'

/**
 * A scenario's summary.
 *
 * One column, so one declaration. `layout` is deliberately not writable from
 * here: it is set by using the header toggle, which writes it through
 * `update_scenario_layout`, and a properties panel is the wrong place to
 * change what you are looking at. `name` is a structural rename with its own
 * RPC.
 */
const SCENARIO_SPEC: SpecLevel<'scenarios', string, string> = {
  table: 'scenarios',
  addressedBy: 'id',
  subject: 'scenario',
  columns: (summary) => ({ summary: summary.trim() || null }),
  invalidate: (scenarioId) => {
    invalidateQueries(queryKeys.scenarioSpec.of(scenarioId))
    invalidateQueries(queryKeys.servicePhases.prefix)
  },
  fn: 'update_scenario_spec',
  targetArg: 'scenario_id',
  previousAs: 'summary',
}

/** Write a scenario's summary. */
export const updateScenarioSummary = specWriter(SCENARIO_SPEC)

export type PathSpecUpdate = {
  summary: string
  note: string
  status: EntityStatus
}

/**
 * A path's summary and note.
 *
 * The two are a pair by design: `summary` answers *when does this route apply*
 * and is a fact about the service; `note` is the author's aside and is not.
 * They are written together because they are edited together, in the one place
 * a path can be edited at all. `status` is a domain value rather than prose,
 * so it passes through as it came.
 */
const PATH_SPEC: SpecLevel<'paths', string, PathSpecUpdate> = {
  table: 'paths',
  addressedBy: 'id',
  subject: 'path',
  columns: (update) => ({
    summary: update.summary.trim() || null,
    note: update.note.trim() || null,
    status: update.status,
  }),
  invalidate: () => {
    // The path's scenario is not in hand; every scenario spec is cheap.
    invalidateQueries(queryKeys.scenarioSpec.prefix)
    invalidateQueries(queryKeys.servicePhases.prefix)
  },
  fn: 'update_path_spec',
  targetArg: 'path_id',
  previousAs: 'update',
}

/** Write a path's summary and note. */
export const updatePathSpec = specWriter(PATH_SPEC)
