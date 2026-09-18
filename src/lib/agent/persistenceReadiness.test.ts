// @vitest-environment jsdom
/**
 * READINESS, PINNED WITHOUT A REACT HARNESS.
 *
 * The failure this module exists to prevent is an ordering one, and ordering
 * is exactly what a render test is worst at stating: the effects that lose the
 * race live in two different files, and a harness that mounts both proves the
 * symptom at one remove. So the ordering is asserted here, directly — work
 * handed over before a client is attached, then the attach, then what ran and
 * in what order. The only thing mounted anywhere below is the pending hook
 * itself, one render at a time, because the raw reader is deliberately not
 * exported: the hook IS the way a surface asks, so it is what gets asserted.
 *
 * The client is a bare marker object wherever the query itself is not the
 * subject. Nothing in the parking half of this module dereferences it;
 * whether it can answer a query is `throughAgentPersistence`'s business, and
 * the last block below is where that is pinned.
 */
import { beforeEach, describe, expect, it } from 'vitest'
import { renderHook } from '@testing-library/react'
import {
  attachAgentPersistence,
  forgetAgentPersistenceWork,
  throughAgentPersistence,
  useAgentPersistenceWorkPending,
  whenAgentPersistenceReady,
  type AgentPersistenceWork,
} from '@/lib/agent/persistenceReadiness'

/** Enough of a client to be non-null; see the file header. */
const CLIENT = {} as Parameters<typeof attachAgentPersistence>[0]

const work = (id: string): AgentPersistenceWork => ({ kind: 'transcript', id })
const FIRST = work('first')
const SECOND = work('second')
const THIRD = work('third')
const ONLY = work('only')
const HANDLES = [FIRST, SECOND, THIRD, ONLY, work('session'), {
  kind: 'session-list' as const,
  id: 'session',
}]

/**
 * The pending answer as a surface gets it: one render, read, unmount. A
 * fresh mount per assertion keeps this a reader rather than a subscription
 * whose updates would need scheduling around.
 */
function pending(target: AgentPersistenceWork): boolean {
  const { result, unmount } = renderHook(() =>
    useAgentPersistenceWorkPending(target),
  )
  const answer = result.current
  unmount()
  return answer
}

beforeEach(() => {
  attachAgentPersistence(null)
  HANDLES.forEach(forgetAgentPersistenceWork)
})

describe('work parked before persistence attaches', () => {
  it('runs once the client lands, in the order it was parked', async () => {
    const ran: string[] = []
    whenAgentPersistenceReady(FIRST, () => {
      ran.push('first')
    })
    whenAgentPersistenceReady(SECOND, () => {
      ran.push('second')
    })
    whenAgentPersistenceReady(THIRD, () => {
      ran.push('third')
    })
    // Nothing has run: there is nothing to read from yet, and the point of
    // parking is that the one read per handle is not spent on that.
    expect(ran).toEqual([])

    attachAgentPersistence(CLIENT)

    expect(ran).toEqual(['first', 'second', 'third'])
  })

  it('is not run twice — not by a second ask, not by a second attach', () => {
    let runs = 0
    whenAgentPersistenceReady(ONLY, () => {
      runs += 1
    })
    // The surface asks again on every render and every reopen; that must not
    // replay a read over a conversation that is already on screen.
    whenAgentPersistenceReady(ONLY, () => {
      runs += 1
    })
    attachAgentPersistence(CLIENT)
    expect(runs).toBe(1)

    attachAgentPersistence(null)
    attachAgentPersistence(CLIENT)
    whenAgentPersistenceReady(ONLY, () => {
      runs += 1
    })
    expect(runs).toBe(1)
  })

  it('runs straight away when a client is already attached', () => {
    attachAgentPersistence(CLIENT)
    let ran = false
    whenAgentPersistenceReady(ONLY, () => {
      ran = true
    })
    expect(ran).toBe(true)
  })

  it('keeps two KINDS of work about one session apart, so neither is dropped', () => {
    // The handle is a kind and an id, not a bare session id. Under a bare id
    // these two are the same ask, and the once-per-handle rule silently drops
    // the second: it never runs, and its pending answer settles for a read
    // that never happened.
    const ran: string[] = []
    whenAgentPersistenceReady({ kind: 'transcript', id: 'session' }, () => {
      ran.push('transcript')
    })
    whenAgentPersistenceReady({ kind: 'session-list', id: 'session' }, () => {
      ran.push('session-list')
    })

    attachAgentPersistence(CLIENT)

    expect(ran).toEqual(['transcript', 'session-list'])
  })

  it('runs every parked ask when the client lands, however many parked', () => {
    // There used to be a cap here, evicting the oldest parked entry. The
    // oldest is the wrong one to drop: child effects park before their
    // panel's, so it is the open conversation's transcript, and dropping it
    // leaves that surface outstanding for the life of the page — a skeleton
    // bubbling in a chat nobody is going to re-ask for. The map is unbounded
    // instead; what it holds is one closure per surface opened in a tab with
    // no database behind it.
    const ran: string[] = []
    const ids = Array.from({ length: 40 }, (_, index) => `s${index}`)
    ids.forEach((id) =>
      whenAgentPersistenceReady(work(id), () => {
        ran.push(id)
      }),
    )

    attachAgentPersistence(CLIENT)

    expect(ran).toEqual(ids)
    ids.forEach((id) => forgetAgentPersistenceWork(work(id)))
  })
})

