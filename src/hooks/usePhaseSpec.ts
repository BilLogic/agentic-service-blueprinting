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
}

/**
 * One phase's spec.
 *
 * It used to carry a scenario count and a cell count too — the cell count
 * walking phase → scenarios → paths → cells across two more requests. The
 * panel never rendered either: `PanelIdentity` gets `meta=""` on purpose,
 * because the scenarios are in the sidebar and the cells are on screen.
 * Counting them was three round trips per drawer open for a number nobody saw.
 */
export function usePhaseSpec(
  phaseId: string | null,
): QueryResult<PhaseSpec | null> {
  const fallback = useCallback(() => null, [])

  return useSupabaseQuery<PhaseSpec | null>(
    `phase-spec:${phaseId ?? 'none'}`,
    async (client, signal) => {
      if (!phaseId) return null

      const { data: phase, error } = await client
        .from('phases')
        .select(
          'id, name, summary, business_impact, operational_requirements, loops_to_phase_id, services!inner(name)',
        )
        .eq('id', phaseId)
        .abortSignal(signal)
        .maybeSingle()
      if (error) throw new Error(error.message)
      if (!phase) return null

      let loopsToName: string | null = null
      if (phase.loops_to_phase_id) {
        const { data: target } = await client
          .from('phases')
          .select('name')
          .eq('id', phase.loops_to_phase_id)
          .abortSignal(signal)
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
      }
    },
    fallback,
  )
}
