/**
 * The read path's three promises: a deadline that actually cancels, a view
 * that stops paying for the reads it walked away from, and a timed-out query
 * that can come back without a reload.
 *
 * Driven through `QueryObserver` rather than a rendered hook — subscribing and
 * unsubscribing IS mounting and unmounting as far as the query layer is
 * concerned, and it needs no DOM.
 */
import { QueryClient, QueryObserver } from '@tanstack/react-query'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { QUERY_DEFAULTS } from '@/lib/queryClient'
import {
  SUPABASE_FETCH_TIMEOUT_MS,
  SupabaseTimeoutError,
  withSupabaseTimeout,
} from '@/lib/supabaseFetchTimeout'
import { sliceScenarioKey } from '@/hooks/useSliceScenarioId'

/** A request that never answers on its own — only its signal ends it. */
function pending(signal: AbortSignal): Promise<never> {
  return new Promise((_resolve, reject) => {
    signal.addEventListener('abort', () => reject(new Error('aborted')))
  })
}

function newClient(): QueryClient {
  return new QueryClient({ defaultOptions: { queries: QUERY_DEFAULTS } })
}

describe('withSupabaseTimeout', () => {
  beforeEach(() => vi.useFakeTimers())
  afterEach(() => vi.useRealTimers())

  it('aborts the request at the deadline instead of leaving it running', async () => {
    let seen: AbortSignal | undefined
    const promise = withSupabaseTimeout(undefined, (signal) => {
      seen = signal
      return pending(signal)
    })

    // Asserted before the clock moves: attaching the expectation afterwards
    // leaves the rejection unhandled for a tick, which vitest reports as a
    // failure of the whole file.
    const settled = expect(promise).rejects.toBeInstanceOf(SupabaseTimeoutError)
    await vi.advanceTimersByTimeAsync(SUPABASE_FETCH_TIMEOUT_MS)

    await settled
    expect(seen?.aborted).toBe(true)
  })

  it('does not leave the timer running after the request answers', async () => {
    await withSupabaseTimeout(undefined, async () => 'answered')
    expect(vi.getTimerCount()).toBe(0)
  })

  it("forwards the caller's own cancellation to the request", async () => {
    const controller = new AbortController()
    let seen: AbortSignal | undefined
    const promise = withSupabaseTimeout(controller.signal, (signal) => {
      seen = signal
      return pending(signal)
    })

    // Not a timeout: nothing was too slow, the caller left.
    const settled = expect(promise).rejects.not.toBeInstanceOf(
      SupabaseTimeoutError,
    )
    controller.abort()

    await settled
    expect(seen?.aborted).toBe(true)
    expect(vi.getTimerCount()).toBe(0)
  })
})

describe('query cancellation', () => {
  it('unmounting the last observer aborts the read it started', async () => {
    const client = newClient()
    let seen: AbortSignal | undefined
    const observer = new QueryObserver(client, {
      queryKey: ['leaving-view'],
      queryFn: ({ signal }) => {
        seen = signal
        return pending(signal)
      },
    })
    const unsubscribe = observer.subscribe(() => {})
    await vi.waitFor(() => expect(seen).toBeDefined())

    unsubscribe()

    await vi.waitFor(() => expect(seen?.aborted).toBe(true))
    client.clear()
  })

  it('changing the key aborts the superseded request', async () => {
    const client = newClient()
    const signals: AbortSignal[] = []
    const observer = new QueryObserver(client, {
      queryKey: ['scenario:first'],
      queryFn: ({ signal }) => {
        signals.push(signal)
        return pending(signal)
      },
    })
    const unsubscribe = observer.subscribe(() => {})
    await vi.waitFor(() => expect(signals).toHaveLength(1))

    observer.setOptions({
      queryKey: ['scenario:second'],
      queryFn: ({ signal }) => {
        signals.push(signal)
        return pending(signal)
      },
    })

    await vi.waitFor(() => expect(signals[0].aborted).toBe(true))
    expect(signals[1].aborted).toBe(false)
    unsubscribe()
    client.clear()
  })
})

describe('recovering from a timed-out read', () => {
  it('retries once after a deadline and settles on the real answer', async () => {
    const client = newClient()
    let attempts = 0
    const observer = new QueryObserver<string>(client, {
      queryKey: ['slow-then-fine'],
      retryDelay: 0,
      queryFn: async () => {
        attempts += 1
        if (attempts === 1) throw new SupabaseTimeoutError()
        return 'the real answer'
      },
    })
    const unsubscribe = observer.subscribe(() => {})

    await vi.waitFor(() =>
      expect(observer.getCurrentResult().data).toBe('the real answer'),
    )
    expect(attempts).toBe(2)
    expect(observer.getCurrentResult().error).toBeNull()
    unsubscribe()
    client.clear()
  })

  it('does not retry an answer that would come back the same', async () => {
    const client = newClient()
    let attempts = 0
    const observer = new QueryObserver(client, {
      queryKey: ['refused'],
      retryDelay: 0,
      queryFn: async () => {
        attempts += 1
        throw new Error('permission denied')
      },
    })
    const unsubscribe = observer.subscribe(() => {})

    await vi.waitFor(() =>
      expect(observer.getCurrentResult().error).toBeInstanceOf(Error),
    )
    expect(attempts).toBe(1)
    unsubscribe()
    client.clear()
  })
})

describe('cache retention', () => {
  it('keeps responses fresh forever but does not keep them forever', () => {
    expect(QUERY_DEFAULTS.staleTime).toBe(Infinity)
    expect(Number.isFinite(QUERY_DEFAULTS.gcTime)).toBe(true)
    expect(QUERY_DEFAULTS.gcTime).toBeGreaterThan(0)
  })
})

describe('sliceScenarioKey', () => {
  it('gives every permutation of the same cells one key', () => {
    expect(sliceScenarioKey(['c', 'a', 'b'])).toBe(sliceScenarioKey(['a', 'b', 'c']))
  })

  it('still tells different cell sets apart', () => {
    expect(sliceScenarioKey(['a', 'b'])).not.toBe(sliceScenarioKey(['a', 'c']))
  })

  it('does not reorder the caller’s own array', () => {
    const ids = ['c', 'a']
    sliceScenarioKey(ids)
    expect(ids).toEqual(['c', 'a'])
  })
})
