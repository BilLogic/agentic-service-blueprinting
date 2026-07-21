import { useEffect, useState } from 'react'
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

/**
 * Load the phases (and nested scenarios) of one service lifecycle.
 *
 * With no explicit `lifecycleId`, the first lifecycle by `created_at` is used
 * — the common case is a single lifecycle per database. Pass an id to pin a
 * specific lifecycle in multi-lifecycle databases.
 */
export function useLifecyclePhases(lifecycleId?: string) {
  const { client, configured } = useSupabase()
  const [phases, setPhases] = useState<PhaseRow[]>([])
  const [slides, setSlides] = useState<NavItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!configured || !client) {
      setPhases([])
      setSlides([])
      setLoading(false)
      setError(null)
      return
    }

    let cancelled = false
    setLoading(true)

    const fail = (message: string | null) => {
      if (cancelled) return
      setError(message)
      setPhases([])
      setSlides([])
      setLoading(false)
    }

    const loadPhases = (resolvedLifecycleId: string) => {
      const query = client
        .from('phases')
        .select(LIFECYCLE_PHASES_SELECT)
        .eq('service_lifecycle_id', resolvedLifecycleId)
        .order('order_position', { ascending: true })

      void raceSupabaseQuery(query).then((result) => {
        if (cancelled) return
        if (result === 'timeout') {
          fail(null)
          return
        }

        const { data, error: err } = result
        if (err) {
          fail(err.message)
        } else {
          const rows = (data ?? []) as PhaseRow[]
          setError(null)
          setPhases(rows)
          setSlides(phasesToSlides(rows))
          setLoading(false)
        }
      })
    }

    if (lifecycleId) {
      loadPhases(lifecycleId)
    } else {
      const lifecycleQuery = client
        .from('service_lifecycles')
        .select('id')
        .order('created_at', { ascending: true })
        .limit(1)

      void raceSupabaseQuery(lifecycleQuery).then((result) => {
        if (cancelled) return
        if (result === 'timeout') {
          fail(null)
          return
        }

        const { data, error: err } = result
        if (err) {
          fail(err.message)
          return
        }

        const first = (data ?? [])[0] as { id: string } | undefined
        if (!first) {
          // Empty database — fall back to local sample slides upstream.
          fail(null)
          return
        }

        loadPhases(first.id)
      })
    }

    return () => {
      cancelled = true
    }
  }, [client, configured, lifecycleId])

  return { phases, slides, loading, error, configured }
}
