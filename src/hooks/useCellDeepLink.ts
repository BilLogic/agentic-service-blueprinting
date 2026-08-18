import { useCallback, useEffect, useRef, useState } from 'react'
import { useEditor } from '@/contexts/EditorContext'
import { useViewState } from '@/contexts/viewStateStore'
import { useSupabaseQuery } from '@/hooks/useSupabaseQuery'
import { agentOpenCellPanel } from '@/lib/agent/uiBridge'
import { findFallbackScenarioForCells } from '@/lib/sliceCells'

/**
 * `?cell=<id>` — open the blueprint on one cell, panel showing.
 *
 * This is the receiving end of the share link: the agent cites a cell in chat
 * or the IDE and attaches this URL, so the reader lands on the thing that was
 * quoted instead of on the homepage with a cell id to hunt for.
 *
 * Three steps, because a cell id alone is not a place: resolve the cell to its
 * scenario, seed the base view there, then open the panel by driving the SAME
 * ⌘-click gesture the agent's `open_cell_panel` uses — one open path, no
 * parallel implementation to drift from the click grammar.
 *
 * `seedBaseSelection` (not `selectScenario`) is deliberate: it no-ops once the
 * user has navigated, so a slow resolve cannot yank someone away from a place
 * they chose while the query was in flight.
 */

/** The cell can mount several frames after the scenario does (canvas fit,
 *  deferred skeletons). Poll rather than guess a delay, and give up loudly. */
const OPEN_POLL_MS = 150
/**
 * How long the link may keep hunting for its cell once the scenario is up.
 * Deliberately short: this window ends with a panel opening under the user's
 * thumb, so a link that has not resolved in a few seconds has lost its claim
 * on their attention. Ten seconds was long enough to feel like the app acting
 * on its own, seconds after the user had moved on.
 */
const OPEN_TIMEOUT_MS = 3_000

export function useCellDeepLink(): void {
  const { pendingUrlState } = useViewState()
  const { seedBaseSelection, selectedScenarioId } = useEditor()

  // Captured at mount, not watched: `resolvePending` clears pendingUrlState as
  // soon as the slice list loads, which is typically before the cell query
  // returns. The boot URL is already parsed by the time this first renders
  // (`createInitialViewState` runs in the reducer initializer), so the
  // initializer sees it.
  const [cellId] = useState<string | null>(() =>
    pendingUrlState?.kind === 'blueprint' ? (pendingUrlState.cellId ?? null) : null,
  )

  const fallback = useCallback(
    () => (cellId ? findFallbackScenarioForCells([cellId]) : null),
    [cellId],
  )

  const scenario = useSupabaseQuery<string>(
    cellId === null ? null : `cell-deep-link:${cellId}`,
    async (client) => {
      const { data, error } = await client
        .from('cells')
        .select('id, paths(service_scenario_id)')
        .eq('id', cellId as string)
        .maybeSingle()
      if (error) throw new Error(error.message)

      const scenarioId = data?.paths?.service_scenario_id
      if (scenarioId) return scenarioId

      // Cells may exist only in the local fallback content (no-DB mode, or a
      // demo deployment).
      const local = findFallbackScenarioForCells([cellId as string])
      if (local) return local
      throw new Error('That cell is not in the blueprint')
    },
    fallback,
  )

  const scenarioId = scenario.status === 'ready' ? scenario.data : null

  useEffect(() => {
    if (scenarioId === null) return
    seedBaseSelection(scenarioId)
  }, [scenarioId, seedBaseSelection])

  // Once the scenario is on screen, wait for the cell to mount and open it.
  //
  // The latch is set on SUCCESS, not on attempt. A refetch failure (a phone
  // returning from the background triggers these constantly) nulls scenarioId,
  // which cancels the poll; latching up front meant the retry saw the link as
  // already spent and silently did nothing.
  const openedRef = useRef<string | null>(null)
  useEffect(() => {
    if (cellId === null || scenarioId === null) return
    if (openedRef.current === cellId) return
    // The link is only entitled to move the screen while the user is still
    // standing where it put them — the same rule seedBaseSelection follows.
    // The moment they navigate somewhere of their own choosing, it is spent.
    if (selectedScenarioId !== null && selectedScenarioId !== scenarioId) return

    let cancelled = false
    const deadline = Date.now() + OPEN_TIMEOUT_MS
    let timer = 0

    const attempt = () => {
      if (cancelled) return
      const mounted = document.querySelector(
        `[data-blueprint-cell="${CSS.escape(cellId)}"][data-blueprint-cell-interactive]`,
      )
      if (mounted) {
        openedRef.current = cellId
        void agentOpenCellPanel(cellId)
        return
      }
      if (Date.now() > deadline) {
        openedRef.current = cellId
        console.warn(
          `[deep link] cell ${cellId} never mounted on the canvas — the panel was not opened`,
        )
        return
      }
      timer = window.setTimeout(attempt, OPEN_POLL_MS)
    }
    attempt()

    return () => {
      cancelled = true
      if (timer) window.clearTimeout(timer)
    }
  }, [cellId, scenarioId, selectedScenarioId])
}
