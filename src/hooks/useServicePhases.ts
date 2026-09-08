import { useCallback, useMemo } from 'react'
import { useSupabase } from '@/contexts/SupabaseProvider'
import { useSupabaseQuery } from '@/hooks/useSupabaseQuery'
import { awaitOrAbort, findFirstServiceId } from '@/lib/service'
import { phasesToSlides, type PhaseRow } from '@/lib/phasesToSlides'
import type { NavItem } from '@/types/nav'

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
    position,
    phase_id,
    layout
  )
`

/**
 * Same projection plus the owning service, for the unpinned read that
 * cannot filter server-side because the service id is still in flight.
 */
const SERVICE_PHASES_SELECT_WITH_OWNER = `service_id,${SERVICE_PHASES_SELECT}`

type PhaseQueryRow = PhaseRow & { service_id?: string }

const NO_PHASES: PhaseRow[] = []

/**
 * Load the phases (and nested scenarios) of one service.
 *
 * With no explicit `serviceId`, the first service by `created_at` is used
 * — the common case is a single service per database. Pass an id to pin a
 * specific service in multi-service databases.
 *
 * Both reads go out in the same tick. Resolving the service *then*
 * querying its phases put a full serial round trip in front of the canvas
 * mount, which is exactly the window where the unfitted viewport used to
 * show. Unpinned, the phases read is therefore unfiltered and narrowed to
 * the resolved service client-side — no extra rows in the single-service
 * databases this targets. The result goes through the shared query cache, so
 * the lookup survives remounts and is shared with every other consumer of
 * `findFirstServiceId`.
 */
export function useServicePhases(serviceId?: string) {
  const { configured } = useSupabase()
  const fallback = useCallback(() => null, [])

  const result = useSupabaseQuery<PhaseRow[]>(
    `service-phases:${serviceId ?? 'first'}`,
    async (client, signal) => {
      const serviceIdPromise = serviceId
        ? Promise.resolve<string | null>(serviceId)
        : awaitOrAbort(findFirstServiceId(client), signal)

      const rowsPromise = (
        serviceId
          ? client
              .from('phases')
              .select(SERVICE_PHASES_SELECT)
              .eq('service_id', serviceId)
          : client.from('phases').select(SERVICE_PHASES_SELECT_WITH_OWNER)
      )
        .order('position', { ascending: true })
        .abortSignal(signal)

      const [resolvedServiceId, { data, error }] = await Promise.all([
        serviceIdPromise,
        rowsPromise,
      ])
      if (error) throw new Error(error.message)
      // Empty database — the caller falls back to local sample slides.
      if (!resolvedServiceId) return NO_PHASES

      const rows = (data ?? []) as PhaseQueryRow[]
      if (serviceId) return rows as PhaseRow[]
      return rows.filter(
        (row) => row.service_id === resolvedServiceId,
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
