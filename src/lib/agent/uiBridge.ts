import { scrollBlueprintCellIntoView } from '@/lib/blueprintCellConnections'

/**
 * The agent's hands on the UI itself — camera and navigation, not data.
 * The shell registers the editor's navigation callbacks here so the tool
 * layer (plain functions, no React) can drive them when the user says
 * "take me to the sample scenario".
 *
 * Deliberately tiny: navigation only. Anything that *changes* data goes
 * through the write tools; moving the camera is free.
 */
export type AgentUiBridge = {
  selectPhase: (phaseId: string) => void
  selectScenario: (scenarioId: string) => void
  /** Open the ✦ agent surface (used by hand-offs into the chat). */
  openAgentSurface: () => void
}

let bridge: AgentUiBridge | null = null

export function registerAgentUiBridge(next: AgentUiBridge): () => void {
  bridge = next
  return () => {
    if (bridge === next) bridge = null
  }
}

export function agentOpenPhase(phaseId: string): string {
  if (!bridge) return 'UI navigation is not available right now.'
  bridge.selectPhase(phaseId)
  return 'Opened the phase on the canvas.'
}

export function agentOpenScenario(scenarioId: string): string {
  if (!bridge) return 'UI navigation is not available right now.'
  bridge.selectScenario(scenarioId)
  return 'Opened the scenario on the canvas.'
}

export function openAgentSurface(): boolean {
  if (!bridge) return false
  bridge.openAgentSurface()
  return true
}

export function agentFocusCell(cellId: string): string {
  // Works only when the cell is mounted on the current canvas — the tool
  // description tells the model to open the scenario first.
  scrollBlueprintCellIntoView(cellId)
  return 'Scrolled the canvas to the cell (it must be on the open scenario to be visible).'
}

// ---------------------------------------------------------------------------
// UI context — the read side of the bridge. Scattered surfaces (shell,
// viewport, cell panel) each register a contributor that describes their
// live state in a line or two; the agent loop and the get_ui_state tool
// collect them all. Module registry, so the tool layer needs no React.
// ---------------------------------------------------------------------------

type UiContextContributor = () => string | null

const contributors = new Map<string, UiContextContributor>()

export function registerAgentUiContext(
  key: string,
  contributor: UiContextContributor,
): () => void {
  contributors.set(key, contributor)
  return () => {
    if (contributors.get(key) === contributor) contributors.delete(key)
  }
}

/** Presence probe — contributors register while their surface state exists. */
export function hasAgentUiContext(key: string): boolean {
  return contributors.has(key)
}

/** All registered contributors' lines, empty string when nothing reports. */
export function collectAgentUiContext(): string {
  const lines: string[] = []
  for (const contributor of contributors.values()) {
    try {
      const line = contributor()
      if (line) lines.push(line)
    } catch {
      // A broken contributor should never take the send down with it.
    }
  }
  return lines.join('\n')
}
