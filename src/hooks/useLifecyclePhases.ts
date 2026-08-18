import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useSupabase } from '@/contexts/SupabaseProvider'
import { phasesToSlides, type PhaseRow } from '@/lib/phasesToSlides'
import { raceSupabaseQuery } from '@/lib/supabaseFetchTimeout'
import type { NavItem } from '@/types/nav'

const LIFECYCLE_PHASES_SELECT = `
  id,
  name,
  description,
  order_position,
  loops_to_phase_id,
  service_scenarios (
    id,
    name,
    description,
    order_position,
    phase_id,
    view_type
  )
`

const EMPTY_PHASES: PhaseRow[] = []
const EMPTY_SLIDES: NavItem[] = []

/**
 * Load the phases (and nested scenarios) of one service lifecycle, cached
 * under the `lifecycle-phases:` prefix (invalidated by structural writes via
 * `invalidateStructure`).
 *
 * With no explicit `lifecycleId`, the first lifecycle by `created_at` is used
 * — the common case is a single lifecycle per database. Pass an id to pin a
 * specific lifecycle in multi-lifecycle databases.
 *
 * A timeout or an empty database resolves to no phases with no error — the
 * caller falls back to the bundled sample slides, same as a no-DB session.
 */
export function useLifecyclePhases(lifecycleId?: string) {
  const { client, configured } = useSupabase()
  const noDb = !configured || !client

  const query = useQuery<PhaseRow[]>({
    queryKey: [`lifecycle-phases:${lifecycleId ?? 'first'}`],
    enabled: !noDb,
    queryFn: async () => {
      let resolvedLifecycleId = lifecycleId
      if (!resolvedLifecycleId) {
        const outcome = await raceSupabaseQuery(
          client!
            .from('service_lifecycles')
            .select('id')
            .order('created_at', { ascending: true })
            .limit(1),
        )
        // Timeout degrades silently — the caller renders the sample slides.
        if (outcome === 'timeout') return EMPTY_PHASES
        if (outcome.error) throw new Error(outcome.error.message)
        const first = (outcome.data ?? [])[0] as { id: string } | undefined
        // Empty database — fall back to local sample slides upstream.
        if (!first) return EMPTY_PHASES
        resolvedLifecycleId = first.id
      }

      const outcome = await raceSupabaseQuery(
        client!
          .from('phases')
          .select(LIFECYCLE_PHASES_SELECT)
          .eq('service_lifecycle_id', resolvedLifecycleId)
          .order('order_position', { ascending: true }),
      )
      if (outcome === 'timeout') return EMPTY_PHASES
      if (outcome.error) throw new Error(outcome.error.message)
      return (outcome.data ?? []) as PhaseRow[]
    },
  })

  const phases = noDb || query.error ? EMPTY_PHASES : (query.data ?? EMPTY_PHASES)
  const slides = useMemo(
    () => (phases.length > 0 ? phasesToSlides(phases) : EMPTY_SLIDES),
    [phases],
  )
  const loading = !noDb && query.isPending
  const error = query.error
    ? query.error instanceof Error
      ? query.error.message
      : String(query.error)
    : null

  return { phases, slides, loading, error, configured }
}
