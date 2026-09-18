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
  isAgentOpen = () => false,
  watchCameraFlight = () => {},
}: {
  selectPhase: (phaseId: string) => void
  selectScenario: (scenarioId: string) => void
  openAgent: () => void
  /**
   * Whether the agent sheet is showing, asked at the moment of the jump
   * rather than captured when the bridge was built — the bridge is
   * registered once and the sheet opens and closes under it.
   *
   * Defaults to closed, which is the conservative answer: a caller that
   * never wired a sheet gets the behaviour of a shell that has none.
   */
  isAgentOpen?: () => boolean
  /**
   * Watch the camera for this target so the open sheet can hand the caret
   * back once the move has landed. Called BEFORE the selection commits,
   * because the outcome is published by the fit the selection triggers and a
   * watcher attached afterwards can miss it.
   */
  watchCameraFlight?: (targetId: string) => void
}): AgentUiBridge {
  /*
    A jump with the sheet CLOSED has no composer to hand the caret back to.
    Arming a watcher for it would leave a 2s timer running for a sheet nobody
    can see; the gate lives here, in the module that is the agent's hands, so
    the path is pinned by a unit test rather than by a shell nothing renders
    in a test.
  */
  const jump = (targetId: string, select: (id: string) => void) => {
    if (isAgentOpen()) watchCameraFlight(targetId)
    select(targetId)
  }
  return {
    selectPhase: (phaseId) => jump(phaseId, selectPhase),
    selectScenario: (scenarioId) => jump(scenarioId, selectScenario),
    openAgentSurface: openAgent,
    setSidebarCollapsed: () =>
      'The mobile shell has no sidebar — navigation lives in the menu drawer, which the reader opens themselves.',
  }
}

/**
 * How long the watcher waits for a verdict before handing the caret back
 * anyway.
 *
 * A camera that never publishes an outcome is an ordinary state, not a bug —
 * a phase whose scenario never rendered, a background tab whose
 * `requestAnimationFrame` is suspended mid-flight. Without a deadline the
 * watcher's promise stays pending and the reader never gets the caret back,
 * so they are left typing into nothing after a jump they asked for in words.
 * Set past the agent tool's own 1800 ms wait so the hand-back does not race
 * the sentence the agent is about to write.
 */
export const AGENT_CAMERA_FLIGHT_DEADLINE_MS = 2000

export type AgentCameraFlightWatch = {
  /** The canvas's verdict for this semantic target, and a way to stop listening. */
  awaitOutcome: (targetId: string) => {
    promise: Promise<unknown>
    cancel: () => void
  }
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
 * the caret from then on, and the first flight's late verdict must not pull
 * focus back to the composer while the canvas is still moving.
 */
export function makeAgentCameraFlightWatcher({
  awaitOutcome,
  onSettled,
  deadlineMs = AGENT_CAMERA_FLIGHT_DEADLINE_MS,
}: AgentCameraFlightWatch) {
  let generation = 0
  return function watch(targetId: string): Promise<void> {
    const token = ++generation
    // Listen BEFORE the selection commits: the outcome is published from the
    // fit the selection triggers, and a waiter attached afterwards can miss it.
    const outcome = awaitOutcome(targetId)
    // The loser of the race is cleaned up either way: a verdict that arrives
    // first leaves a live 2s timer behind, and every superseded jump leaves
    // another, so a reader jumping around the board accumulates them.
    let deadline: ReturnType<typeof setTimeout> | undefined
    return Promise.race([
      outcome.promise,
      new Promise<void>((done) => {
        deadline = setTimeout(done, deadlineMs)
      }),
    ]).then(() => {
      clearTimeout(deadline)
      outcome.cancel()
      if (token !== generation) return
      onSettled()
    })
  }
}
