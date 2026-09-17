import type { AgentUiBridge } from '@/lib/agent/uiBridge'

/**
 * The agent's navigation hands on mobile, pure and in a leaf module so the
 * handlers can be pinned by a node unit test without dragging the shell's
 * `?raw` import graph in. The phone shows the same canvas as desktop, so
 * phase and scenario opens are plain selections — the camera move is the
 * surface change. The ✦ sheet is the agent surface. The sidebar tool has
 * no sidebar to drive here and SAYS SO — the returned message overrides
 * `agentSetSidebar`'s default success claim.
 */
export function makeMobileAgentBridge({
  selectPhase,
  selectScenario,
  openAgent,
}: {
  selectPhase: (phaseId: string) => void
  selectScenario: (scenarioId: string) => void
  openAgent: () => void
}): AgentUiBridge {
  return {
    selectPhase,
    selectScenario,
    openAgentSurface: openAgent,
    setSidebarCollapsed: () =>
      'The mobile shell has no sidebar — navigation lives in the menu drawer, which the reader opens themselves.',
  }
}

/**
 * How long the sheet will hold its scrim down waiting for a verdict.
 *
 * The wash MUST come back. A camera that never publishes an outcome is an
 * ordinary state, not a bug — a phase whose scenario never rendered, a
 * background tab whose `requestAnimationFrame` is suspended mid-flight — and
 * a backdrop with no deadline would stay cleared for the rest of the session,
 * leaving the conversation floating over a live canvas it no longer owns.
 * Set past the agent tool's own 1800 ms wait so the sheet is still standing
 * aside when the agent reports what happened.
 */
export const AGENT_CAMERA_FLIGHT_DEADLINE_MS = 2000

export type AgentCameraFlightWatch = {
  /** The canvas's verdict for this semantic target, and a way to stop listening. */
  awaitOutcome: (targetId: string) => {
    promise: Promise<unknown>
    cancel: () => void
  }
  /** True while the camera is moving — the sheet's scrim reads it. */
  setFlying: (flying: boolean) => void
  /** Once, when the move has settled or the deadline says to stop waiting. */
  onSettled: () => void
  deadlineMs?: number
}

/**
 * Watches an agent-driven jump so the sheet can stand aside for exactly as
 * long as the canvas is moving.
 *
 * The read runs ONE WAY, which is the whole reason this is a watcher and not
 * a shared clock: the canvas publishes where it got to, the shell decides
 * what to do about it, and nothing on the canvas waits on the shell in
 * return. The two halves keep their own clocks on purpose, and a canvas rung
 * that waited on a shell state would close the loop around the half the
 * reader is actually watching.
 *
 * Stateful because jumps supersede: a second target arriving mid-flight owns
 * the scrim from then on, and the first flight's late verdict must not put
 * the wash back over a canvas that is still moving.
 */
export function makeAgentCameraFlightWatcher({
  awaitOutcome,
  setFlying,
  onSettled,
  deadlineMs = AGENT_CAMERA_FLIGHT_DEADLINE_MS,
}: AgentCameraFlightWatch) {
  let generation = 0
  return function watch(targetId: string): Promise<void> {
    const token = ++generation
    // Listen BEFORE the selection commits: the outcome is published from the
    // fit the selection triggers, and a waiter attached afterwards can miss it.
    const outcome = awaitOutcome(targetId)
    setFlying(true)
    return Promise.race([
      outcome.promise,
      new Promise<void>((done) => setTimeout(done, deadlineMs)),
    ]).then(() => {
      outcome.cancel()
      if (token !== generation) return
      setFlying(false)
      onSettled()
    })
  }
}
