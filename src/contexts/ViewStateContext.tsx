import {
  useCallback,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  type ReactNode,
} from 'react'
import { serializeUrlViewState, type UrlViewState } from '@/lib/urlViewState'
import { useOpenCellId } from '@/lib/openCellStore'
import {
  createInitialViewState,
  tabKey,
  ViewStateContext,
  viewStateReducer,
  type TabDescriptor,
  type TabKey,
  type ViewState,
} from '@/contexts/viewStateStore'

/** Safari throttles history.replaceState — debounce per-frame writes. */
const FRAME_URL_DEBOUNCE_MS = 250

function urlStateForTab(
  tab: TabDescriptor | null,
  frame: number,
  openCellId: string | null,
): UrlViewState {
  if (tab === null) {
    // Base blueprint view — no tab is active. The open cell rides along so the
    // address bar IS the share link for what the reader is looking at.
    return { kind: 'blueprint', cellId: openCellId ?? undefined }
  }
  switch (tab.kind) {
    case 'slice':
      return { kind: 'slice', sliceId: tab.sliceId }
    case 'present':
      return { kind: 'present', sliceId: tab.sliceId, frame }
  }
}

/**
 * One hook owns URL writes: the active tab serializes via
 * `history.replaceState` (no popstate listener — we never pushState), frame
 * writes debounce, and nothing is written while a boot deep link is pending.
 */
function useUrlViewState(
  state: ViewState,
  activeTab: TabDescriptor | null,
  openCellId: string | null,
): (frame: number) => void {
  const pending = state.pendingUrlState !== null
  const frameRef = useRef(0)
  const debounceRef = useRef<number | null>(null)
  const activeTabRef = useRef(activeTab)
  const pendingRef = useRef(pending)
  // Read through a ref so consuming the one-shot restored frame (setting it
  // to null) does not re-run the tab-change effect and clobber the URL.
  const restoredFrameRef = useRef(state.restoredFrame)

  useEffect(() => {
    activeTabRef.current = activeTab
    pendingRef.current = pending
    restoredFrameRef.current = state.restoredFrame
  })

  // Read the open cell through a ref inside the writer: a cell opening must
  // not re-run the tab-change effect (which resets the presentation frame),
  // and the write itself is driven by the effect below.
  const openCellRef = useRef(openCellId)

  const writeUrl = useCallback((tab: TabDescriptor | null, frame: number) => {
    const search = serializeUrlViewState(
      urlStateForTab(tab, frame, openCellRef.current),
    )
    window.history.replaceState(null, '', `${window.location.pathname}${search}`)
  }, [])

  // Immediate write on tab change; a pending in-flight frame write is stale
  // for the previous tab, so drop it.
  useEffect(() => {
    if (pending) return
    if (debounceRef.current !== null) {
      window.clearTimeout(debounceRef.current)
      debounceRef.current = null
    }
    if (activeTab?.kind === 'present') {
      const restoredFrame = restoredFrameRef.current
      frameRef.current =
        restoredFrame && restoredFrame.sliceId === activeTab.sliceId
          ? restoredFrame.frame
          : 0
    }
    writeUrl(activeTab, frameRef.current)
  }, [activeTab, pending, writeUrl])

  // Opening or closing a cell rewrites the base view's URL. Its own effect,
  // NOT a dependency of the one above: that effect also reseeds the
  // presentation frame, and a cell opening is not a tab change. Tabs own the
  // URL while one is active — `?cell=` belongs to the base blueprint.
  useEffect(() => {
    openCellRef.current = openCellId
    if (pending || activeTab !== null) return
    writeUrl(null, frameRef.current)
  }, [openCellId, activeTab, pending, writeUrl])

  useEffect(
    () => () => {
      if (debounceRef.current !== null) window.clearTimeout(debounceRef.current)
    },
    [],
  )

  return useCallback(
    (frame: number) => {
      frameRef.current = frame
      const tab = activeTabRef.current
      if (pendingRef.current || tab?.kind !== 'present') return
      if (debounceRef.current !== null) window.clearTimeout(debounceRef.current)
      debounceRef.current = window.setTimeout(() => {
        debounceRef.current = null
        writeUrl(tab, frame)
      }, FRAME_URL_DEBOUNCE_MS)
    },
    [writeUrl],
  )
}

type ViewStateProviderProps = {
  children: ReactNode
}

export function ViewStateProvider({ children }: ViewStateProviderProps) {
  const [state, dispatch] = useReducer(
    viewStateReducer,
    window.location.search,
    createInitialViewState,
  )

  const activeTab = useMemo(
    () =>
      state.activeKey === null
        ? null
        : (state.tabs.find((tab) => tabKey(tab) === state.activeKey) ?? null),
    [state.tabs, state.activeKey],
  )

  const openCellId = useOpenCellId()
  const reportPresentFrame = useUrlViewState(state, activeTab, openCellId)

  const openTab = useCallback(
    (tab: TabDescriptor) => dispatch({ type: 'open', tab }),
    [],
  )
  const closeTab = useCallback(
    (key: TabKey) => dispatch({ type: 'close', key }),
    [],
  )
  const activateTab = useCallback(
    (key: TabKey | null) => dispatch({ type: 'activate', key }),
    [],
  )
  const closeTabsForSlice = useCallback(
    (sliceId: string) => dispatch({ type: 'closeForSlice', sliceId }),
    [],
  )
  const resolvePending = useCallback(
    (availableSliceIds: readonly string[]) =>
      dispatch({ type: 'resolvePending', availableSliceIds }),
    [],
  )
  const consumeRestoredFrame = useCallback(
    () => dispatch({ type: 'consumeRestoredFrame' }),
    [],
  )
  const dismissMissingSlice = useCallback(
    () => dispatch({ type: 'dismissMissingSlice' }),
    [],
  )

  const value = useMemo(
    () => ({
      tabs: state.tabs,
      activeKey: state.activeKey,
      activeTab,
      pendingUrlState: state.pendingUrlState,
      restoredFrame: state.restoredFrame,
      missingSliceId: state.missingSliceId,
      dismissMissingSlice,
      openTab,
      closeTab,
      activateTab,
      closeTabsForSlice,
      resolvePending,
      consumeRestoredFrame,
      reportPresentFrame,
    }),
    [
      state.tabs,
      state.activeKey,
      state.pendingUrlState,
      state.restoredFrame,
      state.missingSliceId,
      dismissMissingSlice,
      activeTab,
      openTab,
      closeTab,
      activateTab,
      closeTabsForSlice,
      resolvePending,
      consumeRestoredFrame,
      reportPresentFrame,
    ],
  )

  return (
    <ViewStateContext.Provider value={value}>
      {children}
    </ViewStateContext.Provider>
  )
}
