import { specWriter, type SpecLevel } from '@/lib/specMutations'
import { invalidateQueries } from '@/lib/queryClient'
import { queryKeys } from '@/lib/queryKeys'

/**
 * A step's summary — the sentence the storyboard frame is captioned with, and
 * the only thing a reader can scan a column by without reading five cells.
 *
 * One column, so one declaration. `name` is a structural rename with its own
 * RPC, and a step's POSITION belongs to `path_steps`, not here.
 */
const STEP_SPEC: SpecLevel<'steps', string, string> = {
  table: 'steps',
  addressedBy: 'id',
  subject: 'step',
  columns: (summary) => ({ summary: summary.trim() || null }),
  invalidate: (stepId) => {
    invalidateQueries(queryKeys.stepSpec.of(stepId))
    // The summary doubles as the storyboard caption the canvas draws.
    invalidateQueries(queryKeys.canvasBlueprints.prefix)
  },
  fn: 'update_step_spec',
  targetArg: 'step_id',
  previousAs: 'summary',
}

/** Write a step's summary. */
export const updateStepSummary = specWriter(STEP_SPEC)
