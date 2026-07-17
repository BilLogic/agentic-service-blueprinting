/** Stop blocking the UI if Supabase is unreachable or very slow. */
export const SUPABASE_FETCH_TIMEOUT_MS = 10_000

export function raceSupabaseQuery<T>(
  query: PromiseLike<T>,
  timeoutMs: number = SUPABASE_FETCH_TIMEOUT_MS,
): Promise<T | 'timeout'> {
  return Promise.race([
    Promise.resolve(query),
    new Promise<'timeout'>((resolve) => {
      window.setTimeout(() => resolve('timeout'), timeoutMs)
    }),
  ])
}
