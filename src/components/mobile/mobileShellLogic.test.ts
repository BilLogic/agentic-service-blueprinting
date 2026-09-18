import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  makeAgentCameraFlightWatcher,
  makeMobileAgentBridge,
} from '@/components/mobile/mobileAgentBridge'
import { JUMP_DEADLINE_MS, settleJump } from '@/lib/canvasJump'

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
      watchCameraFlight: (id, commit) => {
        order.push('watch')
        watchCameraFlight(id)
        commit()
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
    The sheet stays open across an agent-driven jump, so the jump has to watch
    the camera to know when to hand the caret back to the composer. With the
    sheet CLOSED there is no composer to hand it back to, and arming the
    watcher anyway would leave a deadline timer and a settle callback behind
    for a surface nobody can see.
  */
  it('watches the camera for an open sheet, and the watch owns the selection', () => {
    const h = harness({ agentOpen: true })
    h.bridge.selectScenario('scen-1')
    expect(h.watchCameraFlight).toHaveBeenCalledWith('scen-1')
    expect(h.selectScenario).toHaveBeenCalledWith('scen-1')
    // The verdict is published by the fit the selection triggers, so the jump
    // is handed the selection and commits it once it is already listening.
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
    const onSettled = vi.fn()
    return { watch: makeAgentCameraFlightWatcher({ onSettled }), onSettled }
  }

  it('commits the selection it was handed, then waits', () => {
    const h = harness()
    const commit = vi.fn()
    void h.watch('scen-1', commit)
    expect(commit).toHaveBeenCalledTimes(1)
    expect(h.onSettled).not.toHaveBeenCalled()
  })

  it('hands the caret back when the canvas says it landed', async () => {
    const h = harness()
    const flight = h.watch('scen-1', () => {})

    settleJump('scen-1', 'landed')
    await flight
    expect(h.onSettled).toHaveBeenCalledTimes(1)
  })

  it('hands the caret back on the deadline when no verdict ever arrives', async () => {
    const h = harness()
    const flight = h.watch('scen-1', () => {})

    await vi.advanceTimersByTimeAsync(JUMP_DEADLINE_MS - 1)
    expect(h.onSettled).not.toHaveBeenCalled()

    await vi.advanceTimersByTimeAsync(1)
    await flight
    // The caret comes back on silence too: a camera nobody answered for is
    // no reason to keep holding the reader's keyboard.
    expect(h.onSettled).toHaveBeenCalledTimes(1)
  })

  /*
    A verdict for a flight that has been superseded is a verdict about a
    camera that is no longer moving where the reader is looking. Taking focus
    on it would pull the caret mid-move, so the generation guard drops it.
  */
  it("ignores a superseded flight's verdict and answers only for the latest", async () => {
    const h = harness()
    const first = h.watch('scen-1', () => {})
    const second = h.watch('scen-2', () => {})

    settleJump('scen-1', 'superseded')
    await first
    expect(h.onSettled).not.toHaveBeenCalled()

    settleJump('scen-2', 'landed')
    await second
    expect(h.onSettled).toHaveBeenCalledTimes(1)
  })
})
