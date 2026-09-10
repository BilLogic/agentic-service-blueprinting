import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useEditor } from '@/contexts/EditorContext'
import { usePathSelectionContext } from '@/contexts/PathSelectionContext'
import { useViewState } from '@/contexts/viewStateStore'
import {
  boardPathKeys,
  isEmptyBoardAddress,
  parseBoardAddress,
  pathKeysForScenario,
  resolveBoardTarget,
  resolvePathKeys,
  setBoardAddress,
  type BoardAddress,
} from '@/lib/boardAddress'
import { getOpenCellId } from '@/lib/openCellStore'
import { serializeUrlViewState } from '@/lib/urlViewState'
import { getSlideViewType } from '@/types/nav'

/**
 * The board and the address bar, kept saying the same thing.
 *
 * Reading in both directions: the board the reader walks to is written into the
 * URL, and a URL the reader arrives on — pasted, reloaded, or stepped back to —
 * is walked to. What the address holds and why is `lib/boardAddress.ts`; this
 * is the seam that binds it to the state that already owns each fact.
 *
 * ── TWO CLASSES OF STATE, TWO HISTORY CALLS ────────────────────────────────
 *
 * The BOARD — phase, scenario, path selection, view mode — is pushed, so back
 * steps to the board the reader came from. The OPEN CELL PANEL is replaced,
 * which it already was before any of this: a panel opens and closes many times
 * while one board is read, and pushing those would fill the history with panel
 * opens and leave the back button useless for the thing a reader actually
 * wants to step through. Sharing does not suffer for it — the address stays
 * complete either way; only the history entry is withheld.
 *
 * The panel's half is `ViewStateContext`, which has written `?cell=` by
 * `replaceState` since the share link shipped. Nothing here changes it. That
 * split is why this is worth doing at all: one history policy for both would
 * have made the board's own addressing not worth having.
 *
 * ── A BRIDGE COMPONENT, NOT LOGIC IN A PROVIDER ────────────────────────────
 *
 * The same shape and the same reason as `ScenarioPathSelectionReset`, beside
 * which it is mounted: the facts it joins live in three providers that do not
 * know about each other — navigation in the editor, the selection in the path
 * store, the tab in the view state — and none of them may grow a dependency on
 * the other two to reach a URL.
 */

/**
 * How long an arriving address may keep trying to land, counted from the last
 * time the board it named changed.
 *
 * The scenario is selected in the first pass. What waits is the path catalog,
 * which does not exist until that board has rendered — on a cold load, with
 * every phase's blueprints in flight, that is several seconds. Three was not
 * enough, and the failure was silent and wrong in the worst way: the address
 * gave up, the board was written back to the URL without the paths it had
 * asked for, and a two-path comparison someone had sent arrived as one path.
 *
 * Waiting this long is safe in a way the cell deep link's window is not.
 * Before the catalog fills, the board offers no paths to choose, so there is
 * no reader decision this can overrule — and the moment the reader navigates
 * somewhere else, `navDoneRef` ends it regardless of the clock. The timeout is
 * only here so that a board whose paths never arrive cannot hold the address
 * bar for the rest of the session.
 */
const APPLY_TIMEOUT_MS = 20_000

