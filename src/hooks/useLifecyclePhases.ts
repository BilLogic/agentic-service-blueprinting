import { useEffect, useState } from 'react'
import { useSupabase } from '@/contexts/SupabaseProvider'
import { phasesToSlides, type PhaseRow } from '@/lib/phasesToSlides'
import { raceSupabaseQuery } from '@/lib/supabaseFetchTimeout'
import type { Slide } from '@/types/slides'

/** Default lifecycle from seed.sql */
export const DEFAULT_LIFECYCLE_ID = 'a0000000-0000-4000-8000-000000000001'

/** In-session phase from seed.sql */
export const IN_SESSION_PHASE_ID = 'a0000000-0000-4000-8000-000000000104'

/** Pre-session phase from seed.sql */
export const PRE_SESSION_PHASE_ID = 'a0000000-0000-4000-8000-000000000103'

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

export function useLifecyclePhases(lifecycleId: string = DEFAULT_LIFECYCLE_ID) {
  const { client, configured } = useSupabase()
  const [phases, setPhases] = useState<PhaseRow[]>([])
  const [slides, setSlides] = useState<Slide[]>([])
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

    const query = client
      .from('phases')
      .select(LIFECYCLE_PHASES_SELECT)
      .eq('service_lifecycle_id', lifecycleId)
      .order('order_position', { ascending: true })

    void raceSupabaseQuery(query).then((result) => {
        if (cancelled) return
        if (result === 'timeout') {
          setPhases([])
          setSlides([])
          setError(null)
          setLoading(false)
          return
        }

        const { data, error: err } = result
        if (err) {
          setError(err.message)
          setPhases([])
          setSlides([])
        } else {
          const rows = (data ?? []) as PhaseRow[]
          setError(null)
          setPhases(rows)
          setSlides(phasesToSlides(rows))
        }
        setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [client, configured, lifecycleId])

  return { phases, slides, loading, error, configured }
}
