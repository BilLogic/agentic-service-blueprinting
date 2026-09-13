import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  type ReactNode,
} from 'react'
import { useSupabaseQuery } from '@/hooks/useSupabaseQuery'
import { useSupabase } from '@/contexts/SupabaseProvider'
import {
  setActiveService,
  useActiveServiceRef,
  type ActiveServiceRef,
} from '@/contexts/activeService'
import {
  getActiveServiceSlug,
  setActiveServiceSlug,
  useActiveServiceSlug,
} from '@/contexts/activeServiceStore'
import { SAMPLE_SERVICE_ID } from '@/data/sampleBlueprint'
import { resolveServiceBySlug, serviceSlug } from '@/lib/serviceSlug'
import { queryKeys } from '@/lib/queryKeys'

/**
 * The active service — the one the URL slug names — resolved to its id and
 * name, ONCE, here, at the surface root.
 *
 * Two module stores meet in this provider. The requested slug lives in
 * `activeServiceStore`: seeded from the boot path, moved by a switch,
 * mirrored into the URL. The resolved service — id and slug together — lives
 * in `activeService`, and this provider is its only writer: once the roster
 * is read, the slug is matched (or the first service taken at the bare
 * root), the answer is written to the store, and the service's own slug is
 * written back to the URL so a single-service installation that booted at `/`
 * ends with its slug in the address bar and a reload lands on the same
 * service.
 *
 * Everything below reads the resolved store and resolves nothing: a
 * service-scoped read hook takes the id as a parameter, and a hook given
 * `null` fetches nothing. This context is the thin subscription over the
 * store for the surfaces that also need the service's NAME or the whole
 * roster — the header, the switcher, the cover.
 *
 * With no database the active service is the bundled sample's, so the
 * sample board's reads have an id to key on and resolve from their
 * fallbacks. The URL is left alone in that mode.
 */

export type ActiveService = { id: string; name: string; slug: string }

type ActiveServiceContextValue = {
  /** The resolved active service, or `null` while loading / when none matches. */
  service: ActiveService | null
  /** Every service in the database, in `created_at` order. `[]` until loaded. */
  services: ActiveService[]
  /** The slug currently in the URL (may trail the resolved slug for a frame). */
  slug: string | null
  loading: boolean
  /**
   * Make another service active: write its slug (and the URL, via the slug
   * store) and the resolved service (via the resolved store), in one step.
   * The reads are keyed by the service's id, so a switch refetches nothing
   * and drops nothing: the new service's reads are new keys, and the old
   * service's stay warm for a switch back.
   */
  switchService: (slug: string) => void
}

/** A stable empty roster so consumers do not resubscribe each render. */
const NO_SERVICES: ActiveService[] = []

const ActiveServiceContext = createContext<ActiveServiceContextValue>({
  service: null,
  services: NO_SERVICES,
  slug: null,
  loading: true,
  switchService: () => {},
})

/**
 * The bundled sample's service, active whenever there is no database. The
 * sample's service row carries no slug and nothing dereferences this one —
 * the URL is left alone in that mode — so the value is a placeholder that
 * only has to be a string.
 */
const SAMPLE_ACTIVE_SERVICE: ActiveServiceRef = { id: SAMPLE_SERVICE_ID, slug: 'sample' }

/** The store's view of a roster entry: the id and the slug, without the name. */
function toRef(service: ActiveService): ActiveServiceRef {
  return { id: service.id, slug: service.slug }
}

export function ActiveServiceProvider({ children }: { children: ReactNode }) {
  const { configured } = useSupabase()
  // Subscribe so the context value tracks the slug the store holds.
  const routeSlug = useActiveServiceSlug()
  const fallback = useCallback(() => null, [])

  const result = useSupabaseQuery<ActiveService[]>(
    // The roster is one read per page load; the ACTIVE one is derived from it
    // and the URL slug below, so a switch re-picks without refetching. The key
    // is constant: a switch changes which service is active, not the roster.
    queryKeys.activeService,
    async (client, signal) => {
      const { data, error } = await client
        .from('services')
        .select('id, name, slug')
        .order('created_at')
        .abortSignal(signal)
      if (error) throw new Error(error.message)

      return (data ?? []).map((row) => ({
        id: row.id,
        name: row.name,
        slug: serviceSlug(row),
      }))
    },
    fallback,
  )

  const services = result.status === 'ready' ? result.data : NO_SERVICES

  // The resolution: the service the URL slug names, or the first at the bare
  // root (the single-service case), picked from the roster.
  const picked = useMemo<ActiveService | null>(() => {
    if (services.length === 0) return null
    return (routeSlug ? resolveServiceBySlug(services, routeSlug) : services[0]) ?? null
  }, [services, routeSlug])

  // The one resolution: write the answer to the resolved store, and
  // canonicalize the URL with the service's own slug — what puts the single
  // service's slug in the address bar and keeps a reload on the same service.
  // No-ops once both already hold the answer. `null` while the roster loads
  // and when the slug names no service: a reader given null reads nothing.
  useEffect(() => {
    if (!configured) {
      setActiveService(SAMPLE_ACTIVE_SERVICE)
      return
    }
    setActiveService(picked ? toRef(picked) : null)
    if (picked && getActiveServiceSlug() !== picked.slug) setActiveServiceSlug(picked.slug)
  }, [configured, picked])

  // The context is built OVER the store, not beside it: `service` is the
  // store's entry named in the roster, so this hook and `useActiveServiceId`
  // agree in every frame — there is no frame where the header names a service
  // the board has not yet been handed.
  const ref = useActiveServiceRef()
  const service = useMemo<ActiveService | null>(
    () => (ref ? (services.find((entry) => entry.id === ref.id) ?? null) : null),
    [ref, services],
  )

  const switchService = useCallback(
    (slug: string) => {
      setActiveServiceSlug(slug)
      // Resolved here and now from the roster in hand rather than left to the
      // effect, so no frame reads the old service under the new slug.
      const picked = resolveServiceBySlug(services, slug)
      setActiveService(picked ? toRef(picked) : null)
    },
    [services],
  )

  const value = useMemo<ActiveServiceContextValue>(
    () => ({
      service,
      services,
      slug: routeSlug,
      loading: result.status === 'loading',
      switchService,
    }),
    [service, services, routeSlug, result.status, switchService],
  )

  return (
    <ActiveServiceContext.Provider value={value}>
      {children}
    </ActiveServiceContext.Provider>
  )
}

/** The active service, the whole roster, and the slug in the URL. */
export function useActiveService(): ActiveServiceContextValue {
  return useContext(ActiveServiceContext)
}
