import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  JUMP_DEADLINE_MS,
  awaitPublishedJump,
  awaitSelfAnsweringJump,
  settleJump,
  verdictOfFlight,
} from '@/lib/canvasJump'

describe('a jump answers in one verdict', () => {
  beforeEach(() => vi.useFakeTimers())
  afterEach(() => vi.useRealTimers())

  it('lands when the canvas says the fit completed', async () => {
    const jump = awaitPublishedJump('scen-1', () =>
      settleJump('scen-1', 'landed'),
    )
    await expect(jump).resolves.toBe('landed')
  })

  it('answers cancelled when a reader takes the camera back', async () => {
    const jump = awaitPublishedJump('scen-1', () =>
      settleJump('scen-1', 'cancelled'),
    )
    await expect(jump).resolves.toBe('cancelled')
  })

  it('answers superseded when a newer destination owns the camera', async () => {
    const jump = awaitPublishedJump('scen-1', () =>
      settleJump('scen-1', 'superseded'),
    )
    await expect(jump).resolves.toBe('superseded')
  })

  /*
    The verdict that exists today only as silence. The canvas may let go of a
    flight without answering for it, and a canvas that is gone for good
    publishes nothing at all; the deadline is what turns that silence into a
    word an agent can report honestly.
  */
  it('answers unanswered when the deadline passes with no verdict', async () => {
    const jump = awaitPublishedJump('scen-1', () => {})
    let settled: unknown
    void jump.then((result) => {
      settled = result
    })

    await vi.advanceTimersByTimeAsync(JUMP_DEADLINE_MS - 1)
    expect(settled).toBeUndefined()

    await vi.advanceTimersByTimeAsync(1)
    await expect(jump).resolves.toBe('unanswered')
  })

  it('answers only for its own target', async () => {
    const jump = awaitPublishedJump('scenario-a', () => {
      settleJump('scenario-b', 'landed')
      settleJump('scenario-a', 'superseded')
    })
    await expect(jump).resolves.toBe('superseded')
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
    const jump = awaitPublishedJump('scen-1', () => {
      settleJump('scen-1', 'landed')
      listening = true
    })
    expect(listening).toBe(true)
    await expect(jump).resolves.toBe('landed')
  })

  /*
    WHAT THIS DOES NOT PROVE, said plainly so nobody retires the test that
    does. The relinquish-then-remount hand-off — a viewport leaving the tree
    mid-flight while the destination is unchanged, publishing nothing, and a
    second mount landing the SAME target — is guarded SOLELY by the React
    harness case `hands a flight to the next mount instead of cancelling it on
    unmount` in `src/hooks/useZoomPanViewport.cameraFlight.test.tsx`.
    Only that harness owns a real unmount and a real remount; from here,
    letting go is indistinguishable from any other silence, because it IS the
    absence of a call. So this case asserts the one thing the module can be
    held to: a waiting jump is still attached after time has passed with no
    verdict, so a later publisher can still answer it. Deleting the harness
    case on the strength of this one would leave the fixed behaviour unguarded.
  */
  it('stays attached while nothing answers, so a later publisher still reaches it', async () => {
    const jump = awaitPublishedJump('scen-1', () => {})
    let settled: unknown
    void jump.then((result) => {
      settled = result
    })
    await vi.advanceTimersByTimeAsync(400)
    expect(settled).toBeUndefined()

    settleJump('scen-1', 'landed')
    await expect(jump).resolves.toBe('landed')
  })

  it('detaches once answered, so a later verdict reaches nobody', async () => {
    const jump = awaitPublishedJump('scen-1', () =>
      settleJump('scen-1', 'landed'),
    )
    await expect(jump).resolves.toBe('landed')

    expect(() => settleJump('scen-1', 'cancelled')).not.toThrow()
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
    const jump = await awaitSelfAnsweringJump(
      () => Promise.resolve({ completion: 'completed' as const }),
      (answer) => verdictOfFlight(answer.completion),
    )
    expect(jump).toEqual({
      verdict: 'landed',
      answer: { completion: 'completed' },
    })
  })

  /*
    A result that is no flight at all — a cell the board does not hold. It
    answered, so the answer is there to read; nothing flew, so there is no
    verdict, and it borrows none. It used to borrow `cancelled`, which reads
    as a flight taken back from something that never left the ground.
  */
  it('carries a settled answer that is no flight, under no verdict at all', async () => {
    const jump = await awaitSelfAnsweringJump(
      () => ({ kind: 'miss' as const }),
      () => null,
    )
    expect(jump).toEqual({ verdict: null, answer: { kind: 'miss' } })
  })

  it('answers unanswered when the commit never settles', async () => {
    const jump = awaitSelfAnsweringJump(
      () => new Promise<{ completion: 'completed' }>(() => {}),
      (answer) => verdictOfFlight(answer.completion),
    )
    await vi.advanceTimersByTimeAsync(JUMP_DEADLINE_MS)
    // No `answer: null` beside it: silence carries no answer, because the arm
    // of the union that is silence has no answer field to fill in.
    await expect(jump).resolves.toEqual({ verdict: 'unanswered' })
  })
})