describe('the pending answer', () => {
  it('reads pending before the ask, through the park, and until the work settles', async () => {
    // Before anything asks: the window where the panel is mounted and its
    // effect has not run. A settled answer here is the empty state flashing.
    expect(pending(ONLY)).toBe(true)

    let release: () => void = () => undefined
    whenAgentPersistenceReady(
      ONLY,
      () => new Promise<void>((resolve) => (release = resolve)),
    )
    expect(pending(ONLY)).toBe(true)

    attachAgentPersistence(CLIENT)
    // On the wire now, still not an answer.
    expect(pending(ONLY)).toBe(true)

    release()
    await Promise.resolve()
    await Promise.resolve()
    expect(pending(ONLY)).toBe(false)
  })

  it('settles even when the work throws — a read that failed is a read that happened', async () => {
    attachAgentPersistence(CLIENT)
    whenAgentPersistenceReady(ONLY, () => {
      throw new Error('no policy on that table')
    })
    await Promise.resolve()
    await Promise.resolve()
    expect(pending(ONLY)).toBe(false)
  })
})

describe('forgetting a handle', () => {
  it('re-arms the ask, which is how a reopen proves a read rather than a memory', async () => {
    attachAgentPersistence(CLIENT)
    let runs = 0
    const ask = () =>
      whenAgentPersistenceReady(ONLY, () => {
        runs += 1
      })
    ask()
    ask()
    expect(runs).toBe(1)

    forgetAgentPersistenceWork(ONLY)
    expect(pending(ONLY)).toBe(true)
    ask()
    expect(runs).toBe(2)
  })

  it('drops work still parked, so a forgotten session never hydrates late', () => {
    let ran = false
    whenAgentPersistenceReady(ONLY, () => {
      ran = true
    })
    forgetAgentPersistenceWork(ONLY)
    attachAgentPersistence(CLIENT)
    expect(ran).toBe(false)
  })

  it('does not let the abandoned flight settle the ask that replaced it', async () => {
    attachAgentPersistence(CLIENT)
    let releaseFirst: () => void = () => undefined
    whenAgentPersistenceReady(
      ONLY,
      () => new Promise<void>((resolve) => (releaseFirst = resolve)),
    )

    forgetAgentPersistenceWork(ONLY)
    whenAgentPersistenceReady(ONLY, () => new Promise<void>(() => undefined))

    // The first flight comes back AFTER the forget. Letting it settle the
    // handle drops the skeleton for a conversation whose real read is still
    // on the wire.
    releaseFirst()
    await Promise.resolve()
    await Promise.resolve()
    expect(pending(ONLY)).toBe(true)
  })
})

describe('a query through the attached client', () => {
  it('answers null with nothing attached, without calling the query', async () => {
    let called = false
    const answer = await throughAgentPersistence(() => {
      called = true
      return Promise.resolve({ data: ['row'], error: null })
    })
    expect(answer).toBeNull()
    expect(called).toBe(false)
  })

  it('answers the rows when the query comes back, and null when it errors', async () => {
    attachAgentPersistence(CLIENT)
    expect(
      await throughAgentPersistence(() =>
        Promise.resolve({ data: ['row'], error: null }),
      ),
    ).toEqual(['row'])
    expect(
      await throughAgentPersistence(() =>
        Promise.resolve({ data: null, error: new Error('no policy') }),
      ),
    ).toBeNull()
  })

  it('answers null when the builder throws on the spot', async () => {
    // Built outside the chain, a synchronous throw escapes past the caller's
    // `void` and reaches the window as an unhandled error rather than the
    // quiet degradation every caller here is written for.
    attachAgentPersistence(CLIENT)
    await expect(
      throughAgentPersistence(() => {
        throw new Error('no such table')
      }),
    ).resolves.toBeNull()
  })
})
