import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  AGENT_CAMERA_FLIGHT_DEADLINE_MS,
  makeAgentCameraFlightWatcher,
  makeMobileAgentBridge,
} from '@/components/mobile/mobileAgentBridge'

// Pins the agent bridge's handlers: the phone shows ONE surface (the shared
// canvas, decided 2026-08-17), so phase and scenario opens are plain
// selections — the camera move IS the surface change. No setSurface hand
// exists anymore; this test pins that simplification.
describe('makeMobileAgentBridge', () => {
  function harness({ agentOpen = false }: { agentOpen?: boolean } = {}) {
    const selectPhase = vi.fn()
    const selectScenario = vi.fn()
    const openAgent = vi.fn()
    const watchCameraFlight = vi.fn()
    const order: string[] = []
    const bridge = makeMobileAgentBridge({
      selectPhase: (id) => {
        order.push('select')
        selectPhase(id)
      },
      selectScenario: (id) => {
        order.push('select')
        selectScenario(id)
      },
      openAgent,
      isAgentOpen: () => agentOpen,
      watchCameraFlight: (id) => {
        order.push('watch')
        watchCameraFlight(id)
      },
    })
    return {
      bridge,
      selectPhase,
      selectScenario,
      openAgent,
      watchCameraFlight,
      order,
    }
  }

  it('phase opens select the phase and nothing else', () => {
    const h = harness()
    h.bridge.selectPhase('phase-1')
    expect(h.selectPhase).toHaveBeenCalledWith('phase-1')
    expect(h.selectScenario).not.toHaveBeenCalled()
    expect(h.openAgent).not.toHaveBeenCalled()
  })

  it('scenario opens select the scenario and nothing else', () => {
    const h = harness()
    h.bridge.selectScenario('scen-1')
    expect(h.selectScenario).toHaveBeenCalledWith('scen-1')
    expect(h.selectPhase).not.toHaveBeenCalled()
    expect(h.openAgent).not.toHaveBeenCalled()
  })

  it('openAgentSurface opens the agent and touches nothing else', () => {
    const h = harness()
    h.bridge.openAgentSurface()
    expect(h.openAgent).toHaveBeenCalledTimes(1)
    expect(h.selectPhase).not.toHaveBeenCalled()
    expect(h.selectScenario).not.toHaveBeenCalled()
  })

  /*
    The sheet stays open across an agent-driven jump, so the jump has to tell
    the sheet the camera is moving. With the sheet CLOSED there is no scrim to
    clear and no composer to hand the caret back to, and arming the watcher
    anyway would leave a deadline timer and a pair of state writes behind for
    a surface nobody can see.
  */
  it('watches the camera for an open sheet, before the selection commits', () => {
    const h = harness({ agentOpen: true })
    h.bridge.selectScenario('scen-1')
    expect(h.watchCameraFlight).toHaveBeenCalledWith('scen-1')
    expect(h.selectScenario).toHaveBeenCalledWith('scen-1')
    // The outcome is published by the fit the selection triggers: a watcher
    // attached after it can miss the verdict entirely.
    expect(h.order).toEqual(['watch', 'select'])
  })

  it('watches the camera for an open sheet on a phase jump too', () => {
    const h = harness({ agentOpen: true })
    h.bridge.selectPhase('phase-1')
    expect(h.watchCameraFlight).toHaveBeenCalledWith('phase-1')
    expect(h.order).toEqual(['watch', 'select'])
  })

  it('arms no watcher for a jump with the sheet closed', () => {
    const h = harness({ agentOpen: false })
    h.bridge.selectScenario('scen-1')
    h.bridge.selectPhase('phase-1')
    expect(h.watchCameraFlight).not.toHaveBeenCalled()
    // And the jump itself is untouched: closed behaves exactly as before.
    expect(h.selectScenario).toHaveBeenCalledWith('scen-1')
    expect(h.selectPhase).toHaveBeenCalledWith('phase-1')
  })

  it('treats an unwired shell as one with no sheet', () => {
    // The default answer is "closed" — a caller that wired no sheet must not
    // get flight bookkeeping for one.
    const selectScenario = vi.fn()
    const bridge = makeMobileAgentBridge({
      selectPhase: vi.fn(),
      selectScenario,
      openAgent: vi.fn(),
    })
    expect(() => bridge.selectScenario('scen-1')).not.toThrow()
    expect(selectScenario).toHaveBeenCalledWith('scen-1')
  })

  it('setSidebarCollapsed reports honestly that no sidebar exists', () => {
    const h = harness()
    const result = h.bridge.setSidebarCollapsed(true)
    expect(typeof result).toBe('string')
    expect(result).toMatch(/no sidebar/)
    expect(h.selectPhase).not.toHaveBeenCalled()
  })
})