export function BoardAddressSync() {
  const {
    slides,
    slidesLoading,
    selectedPhaseId,
    selectedScenarioId,
    selectPhase,
    selectScenario,
    goHome,
    getScenarioDisplayViewType,
    seedScenarioDisplayViewType,
  } = useEditor()
  const { activeTab, pendingUrlState } = useViewState()
  const { catalog, activePathKeys, togglePathKey } = usePathSelectionContext()

  const [bootAddress] = useState(() => parseBoardAddress(window.location.search))
  const [pending, setPending] = useState<BoardAddress | null>(() =>
    isEmptyBoardAddress(bootAddress) ? null : bootAddress,
  )

  /**
   * The next write lands on an entry that already exists, so it replaces.
   *
   * True for the boot entry when the address named a board — the write that
   * follows only canonicalises what the reader pasted — and true after every
   * popstate, where pushing would bury the entry they just stepped back to.
   * False otherwise, which is every board the reader chooses.
   */
  const replaceNextRef = useRef(!isEmptyBoardAddress(bootAddress))
  /** The arriving address has moved the camera; a later move is the reader's. */
  const navDoneRef = useRef(false)

  const beginApply = useCallback((address: BoardAddress) => {
    navDoneRef.current = false
    replaceNextRef.current = true
    setPending(address)
  }, [])

  // ---- The board, as the address would spell it --------------------------
  const address = useMemo<BoardAddress>(() => {
    if (selectedScenarioId === null && selectedPhaseId === null) {
      return { phaseId: null, scenarioId: null, pathKeys: null, view: null }
    }
    const slide = selectedScenarioId
      ? slides.find((item) => item.id === selectedScenarioId)
      : undefined
    const displayed = slide ? getScenarioDisplayViewType(slide) : undefined
    return {
      phaseId: selectedPhaseId,
      scenarioId: selectedScenarioId,
      pathKeys: selectedScenarioId
        ? boardPathKeys(catalog[selectedScenarioId] ?? [], activePathKeys)
        : null,
      // Only a divergence from what the scenario remembers is worth saying.
      view:
        slide && displayed && displayed !== getSlideViewType(slide)
          ? displayed
          : null,
    }
  }, [
    slides,
    selectedPhaseId,
    selectedScenarioId,
    catalog,
    activePathKeys,
    getScenarioDisplayViewType,
  ])

  // ---- Write ------------------------------------------------------------
  useEffect(() => {
    /*
      Published unconditionally, and while an address is still landing it is
      the ARRIVING address that is published rather than the board on screen.

      Both halves matter. Unconditional, because a tab may own the URL right
      now and the board still has to be there when the tab closes. The
      arriving one, because `ViewStateContext` writes the search on its own
      schedule — a tab change, a cell opening, its own boot deep link
      resolving — and it builds that search from this store. Publish the board
      on screen while an address is mid-flight and one of those writes lands
      first, spelling out a board that has not finished arriving: the paths
      the link asked for are gone from the address bar before they were ever
      applied, and the reader is holding a link that no longer says what they
      were sent.
    */
    setBoardAddress(pending ?? address)

    if (pending !== null) return
    // The same two holds `ViewStateContext` writes under: a boot deep link is
    // still resolving, or a tab owns the address.
    if (pendingUrlState !== null || activeTab !== null) return

    const search = serializeUrlViewState({
      kind: 'blueprint',
      cellId: getOpenCellId() ?? undefined,
    })
    const url = `${window.location.pathname}${search}`
    if (url === `${window.location.pathname}${window.location.search}`) return

    if (replaceNextRef.current) window.history.replaceState(null, '', url)
    else window.history.pushState(null, '', url)
    replaceNextRef.current = false
  }, [address, pending, pendingUrlState, activeTab])

  // ---- Read: back, forward, and the address the reader arrived on --------
  useEffect(() => {
    const onPopState = () => beginApply(parseBoardAddress(window.location.search))
    window.addEventListener('popstate', onPopState)
    return () => window.removeEventListener('popstate', onPopState)
  }, [beginApply])

  // An address that cannot land is dropped rather than left steering. The
  // clock restarts when the board it named arrives, so the wait for that
  // board's path catalog is a full window rather than the tail of one.
  useEffect(() => {
    if (pending === null) return
    const timer = window.setTimeout(() => {
      console.warn(
        '[board address] gave up applying the address in the URL — the board it names never finished loading',
      )
      setPending(null)
    }, APPLY_TIMEOUT_MS)
    return () => window.clearTimeout(timer)
  }, [pending, selectedScenarioId])

  useEffect(() => {
    if (pending === null) return
    // Every id resolves against the slide list, so nothing is applied until
    // there is a list to say whether it still exists.
    if (slidesLoading) return

    /**
     * One pass at landing the address. `true` once there is nothing left to
     * do; `false` while a state change it just made — or one it is waiting on
     * — has yet to arrive, which brings the effect back for another pass.
     */
    const land = (): boolean => {
      const { phaseId, scenarioId } = resolveBoardTarget(slides, pending)

      if (scenarioId === null) {
        if (phaseId === null) {
          // Nothing the address named still exists, or it named nothing at
          // all. The service overview is the nearest valid place either way.
          if (selectedScenarioId !== null || selectedPhaseId !== null) goHome()
          return true
        }
        if (selectedScenarioId === null && selectedPhaseId === phaseId) {
          return true
        }
        selectPhase(phaseId)
        return false
      }

      if (selectedScenarioId !== scenarioId) {
        // The camera has already been where the address asked and is
        // somewhere else now, which means the reader moved. They win.
        if (navDoneRef.current) return true
        selectScenario(scenarioId)
        if (pending.view) {
          seedScenarioDisplayViewType(scenarioId, pending.view)
        }
        return false
      }
      navDoneRef.current = true

      if (pending.pathKeys === null) return true

      const paths = catalog[scenarioId] ?? []
      // The catalog fills when the board renders; the timeout is the floor.
      if (paths.length === 0) return false

      const wanted = resolvePathKeys(paths, pending.pathKeys)
      if (wanted === null) return true

      const known = pathKeysForScenario(paths)
      const shown = known.filter((key) => activePathKeys.includes(key))
      if (
        shown.length === wanted.length &&
        shown.every((key) => wanted.includes(key))
      ) {
        return true
      }

      for (const key of known) {
        if (wanted.includes(key) !== shown.includes(key)) togglePathKey(key)
      }
      // Deliberately not done. Moving between scenarios also collapses the
      // selection to its default (ScenarioPathSelectionReset), and that
      // collapse can land after these toggles — so the next pass checks the
      // result rather than trusting it.
      return false
    }

    if (land()) setPending(null)
  }, [
    pending,
    slides,
    slidesLoading,
    selectedPhaseId,
    selectedScenarioId,
    selectPhase,
    selectScenario,
    goHome,
    seedScenarioDisplayViewType,
    catalog,
    activePathKeys,
    togglePathKey,
  ])

  return null
}
