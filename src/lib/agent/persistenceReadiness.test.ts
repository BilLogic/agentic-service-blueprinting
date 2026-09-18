/**
 * READINESS, PINNED WITHOUT A REACT HARNESS.
 *
 * The failure this module exists to prevent is an ordering one, and ordering
 * is exactly what a render test is worst at stating: the effects that lose the
 * race live in two different files, and a harness that mounts both proves the
 * symptom at one remove. So the ordering is asserted here, directly — work
 * handed over before a client is attached, then the attach, then what ran and
 * in what order.
 *
 * The client is a bare marker object. Nothing in this module dereferences it;
 * whether it can answer a query is the reading module's business, and pinning
 * that here would pin the wrong thing.
 */
import { beforeEach, describe, expect, it } from 'vitest'
import {
  agentPersistenceWorkPending,
  attachAgentPersistence,
  attachedAgentClient,
  forgetAgentPersistenceWork,
  whenAgentPersistenceReady,
} from '@/lib/agent/persistenceReadiness'

/** Enough of a client to be non-null; see the file header. */
const CLIENT = {} as Parameters<typeof attachAgentPersistence>[0]

const KEYS = ['first', 'second', 'third', 'only']

beforeEach(() => {
  attachAgentPersistence(null)
  KEYS.forEach(forgetAgentPersistenceWork)
})

describe('work parked before persistence attaches', () => {
  it('runs once the client lands, in the order it was parked', async () => {
    const ran: string[] = []
    whenAgentPersistenceReady('first', () => {
      ran.push('first')
    })
    whenAgentPersistenceReady('second', () => {
      ran.push('second')
    })
    whenAgentPersistenceReady('third', () => {
      ran.push('third')
    })
    // Nothing has run: there is nothing to read from yet, and the point of
    // parking is that the one read per key is not spent on that.
    expect(ran).toEqual([])

    attachAgentPersistence(CLIENT)

    expect(ran).toEqual(['first', 'second', 'third'])
  })

  it('is not run twice — not by a second ask, not by a second attach', () => {
    let runs = 0
    whenAgentPersistenceReady('only', () => {
      runs += 1
    })
    // The surface asks again on every render and every reopen; that must not
    // replay a read over a conversation that is already on screen.
    whenAgentPersistenceReady('only', () => {
      runs += 1
    })
    attachAgentPersistence(CLIENT)
    expect(runs).toBe(1)

    attachAgentPersistence(null)
    attachAgentPersistence(CLIENT)
    whenAgentPersistenceReady('only', () => {
      runs += 1
    })
    expect(runs).toBe(1)
  })

  it('runs straight away when a client is already attached', () => {
    attachAgentPersistence(CLIENT)
    let ran = false
    whenAgentPersistenceReady('only', () => {
      ran = true
    })
    expect(ran).toBe(true)
  })
})

describe('the pending answer', () => {
  it('reads pending before the ask, through the park, and until the work settles', async () => {
    // Before anything asks: the window where the panel is mounted and its
    // effect has not run. A settled answer here is the empty state flashing.
    expect(agentPersistenceWorkPending('only')).toBe(true)

    let release: () => void = () => undefined
    whenAgentPersistenceReady(
      'only',
      () => new Promise<void>((resolve) => (release = resolve)),
    )
    expect(agentPersistenceWorkPending('only')).toBe(true)

    attachAgentPersistence(CLIENT)
    // On the wire now, still not an answer.
    expect(agentPersistenceWorkPending('only')).toBe(true)

    release()
    await Promise.resolve()
    await Promise.resolve()
    expect(agentPersistenceWorkPending('only')).toBe(false)
  })

  it('settles even when the work throws — a read that failed is a read that happened', async () => {
    attachAgentPersistence(CLIENT)
    whenAgentPersistenceReady('only', () => {
      throw new Error('no policy on that table')
    })
    await Promise.resolve()
    await Promise.resolve()
    expect(agentPersistenceWorkPending('only')).toBe(false)
  })
})

describe('forgetting a key', () => {
  it('re-arms the ask, which is how a reopen proves a read rather than a memory', async () => {
    attachAgentPersistence(CLIENT)
    let runs = 0
    const ask = () =>
      whenAgentPersistenceReady('only', () => {
        runs += 1
      })
    ask()
    ask()
    expect(runs).toBe(1)

    forgetAgentPersistenceWork('only')
    expect(agentPersistenceWorkPending('only')).toBe(true)
    ask()
    expect(runs).toBe(2)
  })

  it('drops work still parked, so a forgotten session never hydrates late', () => {
    let ran = false
    whenAgentPersistenceReady('only', () => {
      ran = true
    })
    forgetAgentPersistenceWork('only')
    attachAgentPersistence(CLIENT)
    expect(ran).toBe(false)
  })
})

describe('the attached client', () => {
  it('is null until something attaches, and null again once it detaches', () => {
    expect(attachedAgentClient()).toBeNull()
    attachAgentPersistence(CLIENT)
    expect(attachedAgentClient()).toBe(CLIENT)
    attachAgentPersistence(null)
    expect(attachedAgentClient()).toBeNull()
  })
})
