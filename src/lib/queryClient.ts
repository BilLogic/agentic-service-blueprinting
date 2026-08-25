import { QueryClient } from '@tanstack/react-query'

/**
 * Module-level client so `invalidateQueries` can stay a plain function call at
 * mutation sites rather than a hook — the app has exactly one client and no
 * SSR, which is the case where a module singleton is safe.
 */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      /*
       * Blueprint data is edited through explicit mutations, never by another
       * client, so there is nothing to poll for: a tab switch should reuse the
       * cached response rather than refetch. Revalidation is explicit — either
       * the key changes (reload tokens baked into keys, e.g. `useEvidence`) or
       * a mutation calls `invalidateQueries`.
       */
      staleTime: Infinity,
      gcTime: Infinity,
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
      /*
       * `raceSupabaseQuery` already bounds each attempt with a timeout, and a
       * failed read falls back to the bundled fixture rather than blocking the
       * UI. Retrying would just delay that fallback by the retry schedule.
       */
      retry: false,
    },
  },
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
