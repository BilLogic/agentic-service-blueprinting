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
       * the key changes or a mutation calls `invalidateQueries`.
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
 * mounted ones. Mounted hooks keep serving their last value while the refetch
 * is in flight.
 *
 * Keys are single-element string arrays, so this is a prefix match on element
 * zero rather than TanStack's usual structural key matching — it preserves
 * `'canvas-blueprints:scenario:<id>'`-style namespacing.
 */
export function invalidateQueries(prefix: string): void {
  void queryClient.invalidateQueries({
    predicate: (query) => String(query.queryKey[0] ?? '').startsWith(prefix),
  })
}

/**
 * Every cache a structural write (create/delete/duplicate/rename of phases,
 * scenarios, paths, lanes) can invalidate. One list rather than a hand-rolled
 * subset at each mutation site — over-invalidating is a refetch of data that
 * is already correct; missing a key is a screen that lies. Prefix matches are
 * no-ops for the kinds they do not apply to, so the whole set is cheap enough
 * to always send.
 *
 * A new read hook that caches under a new prefix MUST register that prefix
 * here, or structural writes will leave it stale until a reload
 * (`staleTime: Infinity` never expires on its own).
 */
const STRUCTURE_KEYS = [
  'lifecycle-phases',
  'canvas-blueprints',
  'slices',
  // A slice's own detail is keyed separately, and a cascade can empty it.
  'slice:',
] as const

export function invalidateStructure(): void {
  for (const prefix of STRUCTURE_KEYS) invalidateQueries(prefix)
}
