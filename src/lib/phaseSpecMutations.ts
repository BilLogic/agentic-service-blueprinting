import { specWriter, type SpecLevel } from '@/lib/specWrite'
import { invalidateQueries } from '@/lib/queryClient'
import { queryKeys } from '@/lib/queryKeys'

export type PhaseSpecUpdate = {
  summary: string
  businessImpact: string
  operationalRequirements: string
}

/**
 * A phase's spec columns.
 *
 * All three carry a column grant for the signed-in author: UPDATE on `phases`
 * is revoked wholesale and handed back one column at a time.
 * `business_impact` and `operational_requirements` were granted when that
 * posture was set; `summary` only later — the rename that turned `description`
 * into `summary` moved the column and not a grant that had never existed,
 * which this panel was the first thing to notice. A deployment that narrows
 * the table again gets the refusal back as the sentence `toAuthoringError`
 * makes of it.
 *
 * `name` is not here: renaming a phase is a structural edit with its own RPC
 * and its own ledger entry.
 */
const PHASE_SPEC: SpecLevel<string, PhaseSpecUpdate> = {
  table: 'phases',
  addressedBy: 'id',
  subject: 'phase',
  columns: (update) => ({
    summary: update.summary.trim() || null,
    business_impact: update.businessImpact.trim() || null,
    operational_requirements: update.operationalRequirements.trim() || null,
  }),
  invalidate: (phaseId) => {
    invalidateQueries(queryKeys.phaseSpec.of(phaseId))
    // The summary also feeds the overview and the sticky header.
    invalidateQueries(queryKeys.servicePhases.prefix)
  },
  fn: 'update_phase_spec',
  targetArg: 'phase_id',
  previousAs: 'update',
}

/** Write a phase's spec columns. */
export const updatePhaseSpec = specWriter(PHASE_SPEC)