/*
  The sheet stays open across an agent-driven jump and its scrim never moves,
  so the watcher has one job left: give the caret back once the canvas has
  settled. What it owes is that the hand-back happens once, happens even when
  no verdict ever arrives, and belongs to the LATEST jump — a first flight's
  late verdict must not steal focus while a second is still moving.
*/
describe('makeAgentCameraFlightWatcher', () => {
  beforeEach(() => vi.useFakeTimers())
  afterEach(() => vi.useRealTimers())

  function harness() {
    const outcomes = new Map<string, (value: unknown) => void>()
    const cancels: string[] = []
    const onSettled = vi.fn()
    const watch = makeAgentCameraFlightWatcher({
      awaitOutcome: (targetId) => ({
        promise: new Promise((resolve) => outcomes.set(targetId, resolve)),
        cancel: () => cancels.push(targetId),
      }),
      onSettled,
    })
    return { watch, outcomes, cancels, onSettled }
  }

  it('hands the caret back when the canvas says it landed', async () => {
    const h = harness()
    const flight = h.watch('scen-1')
    expect(h.onSettled).not.toHaveBeenCalled()

    h.outcomes.get('scen-1')?.({ kind: 'completed' })
    await flight
    expect(h.onSettled).toHaveBeenCalledTimes(1)
    // The waiter is detached either way, or every jump leaves one attached.
    expect(h.cancels).toEqual(['scen-1'])
  })

  it('hands the caret back on the deadline when no verdict ever arrives', async () => {
    const h = harness()
    const flight = h.watch('scen-1')

    await vi.advanceTimersByTimeAsync(AGENT_CAMERA_FLIGHT_DEADLINE_MS - 1)
    expect(h.onSettled).not.toHaveBeenCalled()

    await vi.advanceTimersByTimeAsync(1)
    await flight
    expect(h.onSettled).toHaveBeenCalledTimes(1)
  })

  /*
    A verdict for a flight that has been superseded is a verdict about a
    camera that is no longer moving where the reader is looking. Taking focus
    on it would pull the caret mid-move, so the generation guard drops it.
  */
  it('ignores a superseded flight is verdict and answers only for the latest', async () => {
    const h = harness()
    const first = h.watch('scen-1')
    const second = h.watch('scen-2')

    h.outcomes.get('scen-1')?.({ kind: 'superseded' })
    await first
    expect(h.onSettled).not.toHaveBeenCalled()

    h.outcomes.get('scen-2')?.({ kind: 'completed' })
    await second
    expect(h.onSettled).toHaveBeenCalledTimes(1)
  })

  it('waits out a slow flight rather than answering on its first tick', async () => {
    const h = harness()
    const flight = h.watch('scen-1')

    for (const beat of [100, 300, 600, 900]) {
      await vi.advanceTimersByTimeAsync(beat)
      expect(h.onSettled).not.toHaveBeenCalled()
    }

    h.outcomes.get('scen-1')?.({ kind: 'completed' })
    await flight
    expect(h.onSettled).toHaveBeenCalledTimes(1)
  })
})
