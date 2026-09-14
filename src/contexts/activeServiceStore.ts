import { useSyncExternalStore } from 'react'
import { parseServiceSlug, serviceRoutePath } from '@/lib/serviceRoute'

/**
 * The REQUESTED service's slug — the question, as a module-level fact under
 * the decision that cross-surface state is a module store. The answer, the
 * resolved service as id and slug, is `activeService.ts`; the provider turns
 * the one into the other, once.
 *
 * The slug is seeded from the boot URL path, so a deep link to `/<slug>` and a
 * reload both land on the same service, and this module is what mirrors a
 * switch back into the address bar. `lib/service.ts` still reads it to
 * resolve an id inside plain functions for the components and agent tools
 * that have not yet been handed the resolved store; the scoped read hooks no
 * longer do.
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
