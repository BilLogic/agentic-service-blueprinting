import { useSyncExternalStore } from 'react'

/**
 * The resolved active service — its id, its slug and its name together — as a
 * module-level fact, under the decision that cross-surface state is a module
 * store — read by non-React code as well as by hooks, and outliving any one
 * mount.
 *
 * Resolved ONCE, at the surface root: the provider that reads the roster
 * matches the URL's slug (or takes the first service at the bare root) and
 * writes the answer here. Everything below reads it — a hook takes the id as
 * a parameter, a write module takes it as an argument — and nothing below
 * resolves a slug for itself. That is what closes the family of bugs where a
 * slice, a source or a phase landed on whichever service was first by
 * `created_at`: there is one resolution, and it is the one the board draws.
 *
 * `null` is "no service is active": the roster has not loaded, or the URL
 * names a slug no service carries. A reader given `null` reads nothing — it
 * does not fall back to the first service, and it does not read across all
 * of them.
 *
 * The URL is not written from here. The slug in the address bar is the
 * requested slug, seeded from the boot path and moved by a switch; this store
 * is the answer to it. The provider keeps the two in step. The name rides
 * along for the one reader that words a sentence with it — the agent's
 * scope — so that reader need not hold the roster.
 */
export type ActiveServiceRef = { id: string; slug: string; name: string }

let active: ActiveServiceRef | null = null
const listeners = new Set<() => void>()

export function getActiveService(): ActiveServiceRef | null {
  return active
}

/**
 * The one write path. A set to the same service is a no-op — subscribers
 * are not told, and the snapshot keeps its identity — so a provider effect
 * that re-derives the same answer costs no render.
 */
export function setActiveService(next: ActiveServiceRef | null): void {
  if (active === next) return
  if (active && next && active.id === next.id && active.slug === next.slug && active.name === next.name)
    return
  active = next
  for (const listener of listeners) listener()
}

export function subscribeToActiveService(listener: () => void): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

/** The resolved active service, as a subscription — what the context is built over. */
export function useActiveServiceRef(): ActiveServiceRef | null {
  return useSyncExternalStore(subscribeToActiveService, getActiveService, getActiveService)
}

/**
 * The active service's id, or `null` — what a service-scoped read hook is
 * handed. The id alone, so a caller re-renders when the service changes and
 * not when the roster around it does.
 */
export function useActiveServiceId(): string | null {
  return useSyncExternalStore(subscribeToActiveService, activeId, activeId)
}

function activeId(): string | null {
  return active?.id ?? null
}
