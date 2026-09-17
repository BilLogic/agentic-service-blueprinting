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
  function harness() {
    const selectPhase = vi.fn()
    const selectScenario = vi.fn()
    const openAgent = vi.fn()
    const bridge = makeMobileAgentBridge({
      selectPhase,
      selectScenario,
      openAgent,
    })
    return { bridge, selectPhase, selectScenario, openAgent }
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

  it('setSidebarCollapsed reports honestly that no sidebar exists', () => {
    const h = harness()
    const result = h.bridge.setSidebarCollapsed(true)
    expect(typeof result).toBe('string')
    expect(result).toMatch(/no sidebar/)
    expect(h.selectPhase).not.toHaveBeenCalled()
  })
})

/*
  The sheet stays open across an agent-driven jump and stands its scrim down
  instead. What the watcher owes: the wash comes back exactly once the canvas
  says it landed, it comes back even when nothing ever says so, and a second
  jump mid-flight owns the scrim from then on.
*/
describe('makeAgentCameraFlightWatcher', () => {
  beforeEach(() => vi.useFakeTimers())
  afterEach(() => vi.useRealTimers())

  function harness() {
    const outcomes = new Map<string, (value: unknown) => void>()
    const cancels: string[] = []
    const setFlying = vi.fn()
    const onSettled = vi.fn()
    const watch = makeAgentCameraFlightWatcher({
      awaitOutcome: (targetId) => ({
        promise: new Promise((resolve) => outcomes.set(targetId, resolve)),
        cancel: () => cancels.push(targetId),
      }),
      setFlying,
      onSettled,
    })
    return { watch, outcomes, cancels, setFlying, onSettled }
  }

  it('clears the scrim for the flight and restores it on the canvas verdict', async () => {
    const h = harness()
    const flight = h.watch('scen-1')
    expect(h.setFlying).toHaveBeenLastCalledWith(true)
    expect(h.onSettled).not.toHaveBeenCalled()

    h.outcomes.get('scen-1')?.({ kind: 'completed' })
    await flight

    expect(h.setFlying).toHaveBeenLastCalledWith(false)
    // The caret goes back so the reader keeps typing without a tap.
    expect(h.onSettled).toHaveBeenCalledTimes(1)
    expect(h.cancels).toEqual(['scen-1'])
  })

  it('restores the scrim on the deadline when no verdict ever arrives', async () => {
    const h = harness()
    const flight = h.watch('phase-1')
    expect(h.setFlying).toHaveBeenLastCalledWith(true)

    await vi.advanceTimersByTimeAsync(AGENT_CAMERA_FLIGHT_DEADLINE_MS - 1)
    expect(h.setFlying).not.toHaveBeenCalledWith(false)

    await vi.advanceTimersByTimeAsync(1)
    await flight
    expect(h.setFlying).toHaveBeenLastCalledWith(false)
    expect(h.onSettled).toHaveBeenCalledTimes(1)
  })

  it('lets a superseding jump keep the scrim down through the first verdict', async () => {
    const h = harness()
    const first = h.watch('scen-1')
    const second = h.watch('scen-2')

    h.outcomes.get('scen-1')?.({ kind: 'superseded' })
    await first
    // The canvas is still moving towards the second target: the stale verdict
    // must not put the wash back over it.
    expect(h.setFlying).not.toHaveBeenCalledWith(false)
    expect(h.onSettled).not.toHaveBeenCalled()

    h.outcomes.get('scen-2')?.({ kind: 'completed' })
    await second
    expect(h.setFlying).toHaveBeenLastCalledWith(false)
    expect(h.onSettled).toHaveBeenCalledTimes(1)
  })
})
