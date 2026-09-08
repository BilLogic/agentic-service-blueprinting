import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  type ReactNode,
} from 'react'
import { useSupabaseQuery } from '@/hooks/useSupabaseQuery'
import {
  getActiveServiceSlug,
  setActiveServiceSlug,
  useActiveServiceSlug,
} from '@/contexts/activeServiceStore'
import { invalidateQueries, invalidateStructure } from '@/lib/queryClient'
import { resolveServiceBySlug, serviceSlug } from '@/lib/serviceSlug'

/**
 * The active service — the one the URL slug names — resolved to its id and
 * name, threaded the way the path selection is: a provider mounted high in the
 * tree, read through a hook.
 *
 * The slug itself lives in a module store (`activeServiceStore`, ADR 0005),
 * because non-React resolvers read it; this provider is the React-side
 * resolution of slug -> service and the one place that CANONICALIZES the URL:
 * once the service is known, its own slug is written to the path, so a
 * single-service installation that booted at the bare root ends with its slug
 * in the address bar, and a reload lands on the same service.
 *
 * Without it the routing scheme is only half wired. `lib/service.ts` and
 * `lib/agent/tools/serviceScope.ts` both READ the store, `serviceRoute.ts`
 * parses the slug out of the boot path and builds the path back — but nothing
 * ever WROTE the store, so an app entered at `/` stayed at `/` forever and its
 * first read fell through to "the first service by created_at" every time.
 * This is the missing write.
 *
 * Journey reads do not consume this context — they resolve the id inside their
 * fetchers via `lib/service.ts` so their two reads still go out in the same
 * tick. This context is for surfaces that need the service's identity or the
 * whole roster, and for the canonicalization effect below.
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
   * Make another service active: write its slug (and the URL, via the store)
   * and drop the caches the new service must repopulate. A no-op switch to the
   * service already active still refetches nothing new, since the slug guard in
   * the store short-circuits.
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

export function ActiveServiceProvider({ children }: { children: ReactNode }) {
  // Subscribe so the context value tracks the slug the store holds.
  const routeSlug = useActiveServiceSlug()
  const fallback = useCallback(() => null, [])

  const result = useSupabaseQuery<ActiveService[]>(
    // The roster is one read per page load; the ACTIVE one is derived from it
    // and the URL slug below, so a switch re-picks without refetching. The key
    // is constant — `switchService` invalidates the board caches, not this one.
    'active-service',
    async (client) => {
      const { data, error } = await client
        .from('services')
        .select('id, name, slug')
        .order('created_at')
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

  // The active service is the one the URL slug names, or the first at the bare
  // root (the single-service case). Derived from the roster + the reactive
  // slug, so a switch re-picks the moment the store changes — no refetch.
  const service = useMemo<ActiveService | null>(() => {
    if (services.length === 0) return null
    const picked = routeSlug
      ? resolveServiceBySlug(services, routeSlug)
      : services[0]
    return picked ?? null
  }, [services, routeSlug])

  // Canonicalize: write the resolved service's own slug into the URL. This is
  // what puts the single service's slug in the address bar and keeps a reload
  // on the same service. No-ops once the URL already carries the canonical slug.
  useEffect(() => {
    if (!service) return
    if (getActiveServiceSlug() !== service.slug) setActiveServiceSlug(service.slug)
  }, [service])

  const switchService = useCallback((slug: string) => {
    setActiveServiceSlug(slug)
    /*
      The board and the service surfaces read under constant keys (ADR 0006):
      changing the slug alone would not refetch them, so drop the caches the
      newly-active service must repopulate — the journey
      (`invalidateStructure`), the service identity (`service-spec:first`) and
      the per-kind examples, which are keyed separately here
      (`service-entity-examples:first`) rather than riding the spec.

      What this does NOT yet do is move the board, because the app's own
      fetchers still resolve `findFirstServiceId`; only the agent's
      `serviceScope` honours the slug today. So a switch moves the URL, the
      agent's scope and the caches now, and moves the board the moment those
      fetchers adopt `findActiveServiceId` — which is why the invalidation is
      written for the destination rather than for what reads it today.
    */
    invalidateStructure()
    invalidateQueries('service-spec')
    invalidateQueries('service-entity-examples')
  }, [])

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
