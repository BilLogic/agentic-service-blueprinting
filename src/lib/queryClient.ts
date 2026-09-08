import { QueryClient } from '@tanstack/react-query'
import { SupabaseTimeoutError } from '@/lib/supabaseFetchTimeout'

/**
 * How long an unused response is kept before it is collected. Long enough
 * that the tabs and panels people move between stay warm, short enough that
 * a day-long session does not accumulate every cell's evidence, every slice
 * and every per-scenario payload it ever opened.
 */
const CACHE_RETENTION_MS = 30 * 60 * 1000

/**
 * The read policy, named so a test can build a throwaway client that behaves
 * exactly like the app's rather than restating these values and drifting.
 */
export const QUERY_DEFAULTS = {
  /*
   * Blueprint data is edited through explicit mutations, never by another
   * client, so there is nothing to poll for: a tab switch should reuse the
   * cached response rather than refetch. Revalidation is explicit — either
   * the key changes (reload tokens baked into keys, e.g. `useEvidence`) or
   * a mutation calls `invalidateQueries`.
   */
  staleTime: Infinity,
  /*
   * Staleness and collection are separate decisions, and only the first
   * one the header above argues for. `gcTime: Infinity` meant nothing was
   * ever released: a long session held every response it had ever made,
   * mounted or not. Collection costs nothing while a query is mounted —
   * the clock only starts once the last observer unmounts — and a
   * refetch after half an hour away is not a refetch anyone waits on.
   */
  gcTime: CACHE_RETENTION_MS,
  refetchOnWindowFocus: false,
  refetchOnReconnect: false,
  /*
   * One retry, and only for a deadline.
   *
   * `withSupabaseTimeout` bounds each attempt and aborts the request it
   * bounded, so a timeout means this attempt was too slow — not that the
   * database refused. Left unretried, that verdict stuck: stale time is
   * infinite and errors win over stale data, so the view showed a timeout
   * and the bundled fixture until a mutation invalidated it or the page
   * was reloaded. Everything else (a constraint, a policy, a missing row)
   * answers the same way however often it is asked, so it is not retried
   * and the fallback is not delayed.
   */
  retry: (failureCount: number, error: Error) =>
    failureCount < 1 && error instanceof SupabaseTimeoutError,
}

/**
 * Module-level client so `invalidateQueries` can stay a plain function call at
 * mutation sites rather than a hook — the app has exactly one client and no
 * SSR, which is the case where a module singleton is safe.
 */
export const queryClient = new QueryClient({
  defaultOptions: { queries: QUERY_DEFAULTS },
})

/**
 * Drop every cached query whose key starts with `prefix` and refetch the
 * mounted ones (e.g. `invalidateQueries('slices')` after deleting a slice).
 * Mounted hooks keep serving their last value while the refetch is in flight.
 *
 * Keys are single-element string arrays, so this is a prefix match on element
 * zero rather than TanStack's usual structural key matching — it preserves the
 * `'slice:'`-style namespacing the call sites already use.
 */
export function invalidateQueries(prefix: string): void {
  void queryClient.invalidateQueries({
    predicate: (query) => String(query.queryKey[0] ?? '').startsWith(prefix),
  })
}

/**
 * Every cache a structural write can invalidate — phases, scenarios, paths,
 * lanes, cells, arrows, slices.
 *
 * One list rather than a hand-rolled subset at each mutation site. The subsets
 * had already drifted five ways: the delete dialog cleared six keys, the
 * rename and create-version paths four, the duplicate menu three, and the
 * session sheet's revert two — so reverting a `duplicate_path` left a ghost
 * row in the paths catalog whose id 404s, and `staleTime: Infinity` means a
 * missed key stays stale until a reload rather than until the next refetch.
 *
 * Over-invalidating is a refetch of data that is already correct; missing a
 * key is a screen that lies. Prefix matches are no-ops for the kinds they do
 * not apply to, so the whole set is cheap enough to always send.
 */
const STRUCTURE_KEYS = [
  'service-phases',
  'canvas-blueprints',
  'scenario-paths',
  'lane-sources',
  'slices',
  // A slice's own detail is keyed separately, and a cascade can empty it.
  'slice:',
] as const

export function invalidateStructure(): void {
  for (const prefix of STRUCTURE_KEYS) invalidateQueries(prefix)
}
