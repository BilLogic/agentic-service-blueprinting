import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  JUMP_DEADLINE_MS,
  awaitAnsweredJump,
  awaitJump,
  settleJump,
  verdictOfFlight,
} from '@/lib/canvasJump'

const transform = { pan: { x: 12, y: 4 }, zoom: 0.8 }

describe('a jump answers in one verdict', () => {
  beforeEach(() => vi.useFakeTimers())
  afterEach(() => vi.useRealTimers())

  it('lands when the canvas says the fit completed', async () => {
    const jump = awaitJump('scen-1', () =>
      settleJump('scen-1', 'landed', transform),
    )
    await expect(jump).resolves.toEqual({ verdict: 'landed', transform })
  })

  it('answers cancelled when a reader takes the camera back', async () => {
    const jump = awaitJump('scen-1', () =>
      settleJump('scen-1', 'cancelled', transform),
    )
    await expect(jump).resolves.toMatchObject({ verdict: 'cancelled' })
  })

  it('answers superseded when a newer destination owns the camera', async () => {
    const jump = awaitJump('scen-1', () =>
      settleJump('scen-1', 'superseded', transform),
    )
    await expect(jump).resolves.toMatchObject({ verdict: 'superseded' })
  })

  /*
    The verdict that exists today only as silence. The canvas may let go of a
    flight without answering for it, and a canvas that is gone for good
    publishes nothing at all; the deadline is what turns that silence into a
    word an agent can report honestly.
  */
  it('answers unanswered when the deadline passes with no verdict', async () => {
    const jump = awaitJump('scen-1', () => {})
    let settled: unknown
    void jump.then((result) => {
      settled = result
    })

    await vi.advanceTimersByTimeAsync(JUMP_DEADLINE_MS - 1)
    expect(settled).toBeUndefined()

    await vi.advanceTimersByTimeAsync(1)
    await expect(jump).resolves.toEqual({
      verdict: 'unanswered',
      transform: null,
    })
  })

  it('answers only for its own target', async () => {
    const jump = awaitJump('scenario-a', () => {
      settleJump('scenario-b', 'landed', transform)
      settleJump('scenario-a', 'superseded', transform)
    })
    await expect(jump).resolves.toMatchObject({ verdict: 'superseded' })
  })

  /*
    The ordering bug that shipped twice, now impossible to write: the verdict
    is published by the fit the selection triggers, so a waiter attached after
    the selection commits can miss it entirely. The module holds the order —
    the commit runs with the waiter already listening, and a verdict published
    inside the commit itself still reaches the caller.
  */
  it('is already listening while the commit runs', async () => {
    let listening = false
    const jump = awaitJump('scen-1', () => {
      settleJump('scen-1', 'landed', transform)
      listening = true
    })
    expect(listening).toBe(true)
    await expect(jump).resolves.toMatchObject({ verdict: 'landed' })
  })

  /*
    The relinquish-then-remount hand-off, as a plain assertion. A viewport can
    leave the tree mid-flight while the destination the reader asked for is
    unchanged — a freshly opened scenario's path filter resolves a beat after
    the selection, the board falls to its no-paths state, and the canvas
    remounts and refits the SAME target. Letting go publishes nothing, so the
    waiter is still listening when the mount that took the camera over answers.
  */
  it('hands a flight to the next mount when a viewport lets go of it', async () => {
    // Letting go is publishing nothing at all — the whole of what the dying
    // viewport does, and the whole of what this asserts.
    const jump = awaitJump('scen-1', () => {})
    let settled: unknown
    void jump.then((result) => {
      settled = result
    })
    await vi.advanceTimersByTimeAsync(400)
    expect(settled).toBeUndefined()

    settleJump('scen-1', 'landed', transform)
    await expect(jump).resolves.toMatchObject({ verdict: 'landed' })
  })

  it('detaches once answered, so a later verdict reaches nobody', async () => {
    const jump = awaitJump('scen-1', () =>
      settleJump('scen-1', 'landed', transform),
    )
    await expect(jump).resolves.toMatchObject({ verdict: 'landed' })

    expect(() =>
      settleJump('scen-1', 'cancelled', transform),
    ).not.toThrow()
    // And the deadline timer went with it: an answered jump leaves no timer
    // behind, so a reader jumping around the board accumulates none.
    expect(vi.getTimerCount()).toBe(0)
  })

  it('reads the canvas flight vocabulary into verdict words', () => {
    expect(verdictOfFlight('completed')).toBe('landed')
    expect(verdictOfFlight('cancelled')).toBe('cancelled')
    expect(verdictOfFlight('superseded')).toBe('superseded')
  })
})

/*
  A cell focus answers for itself: the viewport hands its flight result back
  through the call rather than publishing it against a target. Same deadline,
  same four words — the shape of the answer is the only difference.
*/
describe('a jump whose commit answers for itself', () => {
  beforeEach(() => vi.useFakeTimers())
  afterEach(() => vi.useRealTimers())

  it('reads the verdict off the answer the commit returned', async () => {
    const jump = await awaitAnsweredJump(
      () => Promise.resolve({ completion: 'completed' as const }),
      (answer) => verdictOfFlight(answer.completion),
    )
    expect(jump).toEqual({
      verdict: 'landed',
      answer: { completion: 'completed' },
    })
  })

  it('carries a settled answer that is no flight at all', async () => {
    const jump = await awaitAnsweredJump(
      () => ({ kind: 'miss' as const }),
      () => 'cancelled' as const,
    )
    expect(jump.answer).toEqual({ kind: 'miss' })
  })

  it('answers unanswered when the commit never settles', async () => {
    const jump = awaitAnsweredJump(
      () => new Promise<{ completion: 'completed' }>(() => {}),
      (answer) => verdictOfFlight(answer.completion),
    )
    await vi.advanceTimersByTimeAsync(JUMP_DEADLINE_MS)
    await expect(jump).resolves.toEqual({
      verdict: 'unanswered',
      answer: null,
    })
  })
})
