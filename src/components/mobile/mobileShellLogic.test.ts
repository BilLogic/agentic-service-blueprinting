import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  AGENT_CAMERA_FLIGHT_DEADLINE_MS,
  agentFlightBackdropClass,
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

  /*
    A flight lasts as long as the canvas takes, not one tick of it. The clear
    read as a flicker when a verdict landed within ~150 ms of the jump —
    early, because the mount that armed the target was answering for a flight
    it had already let go of — so this pins the shape of the wait itself: the
    scrim stays down across every beat of a slow flight and comes back on the
    verdict, not before.
  */
  it('holds the scrim down for the whole flight, not the first tick of it', async () => {
    const h = harness()
    const flight = h.watch('scen-1')

    for (const beat of [100, 300, 600, 900]) {
      await vi.advanceTimersByTimeAsync(beat)
      expect(h.setFlying).not.toHaveBeenCalledWith(false)
      expect(h.onSettled).not.toHaveBeenCalled()
    }

    h.outcomes.get('scen-1')?.({ kind: 'completed' })
    await flight
    expect(h.setFlying).toHaveBeenLastCalledWith(false)
    // Exactly once: the wash is put back by one hand, whichever exit ran.
    expect(h.setFlying.mock.calls.filter(([flying]) => !flying)).toHaveLength(1)
    expect(h.onSettled).toHaveBeenCalledTimes(1)
  })
})

/*
  The scrim is one state in both directions. The flag decides it, the two
  properties are written together, and the transition that carries them is
  declared whether or not the scrim is cleared — a transition named only in
  the cleared state fades the wash back in with the pass-through already
  surrendered, which is the invisible-surface-eating-a-tap hazard again with
  the sign flipped.
*/
describe('agentFlightBackdropClass', () => {
  const washed = agentFlightBackdropClass(false)
  const cleared = agentFlightBackdropClass(true)

  it('clears opacity and hit-testing in the same class list, or neither', () => {
    expect(cleared).toContain('opacity-0')
    expect(cleared).toContain('pointer-events-none')
    expect(washed).not.toContain('opacity-0')
    expect(washed).not.toContain('pointer-events-none')
  })

  it('transitions both properties together, in both states', () => {
    for (const state of [washed, cleared]) {
      expect(state).toContain('transition-[opacity,pointer-events]')
      // Discrete transitions are what move `pointer-events` on the same
      // clock as the fade rather than in the frame the class lands.
      expect(state).toContain('transition-discrete')
    }
  })

  it('drops the blur with the wash, under the prefix the blur was written with', () => {
    expect(cleared).toContain('supports-backdrop-filter:backdrop-blur-none')
  })
})
