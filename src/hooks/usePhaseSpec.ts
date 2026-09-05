import { useCallback } from 'react'
import { useSupabaseQuery, type QueryResult } from '@/hooks/useSupabaseQuery'

export type PhaseSpec = {
  id: string
  name: string
  summary: string
  businessImpact: string
  operationalRequirements: string
  /** The phase this one loops back to, by name — null when it runs once. */
  loopsToName: string | null
  serviceName: string
  scenarioCount: number
  cellCount: number
}

/**
 * One phase's spec, plus what it contains.
 *
 * The cell count walks phase → scenarios → paths → cells, which PostgREST
 * cannot count through in one request. Two queries: the scenarios (needed for
 * the count shown in the panel anyway) and then a count of cells on their
 * paths.
 */
export function usePhaseSpec(
  phaseId: string | null,
): QueryResult<PhaseSpec | null> {
  const fallback = useCallback(() => null, [])

  return useSupabaseQuery<PhaseSpec | null>(
    `phase-spec:${phaseId ?? 'none'}`,
    async (client) => {
      if (!phaseId) return null

      const { data: phase, error } = await client
        .from('phases')
        .select(
          'id, name, summary, business_impact, operational_requirements, loops_to_phase_id, services!inner(name)',
        )
        .eq('id', phaseId)
        .maybeSingle()
      if (error) throw new Error(error.message)
      if (!phase) return null

      const { data: scenarios, error: scenarioError } = await client
        .from('scenarios')
        .select('id, paths(id)')
        .eq('phase_id', phaseId)
      if (scenarioError) throw new Error(scenarioError.message)

      const pathIds = (scenarios ?? []).flatMap((scenario) =>
        ((scenario.paths ?? []) as { id: string }[]).map((path) => path.id),
      )

      let cellCount = 0
      if (pathIds.length > 0) {
        const { count, error: countError } = await client
          .from('cells')
          .select('id', { count: 'exact', head: true })
          .in('path_id', pathIds)
        if (countError) throw new Error(countError.message)
        cellCount = count ?? 0
      }

      let loopsToName: string | null = null
      if (phase.loops_to_phase_id) {
        const { data: target } = await client
          .from('phases')
          .select('name')
          .eq('id', phase.loops_to_phase_id)
          .maybeSingle()
        loopsToName = target?.name ?? null
      }

      const service = phase.services as unknown as { name: string }

      return {
        id: phase.id,
        serviceName: service.name,
        name: phase.name,
        summary: phase.summary ?? '',
        businessImpact: phase.business_impact ?? '',
        operationalRequirements: phase.operational_requirements ?? '',
        loopsToName,
        scenarioCount: (scenarios ?? []).length,
        cellCount,
      }
    },
    fallback,
  )
}
