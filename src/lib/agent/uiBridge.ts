import { scrollBlueprintCellIntoView } from '@/lib/blueprintCellConnections'

/**
 * The agent's hands on the UI itself — camera and navigation, not data.
 * The shell registers the editor's navigation callbacks here so the tool
 * lane (plain functions, no React) can drive them when the user says
 * "take me to the intake scenario".
 *
 * Deliberately tiny: navigation only. Anything that *changes* data goes
 * through the write tools and the ledger; moving the camera is free.
 */
export type AgentUiBridge = {
  selectPhase: (phaseId: string) => void
  selectScenario: (scenarioId: string) => void
  /** Open the ✦ sidebar surface (used by "Send to the agent" hand-offs). */
  openAgentSurface: () => void
  /**
   * Collapse/expand the sidebar. A shell with no sidebar to drive returns
   * its own honest message instead of letting the default "Sidebar
   * collapsed." claim success for a no-op (todo 027).
   */
  setSidebarCollapsed: (collapsed: boolean) => void | string
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
  // summary tells the model to open the scenario first.
  scrollBlueprintCellIntoView(cellId)
  return 'Scrolled the canvas to the cell (it must be on the open scenario to be visible).'
}

export function agentSetSidebar(collapsed: boolean): string {
  if (!bridge) return 'UI control is not available right now.'
  const override = bridge.setSidebarCollapsed(collapsed)
  if (typeof override === 'string') return override
  return collapsed ? 'Sidebar collapsed.' : 'Sidebar expanded.'
}

/**
 * Open the cell detail panel by driving the SAME gesture the human uses:
 * a ⌘-click on the rendered cell (the grammar's "open detail, touch
 * nothing" move, valid in every mode). No parallel code path to drift —
 * and the result is VERIFIED, not assumed: the tool checks the panel
 * actually mounted and says so honestly when it didn't.
 *
 * Sharing the human's handler means sharing its toggle: a bare click on the
 * cell the panel is already showing now CLOSES it. This stays an open, not a
 * toggle, and `detailClickCloses` refuses twice over — ⌘-click is never the
 * close gesture, and the dispatched event's `isTrusted` is false. Opening a
 * cell that is already open must leave it open; an agent asked to show
 * something and hiding it instead is the worst possible reading of the tool.
 */
export async function agentOpenCellPanel(cellId: string): Promise<string> {
  const el = document.querySelector<HTMLElement>(
    `[data-blueprint-cell="${CSS.escape(cellId)}"][data-blueprint-cell-interactive]`,
  )
  if (!el)
    return 'That cell is not clickable on the current canvas — open its scenario first (open_scenario), then retry.'
  scrollBlueprintCellIntoView(cellId)
  // ⌘-click is the grammar's "open detail, touch nothing" gesture — it works
  // identically in view and design mode (a bare click PICKS when a picker is
  // armed, and dblclick deliberately does nothing).
  el.dispatchEvent(
    new MouseEvent('click', { bubbles: true, cancelable: true, metaKey: true }),
  )
  // Verify instead of assuming: the cell-detail context registers its
  // selection-scoped `cell-panel` UI-context contributor only while a cell
  // is actually selected, so its presence IS "the panel opened on a cell".
  // The panel's UI *commands* are the wrong probe now that the drawer can
  // be open on the ledger with no selection — they would false-positive.
  // (Headless panes defer the open past document.hidden — don't false-fail
  // there.)
  await new Promise((done) => setTimeout(done, 250))
  if (document.hidden || hasAgentUiContext('cell-panel'))
    return 'Opened the cell detail panel.'
  return 'The click landed but the panel did not open. Likely causes: the hand (pan) tool is active — ask the user to switch tools — or the cell sits in a dimmed phase under focus mode. The panel is NOT open; do not claim it is.'
}

// The annotator lives with the annotation provider (it owns stroke state
// and colors); registered like the nav bridge.
type AgentAnnotator = (cellIds: string[], note?: string) => string

let annotator: AgentAnnotator | null = null

export function registerAgentAnnotator(next: AgentAnnotator): () => void {
  annotator = next
  return () => {
    if (annotator === next) annotator = null
  }
}

export function agentAnnotateCells(cellIds: string[], note?: string): string {
  if (!annotator)
    return 'No annotatable canvas is open right now — open a scenario first.'
  return annotator(cellIds, note)
}

// ---------------------------------------------------------------------------
// UI context — the read side of the bridge. Scattered surfaces (shell,
// canvas viewport, cell panel, design-mode picker) each register a
// contributor that describes their live state in a line or two; the agent
// panel and the get_ui_state tool collect them all. Same shape as the
// navigation bridge: module registry, so the tool lane needs no React.
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

/** Presence probe — contributors register while their surface state exists,
 * so "the `cell-panel` contributor exists" IS "a cell is open in the panel". */
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
