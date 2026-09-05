import { useSyncExternalStore } from 'react'
import { parseServiceSlug, serviceRoutePath } from '@/lib/serviceRoute'

/**
 * The active service's slug, as a module-level fact.
 *
 * Which service the app is looking at must survive a mount changing and be read
 * by non-React code: `lib/service.ts` resolves the active service's id inside
 * plain fetcher functions with no hooks, exactly the condition that sends state
 * to a module store rather than context. The slug is seeded from the boot URL
 * path, so a deep link to `/<slug>` and a reload both land on the same service.
 *
 * Deliberately just the slug — the id and name are a database read away, and
 * the slug is the only part the URL and the non-React resolvers need to agree
 * on.
 */

let activeSlug: string | null =
  typeof window !== 'undefined' ? parseServiceSlug(window.location.pathname) : null

const listeners = new Set<() => void>()

export function subscribeActiveService(listener: () => void): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export function getActiveServiceSlug(): string | null {
  return activeSlug
}

/**
 * The one write path. Also mirrors the slug into the URL path, preserving the
 * search string so a `?cell=`/`?slice=` deep link is not dropped when the
 * service resolves. `ViewStateProvider` writes the search over the same path.
 */
export function setActiveServiceSlug(slug: string | null): void {
  if (activeSlug === slug) return
  activeSlug = slug
  if (typeof window !== 'undefined') {
    window.history.replaceState(
      null,
      '',
      serviceRoutePath(slug, window.location.search),
    )
  }
  for (const listener of listeners) listener()
}

export function useActiveServiceSlug(): string | null {
  return useSyncExternalStore(
    subscribeActiveService,
    getActiveServiceSlug,
    getActiveServiceSlug,
  )
}
