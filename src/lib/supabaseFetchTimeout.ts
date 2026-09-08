/** Stop blocking the UI if Supabase is unreachable or very slow. */
export const SUPABASE_FETCH_TIMEOUT_MS = 10_000

/**
 * A read that passed its deadline. A named class rather than a bare `Error`
 * so the query client can tell "this attempt was too slow" (worth one more
 * attempt) from "the database said no" (retrying would just repeat it).
 */
export class SupabaseTimeoutError extends Error {
  constructor(message = 'The request timed out') {
    super(message)
    this.name = 'SupabaseTimeoutError'
  }
}

/**
 * Run one read under a deadline, and **abort** it when the deadline passes.
 *
 * This used to be a `Promise.race` between the request and a timer. Racing
 * only decides which answer the caller sees: the losing request stayed on the
 * wire, arrived, and was parsed and dropped — on the connection that was
 * already too slow, which is the connection that could least afford it. The
 * timer had the same shape in reverse: nothing cleared it, so a request that
 * answered in 200ms still held a 10s timer.
 *
 * `signal` is the caller's own cancellation (TanStack hands one to every
 * `queryFn`); it is chained into the controller so unmounting a view or
 * changing a key aborts the request too. `run` must pass the signal it is
 * given to the request — a fetcher that ignores it is back to racing.
 */
export async function withSupabaseTimeout<T>(
  signal: AbortSignal | undefined,
  run: (signal: AbortSignal) => PromiseLike<T>,
  timeoutMs: number = SUPABASE_FETCH_TIMEOUT_MS,
): Promise<T> {
  const controller = new AbortController()
  const forward = () => controller.abort(signal?.reason)
  if (signal?.aborted) forward()
  else signal?.addEventListener('abort', forward)

  let timedOut = false
  const timer = setTimeout(() => {
    timedOut = true
    controller.abort()
  }, timeoutMs)

  try {
    return await run(controller.signal)
  } catch (error) {
    // The request rejects because the signal fired; only this scope knows
    // whether that was the deadline or the caller walking away.
    if (timedOut) throw new SupabaseTimeoutError()
    throw error
  } finally {
    clearTimeout(timer)
    signal?.removeEventListener('abort', forward)
  }
}
