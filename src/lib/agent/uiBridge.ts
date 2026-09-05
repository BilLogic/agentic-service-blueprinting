import { resolveActiveFocusCells } from '@/lib/canvasFocusCells'

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

/**
 * Wait for the shell to report the target selected AND the canvas camera
 * idle. The camera is read from its own contributor line, not the whole
 * joined blob — a stray ", idle" or "(id)" in another surface's text must
 * not pass this. The fit that follows a selection is SCHEDULED (a settle
 * loop plus a 250 ms backstop in useZoomPanViewport), so an idle camera in
 * the first poll after the selection lands is "the ease has not started",
 * not "the ease finished": accept idle only after the camera was seen
 * moving, or after the backstop window has elapsed with nothing scheduled.
 */
const NAVIGATION_DEADLINE_MS = 1800
const FIT_BACKSTOP_GRACE_MS = 300
const SELECTED_LINE: Record<'phase' | 'scenario', string> = {
  phase: 'Selected phase',
  scenario: 'Selected scenario',
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

async function waitForNavigation(
  kind: 'phase' | 'scenario',
  id: string,
): Promise<boolean> {
  const selectedLine = new RegExp(
    `^${SELECTED_LINE[kind]}: .*\\(${escapeRegExp(id)}\\)$`,
    'm',
  )
  const cameraLine = /^Canvas camera: .*?, (moving|idle)\b/m
  const deadline = performance.now() + NAVIGATION_DEADLINE_MS
  let selectedAt: number | null = null
  let sawMoving = false
  while (performance.now() < deadline) {
    const now = performance.now()
    const context = collectAgentUiContext()
    const selected = selectedLine.test(context)
    if (selected && selectedAt === null) selectedAt = now
    const camera = cameraLine.exec(context)?.[1] ?? null
    if (camera === 'moving') sawMoving = true
    const settled =
      document.hidden ||
      camera === null ||
      (camera === 'idle' &&
        (sawMoving ||
          (selectedAt !== null && now - selectedAt >= FIT_BACKSTOP_GRACE_MS)))
    if (selected && settled) return true
    await new Promise((done) => setTimeout(done, 25))
  }
  return false
}

export async function agentOpenPhase(phaseId: string): Promise<string> {
  if (!bridge) return 'UI navigation is not available right now.'
  bridge.selectPhase(phaseId)
  return (await waitForNavigation('phase', phaseId))
    ? 'Opened the phase and settled its canvas camera.'
    : 'Phase navigation started, but the selected phase and settled camera were not verified before timeout.'
}

export async function agentOpenScenario(scenarioId: string): Promise<string> {
  if (!bridge) return 'UI navigation is not available right now.'
  bridge.selectScenario(scenarioId)
  return (await waitForNavigation('scenario', scenarioId))
    ? 'Opened the scenario and settled its canvas camera.'
    : 'Scenario navigation started, but the selected scenario and settled camera were not verified before timeout.'
}

export function openAgentSurface(): boolean {
  if (!bridge) return false
  bridge.openAgentSurface()
  return true
}

/**
 * A camera fly resolves from a `requestAnimationFrame` step, and a hidden
 * tab suspends those — the promise would never settle and the agent loop
 * (a bare await, no abort wired to tool execution) would wedge with it.
 * So: no animation when hidden (the fit commits synchronously), and a
 * deadline on the wait regardless. A timeout is reported as unverified,
 * never as landed.
 */
const FOCUS_DEADLINE_MS = 1500
const FOCUS_TIMED_OUT = Symbol('focus-timed-out')

export async function agentFocusCell(cellId: string): Promise<string> {
  const focus = resolveActiveFocusCells()
  if (!focus)
    return 'No active canvas camera is available right now — open the scenario first.'
  const result = await Promise.race([
    focus([cellId], { animate: !document.hidden }),
    new Promise<typeof FOCUS_TIMED_OUT>((done) =>
      setTimeout(() => done(FOCUS_TIMED_OUT), FOCUS_DEADLINE_MS),
    ),
  ])
  if (result === FOCUS_TIMED_OUT)
    return 'The camera focus started but was not verified before timeout; the cell was not claimed as landed.'
  if (result.kind === 'miss')
    return 'That cell is not on the active canvas — open its scenario first, then retry.'
  if (result.completion !== 'completed')
    return `The camera focus was ${result.completion}; the cell was not claimed as landed.`
  return 'Focused the active canvas camera on the cell.'
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
  // Bring the cell into view first, best-effort: a fly that was superseded
  // (the scenario's landing fit, a resize refit, a user gesture) or timed
  // out is a CAMERA outcome, not a reason to withhold the click — the cell
  // is rendered and clickable either way. The camera note rides along on
  // the result so the agent does not claim a landing that did not happen.
  const focusResult = await agentFocusCell(cellId)
  const cameraNote = focusResult.startsWith('Focused') ? '' : ` Camera: ${focusResult}`
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
  const deadline = performance.now() + 1000
  while (
    !document.hidden &&
    !hasAgentUiContext('cell-panel') &&
    performance.now() < deadline
  ) {
    await new Promise((done) => setTimeout(done, 25))
  }
  if (document.hidden || hasAgentUiContext('cell-panel'))
    return `Opened the cell detail panel.${cameraNote}`
  return `The click landed but the panel did not open. Likely causes: the hand (pan) tool is active — ask the user to switch tools — or the cell sits in a dimmed phase under focus mode. The panel is NOT open; do not claim it is.${cameraNote}`
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
