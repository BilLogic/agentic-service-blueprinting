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

/** Safari throttles history.replaceState — debounce per-slide writes. */
const SLIDE_URL_DEBOUNCE_MS = 250

function urlStateForTab(
  tab: TabDescriptor | null,
  slide: number,
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
      return { kind: 'present', sliceId: tab.sliceId, slide }
  }
}

/**
 * One hook owns URL writes: the active tab serializes via
 * `history.replaceState` (no popstate listener — we never pushState), slide
 * writes debounce, and nothing is written while a boot deep link is pending.
 */
function useUrlViewState(
  state: ViewState,
  activeTab: TabDescriptor | null,
  openCellId: string | null,
): (slide: number) => void {
  const pending = state.pendingUrlState !== null
  const slideRef = useRef(0)
  const debounceRef = useRef<number | null>(null)
  const activeTabRef = useRef(activeTab)
  const pendingRef = useRef(pending)
  // Read through a ref so consuming the one-shot restored slide (setting it
  // to null) does not re-run the tab-change effect and clobber the URL.
  const restoredSlideRef = useRef(state.restoredSlide)

  useEffect(() => {
    activeTabRef.current = activeTab
    pendingRef.current = pending
    restoredSlideRef.current = state.restoredSlide
  })

  // Read the open cell through a ref inside the writer: a cell opening must
  // not re-run the tab-change effect (which resets the presentation slide),
  // and the write itself is driven by the effect below.
  const openCellRef = useRef(openCellId)

  const writeUrl = useCallback((tab: TabDescriptor | null, slide: number) => {
    const search = serializeUrlViewState(
      urlStateForTab(tab, slide, openCellRef.current),
    )
    window.history.replaceState(null, '', `${window.location.pathname}${search}`)
  }, [])

  // Immediate write on tab change; a pending in-flight slide write is stale
  // for the previous tab, so drop it.
  useEffect(() => {
    if (pending) return
    if (debounceRef.current !== null) {
      window.clearTimeout(debounceRef.current)
      debounceRef.current = null
    }
    if (activeTab?.kind === 'present') {
      const restoredSlide = restoredSlideRef.current
      slideRef.current =
        restoredSlide && restoredSlide.sliceId === activeTab.sliceId
          ? restoredSlide.slide
          : 0
    }
    writeUrl(activeTab, slideRef.current)
  }, [activeTab, pending, writeUrl])

  // Opening or closing a cell rewrites the base view's URL. Its own effect,
  // NOT a dependency of the one above: that effect also reseeds the
  // presentation slide, and a cell opening is not a tab change. Tabs own the
  // URL while one is active — `?cell=` belongs to the base blueprint.
  useEffect(() => {
    openCellRef.current = openCellId
    if (pending || activeTab !== null) return
    writeUrl(null, slideRef.current)
  }, [openCellId, activeTab, pending, writeUrl])

  useEffect(
    () => () => {
      if (debounceRef.current !== null) window.clearTimeout(debounceRef.current)
    },
    [],
  )

  return useCallback(
    (slide: number) => {
      slideRef.current = slide
      const tab = activeTabRef.current
      if (pendingRef.current || tab?.kind !== 'present') return
      if (debounceRef.current !== null) window.clearTimeout(debounceRef.current)
      debounceRef.current = window.setTimeout(() => {
        debounceRef.current = null
        writeUrl(tab, slide)
      }, SLIDE_URL_DEBOUNCE_MS)
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
  const reportPresentSlide = useUrlViewState(state, activeTab, openCellId)

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
  const consumeRestoredSlide = useCallback(
    () => dispatch({ type: 'consumeRestoredSlide' }),
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
      restoredSlide: state.restoredSlide,
      missingSliceId: state.missingSliceId,
      dismissMissingSlice,
      openTab,
      closeTab,
      activateTab,
      closeTabsForSlice,
      resolvePending,
      consumeRestoredSlide,
      reportPresentSlide,
    }),
    [
      state.tabs,
      state.activeKey,
      state.pendingUrlState,
      state.restoredSlide,
      state.missingSliceId,
      dismissMissingSlice,
      activeTab,
      openTab,
      closeTab,
      activateTab,
      closeTabsForSlice,
      resolvePending,
      consumeRestoredSlide,
      reportPresentSlide,
    ],
  )

  return (
    <ViewStateContext.Provider value={value}>
      {children}
    </ViewStateContext.Provider>
  )
}
