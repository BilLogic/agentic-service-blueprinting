import type { AgentUiBridge } from '@/lib/agent/uiBridge'

/**
 * The agent's navigation hands on mobile, pure and in a leaf module so the
 * handlers can be pinned by a node unit test without dragging the shell's
 * `?raw` import graph in. The phone shows the same canvas as desktop, so
 * phase and scenario opens are plain selections — the camera move is the
 * surface change. The ✦ sheet is the agent surface. The sidebar tool has
 * no sidebar to drive here and SAYS SO — the returned message overrides
 * `agentSetSidebar`'s default success claim (closes todo 027's
 * dishonest-stub item).
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
