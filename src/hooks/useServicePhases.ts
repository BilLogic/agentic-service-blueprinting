import { useCallback, useMemo } from 'react'
import { useSupabase } from '@/contexts/SupabaseProvider'
import { useSupabaseQuery } from '@/hooks/useSupabaseQuery'
import { phasesToSlides, type PhaseRow } from '@/lib/phasesToSlides'
import type { NavItem } from '@/types/nav'
import { queryKeys } from '@/lib/queryKeys'

const SERVICE_PHASES_SELECT = `
  id,
  name,
  summary,
  position,
  loops_to_phase_id,
  scenarios (
    id,
    name,
    summary,
    note,
    position,
    phase_id,
    layout
  )
`

const NO_PHASES: PhaseRow[] = []

/**
 * Load the phases (and nested scenarios) of one service.
 *
 * The service is the caller's to name — the active one from the store at a
 * surface root, or a pinned id. Given `null`, the hook fetches nothing and
 * stays `loading`: no service is a board with nothing on it, not a read of
 * every service's phases. This hook used to resolve the URL's slug itself,
 * in parallel with an unfiltered read it then narrowed client-side; the
 * resolution now happens once, in the provider, before any scoped read.
 */
export function useServicePhases(serviceId: string | null) {
  const { configured } = useSupabase()
  const fallback = useCallback(() => null, [])

  const result = useSupabaseQuery<PhaseRow[]>(
    serviceId ? queryKeys.servicePhases.of(serviceId) : null,
    async (client, signal) => {
      // Unreachable — the key is null without a service — but a type-level fact.
      if (!serviceId) return NO_PHASES
      const { data, error } = await client
        .from('phases')
        .select(SERVICE_PHASES_SELECT)
        .eq('service_id', serviceId)
        .order('position', { ascending: true })
        .abortSignal(signal)
      if (error) throw new Error(error.message)
      return (data ?? []) as PhaseRow[]
    },
    fallback,
  )

  const phases = result.status === 'ready' ? result.data : NO_PHASES
  const slides = useMemo<NavItem[]>(() => phasesToSlides(phases), [phases])

  return {
    phases,
    slides,
    loading: result.status === 'loading',
    error: result.status === 'error' ? result.message : null,
    configured,
  }
}
