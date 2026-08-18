import { useCallback, useMemo } from 'react'
import { useSupabase } from '@/contexts/SupabaseProvider'
import { useSupabaseQuery } from '@/hooks/useSupabaseQuery'
import { findFirstLifecycleId } from '@/lib/lifecycle'
import { phasesToSlides, type PhaseRow } from '@/lib/phasesToSlides'
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

/**
 * Same projection plus the owning lifecycle, for the unpinned read that
 * cannot filter server-side because the lifecycle id is still in flight.
 */
const LIFECYCLE_PHASES_SELECT_WITH_OWNER = `service_lifecycle_id,${LIFECYCLE_PHASES_SELECT}`

type PhaseQueryRow = PhaseRow & { service_lifecycle_id?: string }

const NO_PHASES: PhaseRow[] = []

/**
 * Load the phases (and nested scenarios) of one service lifecycle.
 *
 * With no explicit `lifecycleId`, the first lifecycle by `created_at` is used
 * — the common case is a single lifecycle per database. Pass an id to pin a
 * specific lifecycle in multi-lifecycle databases.
 *
 * Both reads go out in the same tick. Resolving the lifecycle *then*
 * querying its phases put a full serial round trip in front of the canvas
 * mount, which is exactly the window where the unfitted viewport used to
 * show. Unpinned, the phases read is therefore unfiltered and narrowed to
 * the resolved lifecycle client-side — no extra rows in the single-lifecycle
 * databases this targets. The result goes through the shared query cache, so
 * the lookup survives remounts and is shared with every other consumer of
 * `findFirstLifecycleId`.
 */
export function useLifecyclePhases(lifecycleId?: string) {
  const { configured } = useSupabase()
  const fallback = useCallback(() => null, [])

  const result = useSupabaseQuery<PhaseRow[]>(
    `lifecycle-phases:${lifecycleId ?? 'first'}`,
    async (client) => {
      const lifecycleIdPromise = lifecycleId
        ? Promise.resolve<string | null>(lifecycleId)
        : findFirstLifecycleId(client)

      const rowsPromise = (
        lifecycleId
          ? client
              .from('phases')
              .select(LIFECYCLE_PHASES_SELECT)
              .eq('service_lifecycle_id', lifecycleId)
          : client.from('phases').select(LIFECYCLE_PHASES_SELECT_WITH_OWNER)
      ).order('order_position', { ascending: true })

      const [resolvedLifecycleId, { data, error }] = await Promise.all([
        lifecycleIdPromise,
        rowsPromise,
      ])
      if (error) throw new Error(error.message)
      // Empty database — the caller falls back to local sample slides.
      if (!resolvedLifecycleId) return NO_PHASES

      const rows = (data ?? []) as PhaseQueryRow[]
      if (lifecycleId) return rows as PhaseRow[]
      return rows.filter(
        (row) => row.service_lifecycle_id === resolvedLifecycleId,
      )
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
