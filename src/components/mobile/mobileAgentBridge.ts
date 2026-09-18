import type { AgentUiBridge } from '@/lib/agent/uiBridge'
import { awaitPublishedJump } from '@/lib/canvasJump'

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
  watchCameraFlight = (_targetId, commit) => commit(),
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
   * back once the move has landed. It is handed the selection rather than
   * called beside it: the verdict is published by the fit the selection
   * triggers, so the jump has to be listening before that selection commits.
   *
   * Defaults to committing the selection and watching nothing, which is what a
   * shell with no sheet to hand a caret back to wants.
   */
  watchCameraFlight?: (targetId: string, commit: () => void) => void
}): AgentUiBridge {
  /*
    A jump with the sheet CLOSED has no composer to hand the caret back to.
    Arming a watcher for it would leave a 2s timer running for a sheet nobody
    can see; the gate lives here, in the module that is the agent's hands, so
    the path is pinned by a unit test rather than by a shell nothing renders
    in a test.
  */
  const jump = (targetId: string, select: (id: string) => void) => {
    if (!isAgentOpen()) {
      select(targetId)
      return
    }
    watchCameraFlight(targetId, () => select(targetId))
  }
  return {
    selectPhase: (phaseId) => jump(phaseId, selectPhase),
    selectScenario: (scenarioId) => jump(scenarioId, selectScenario),
    openAgentSurface: openAgent,
    setSidebarCollapsed: () =>
      'The mobile shell has no sidebar — navigation lives in the menu drawer, which the reader opens themselves.',
  }
}

export type AgentCameraFlightWatch = {
  /** Once, when the move has settled or the deadline says nobody answered. */
  onSettled: () => void
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
 * the caret from then on, and the first flight's verdict — which arrives the
 * moment the second selection supersedes it — must leave the caret alone
 * while the canvas is still moving.
 *
 * The handshake itself belongs to `canvasJump`: arming, the deadline, the
 * detach and the four verdict words all live there. Which word it answered in
 * is deliberately NOT passed on: the caret goes back to the composer for
 * every one of them, and a parameter nothing reads is a parameter the next
 * reader has to check before they can trust the branch they are writing.
 */
export function makeAgentCameraFlightWatcher({ onSettled }: AgentCameraFlightWatch) {
  let generation = 0
  return function watch(targetId: string, commit: () => void): Promise<void> {
    const token = ++generation
    return awaitPublishedJump(targetId, commit).then(() => {
      if (token !== generation) return
      onSettled()
    })
  }
}
