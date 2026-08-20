import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import { useLifecyclePhases } from '@/hooks/useLifecyclePhases'
import { mergeSlidesWithFallback } from '@/lib/mergeSlidesWithFallback'
import {
  FALLBACK_NAV,
  isSubslide,
  type EditorView,
  type NavItem,
  type SlideViewType,
} from '@/types/nav'

type EditorContextValue = {
  view: EditorView
  setView: (view: EditorView) => void
  /** Orientation homepage (sidebar Home destination). */
  goLanding: () => void
  /** Birds-eye service overview canvas (animates fit when leaving detail). */
  goHome: () => void
  /** Enter the overview canvas from the homepage without a fit zoom animation. */
  enterCanvas: () => void
  /**
   * When true, the next fit should jump instead of animating. One-shot:
   * set by enterCanvas, cleared by the fit that consumes it (and by any
   * navigation, which is a fresh animation intent).
   */
  skipCanvasFitAnimation: boolean
  /** Called by the canvas once the skip has been applied to a fit. */
  consumeCanvasFitAnimationSkip: () => void

  // ---- Navigation state -------------------------------------------------
  /** Selected phase, or null when nothing is selected (overview/landing). */
  selectedPhaseId: string | null
  /** Selected scenario; null means the whole phase is the camera target. */
  selectedScenarioId: string | null
  /**
   * Phases whose scenario list is open. Explicit and multi-open: expansion
   * is never derived from selection, which is what makes collapsing a phase
   * leave the camera alone.
   */
  expandedPhaseIds: ReadonlySet<string>
  /** Bumped on every navigation click so re-selecting a row recenters. */
  focusNonce: number
  /** Camera target — `selectedScenarioId ?? selectedPhaseId`. */
  cameraTargetId: string | null
  selectPhase: (phaseId: string) => void
  selectScenario: (scenarioId: string) => void
  /**
   * Seed the base view from a `?slice=` deep link (nav plan D5): select the
   * slice's scenario and expand its phase so the sidebar behind the tab is
   * coherent and closing the tab lands somewhere. No-op once the user has
   * navigated, and once per boot.
   */
  seedBaseSelection: (scenarioId: string) => void
  togglePhaseExpanded: (phaseId: string) => void
  setPhaseExpanded: (phaseId: string, open: boolean) => void
  clearSelection: () => void

  /** Compat wrapper over selectPhase/selectScenario. */
  openDetail: (slideId: string) => void
  slides: NavItem[]
  /** Slides from DB/fallback (same as slides; kept for callers). */
  baseSlides: NavItem[]
  getScenarioDisplayViewType: (slide: NavItem) => SlideViewType
  setScenarioDisplayViewType: (
    scenarioId: string,
    viewType: SlideViewType,
  ) => void
  slidesLoading: boolean
  slidesError: string | null
  /** Compat view of the camera target; falls back to the first slide. */
  activeSlideId: string
  activeSlide: NavItem
}

const EditorContext = createContext<EditorContextValue | null>(null)

const EMPTY_EXPANDED: ReadonlySet<string> = new Set<string>()

function withPhaseExpanded(
  current: ReadonlySet<string>,
  phaseId: string,
  open: boolean,
): ReadonlySet<string> {
  if (current.has(phaseId) === open) return current
  const next = new Set(current)
  if (open) next.add(phaseId)
  else next.delete(phaseId)
  return next
}

/**
 * The explicit selection/expansion pair behind the sidebar and the camera,
 * shared by the app-level provider and the tab-local scope.
 *
 * Invariants (nav plan D3):
 * - No selection action touches expansion, and no expansion action touches
 *   selection. Collapsing a phase therefore never moves the camera.
 * - Auto-expanding the selected scenario's phase runs once per scenario
 *   selection, so a phase the user collapsed afterwards stays collapsed
 *   (the old effect re-fired whenever `slides` changed identity).
 */
function useNavSelectionState(slides: NavItem[]) {
  const [selectedPhaseId, setSelectedPhaseId] = useState<string | null>(null)
  const [selectedScenarioId, setSelectedScenarioId] = useState<string | null>(
    null,
  )
  const [expandedPhaseIds, setExpandedPhaseIds] =
    useState<ReadonlySet<string>>(EMPTY_EXPANDED)
  const [focusNonce, setFocusNonce] = useState(0)
  const [view, setView] = useState<EditorView>('landing')
  const [skipCanvasFitAnimation, setSkipCanvasFitAnimation] = useState(false)

  // Deep-link seeding must not overwrite a place the user chose for
  // themselves, and must happen at most once per boot.
  const userNavigatedRef = useRef(false)
  const baseSelectionSeededRef = useRef(false)

  const selectPhase = useCallback((phaseId: string) => {
    userNavigatedRef.current = true
    setSelectedPhaseId(phaseId)
    setSelectedScenarioId(null)
    setFocusNonce((nonce) => nonce + 1)
    setSkipCanvasFitAnimation(false)
    setView('detail')
  }, [])

  const selectScenario = useCallback(
    (scenarioId: string) => {
      userNavigatedRef.current = true
      const parentId =
        slides.find((slide) => slide.id === scenarioId)?.parentId ?? null
      setSelectedScenarioId(scenarioId)
      // Keep the phase in sync so the sidebar can mark the ancestor of the
      // selection; the camera still targets the scenario.
      if (parentId !== null) setSelectedPhaseId(parentId)
      setFocusNonce((nonce) => nonce + 1)
      setSkipCanvasFitAnimation(false)
      setView('detail')
    },
    [slides],
  )

  const clearSelection = useCallback(() => {
    setSelectedPhaseId(null)
    setSelectedScenarioId(null)
  }, [])

  // D5: the deep-linked tab covers the base view, so seeding it moves no
  // camera — it only decides where the user lands when the tab closes.
  const seedBaseSelection = useCallback(
    (scenarioId: string) => {
      if (userNavigatedRef.current || baseSelectionSeededRef.current) return
      baseSelectionSeededRef.current = true

      setSelectedScenarioId(scenarioId)
      setView('detail')

      // A scenario whose phase is not known yet (slides still loading) is
      // picked up by the auto-expand effect and the reconcile pass below.
      const parentId =
        slides.find((slide) => slide.id === scenarioId)?.parentId ?? null
      if (parentId === null) return
      setSelectedPhaseId(parentId)
      setExpandedPhaseIds((current) =>
        withPhaseExpanded(current, parentId, true),
      )
    },
    [slides],
  )

  const setPhaseExpanded = useCallback((phaseId: string, open: boolean) => {
    setExpandedPhaseIds((current) => withPhaseExpanded(current, phaseId, open))
  }, [])

  const togglePhaseExpanded = useCallback((phaseId: string) => {
    setExpandedPhaseIds((current) =>
      withPhaseExpanded(current, phaseId, !current.has(phaseId)),
    )
  }, [])

  // Selecting a scenario opens its phase — once. Keyed on the scenario id
  // rather than an effect dependency so re-renders (including a new
  // `slides` array from a refetch) never re-open a collapsed phase.
  const autoExpandedForRef = useRef<string | null>(null)
  useEffect(() => {
    if (selectedScenarioId === null) {
      autoExpandedForRef.current = null
      return
    }
    if (autoExpandedForRef.current === selectedScenarioId) return
    const parentId = slides.find(
      (slide) => slide.id === selectedScenarioId,
    )?.parentId
    // Slides may not have loaded yet — retry on the next slides change.
    if (!parentId) return
    autoExpandedForRef.current = selectedScenarioId
    // eslint-disable-next-line react-hooks/set-state-in-effect -- one-shot auto-expand keyed on the ref above; a render-phase version would re-open collapsed phases on refetch
    setExpandedPhaseIds((current) => withPhaseExpanded(current, parentId, true))
  }, [selectedScenarioId, slides])

  // Reconcile the selection against the slide list: drop ids that no longer
  // exist, and re-sort an id that was selected (deep link, click during a
  // refetch) before `slides` could say whether it was a phase or a scenario.
  useEffect(() => {
    if (slides.length === 0) return
    const find = (id: string) => slides.find((slide) => slide.id === id)

    // The camera target vanished (deleted elsewhere, or a stale deep link).
    // Dropping only the scenario id would silently retarget the camera at
    // its phase, and dropping only the phase id would fall through to
    // `slides[0]` — either way the user is moved somewhere they never
    // asked for. Go to the overview and show nothing as selected.
    const abandonSelection = () => {
      setSelectedScenarioId(null)
      setSelectedPhaseId(null)
      setView((current) => (current === 'detail' ? 'home' : current))
    }

    if (selectedScenarioId !== null) {
      const scenario = find(selectedScenarioId)
      if (!scenario) {
        abandonSelection()
        return
      }
      const parentId = scenario.parentId ?? null
      // eslint-disable-next-line react-hooks/set-state-in-effect -- reconciles the selection against externally-fetched slides; guarded so it settles in one pass
      if (parentId !== selectedPhaseId) setSelectedPhaseId(parentId)
      return
    }

    if (selectedPhaseId === null) return
    const phase = find(selectedPhaseId)
    if (!phase) {
      abandonSelection()
      return
    }
    if (isSubslide(phase)) {
      setSelectedScenarioId(phase.id)
      setSelectedPhaseId(phase.parentId ?? null)
    }
  }, [slides, selectedPhaseId, selectedScenarioId])

  const cameraTargetId = selectedScenarioId ?? selectedPhaseId
  const activeSlideId =
    cameraTargetId ?? slides[0]?.id ?? FALLBACK_NAV[0].id

  const activeSlide = useMemo(
    () =>
      slides.find((slide) => slide.id === activeSlideId) ??
      slides[0] ??
      FALLBACK_NAV[0],
    [activeSlideId, slides],
  )

  const openDetail = useCallback(
    (slideId: string) => {
      const slide = slides.find((item) => item.id === slideId)
      if (slide && isSubslide(slide)) selectScenario(slideId)
      else selectPhase(slideId)
    },
    [selectPhase, selectScenario, slides],
  )

  const goLanding = useCallback(() => {
    userNavigatedRef.current = true
    setView('landing')
  }, [])

  const goHome = useCallback(() => {
    userNavigatedRef.current = true
    setSkipCanvasFitAnimation(false)
    setFocusNonce((nonce) => nonce + 1)
    clearSelection()
    setView('home')
  }, [clearSelection])

  const enterCanvas = useCallback(() => {
    userNavigatedRef.current = true
    setSkipCanvasFitAnimation(true)
    setFocusNonce((nonce) => nonce + 1)
    clearSelection()
    setView('home')
  }, [clearSelection])

  const consumeCanvasFitAnimationSkip = useCallback(() => {
    setSkipCanvasFitAnimation(false)
  }, [])

  return {
    view,
    setView,
    goLanding,
    goHome,
    enterCanvas,
    skipCanvasFitAnimation,
    consumeCanvasFitAnimationSkip,
    selectedPhaseId,
    selectedScenarioId,
    expandedPhaseIds,
    focusNonce,
    cameraTargetId,
    selectPhase,
    selectScenario,
    seedBaseSelection,
    togglePhaseExpanded,
    setPhaseExpanded,
    clearSelection,
    openDetail,
    activeSlideId,
    activeSlide,
  }
}

type EditorProviderProps = {
  children: ReactNode
}

export function EditorProvider({ children }: EditorProviderProps) {
  const { slides: dbSlides, loading, error, configured } = useLifecyclePhases()

  const slides = useMemo(() => {
    if (dbSlides.length === 0) return FALLBACK_NAV
    return mergeSlidesWithFallback(dbSlides)
  }, [dbSlides])

  const nav = useNavSelectionState(slides)

  /*
    Per-scenario display override, session-local. Stacked is the default
    reading view; 'merged' is the comparison lens (the header toggle calls
    it Merged) — session-only, never persisted to the DB.
  */
  const [viewTypeOverrides, setViewTypeOverrides] = useState<
    Record<string, SlideViewType>
  >({})

  const getScenarioDisplayViewType = useCallback(
    (slide: NavItem): SlideViewType =>
      viewTypeOverrides[slide.id] ?? 'stacked',
    [viewTypeOverrides],
  )

  const setScenarioDisplayViewType = useCallback(
    (scenarioId: string, viewType: SlideViewType) => {
      setViewTypeOverrides((current) => ({
        ...current,
        [scenarioId]: viewType,
      }))
    },
    [],
  )

  const slidesLoading = configured && loading && dbSlides.length === 0
  const slidesError = configured ? error : null

  const value = useMemo(
    () => ({
      ...nav,
      slides,
      baseSlides: slides,
      getScenarioDisplayViewType,
      setScenarioDisplayViewType,
      slidesLoading,
      slidesError,
    }),
    [
      nav,
      slides,
      getScenarioDisplayViewType,
      setScenarioDisplayViewType,
      slidesLoading,
      slidesError,
    ],
  )

  return (
    <EditorContext.Provider value={value}>{children}</EditorContext.Provider>
  )
}

export function useEditor() {
  const context = useContext(EditorContext)
  if (!context) {
    throw new Error('useEditor must be used within EditorProvider')
  }
  return context
}

/**
 * The base view's selected scenario, or null outside an EditorProvider.
 *
 * For consumers that REACT to navigation without owning it — today the path
 * selection store, which collapses a multi-path comparison back to the
 * default when the reader moves to a different scenario. Null-safe because
 * that store also mounts in tests and surfaces with no editor above it,
 * where "no navigation is happening" is the correct reading.
 */
export function useSelectedScenarioIdOptional(): string | null {
  const context = useContext(EditorContext)
  return context?.selectedScenarioId ?? null
}

/**
 * True while the canvas is focused on one scenario — the only place the
 * grid's structural affordances (insert handles, empty-cell `+`) belong.
 * At the overview, twenty blueprints render at 6% zoom; an insert handle
 * there is an unaimed weapon. Null-safe for surfaces outside the editor
 * provider (a slice tab), which are never at scenario level.
 */
export function useAtScenarioLevel(): boolean {
  const context = useContext(EditorContext)
  return context?.view === 'detail' && context.selectedScenarioId !== null
}

type EditorDetailScopeProps = {
  /** Slide (scenario) the scope opens focused on. */
  slideId: string
  children: ReactNode
}

/**
 * Local editor-state override for tabs that embed the normal blueprint view
 * (slice focus tabs). Slides and loading state come from the app-level
 * EditorProvider; view and navigation state are tab-local so navigating
 * inside a slice tab never disturbs the blueprint tab, and the tab opens in
 * detail view on the given slide.
 *
 * Invariant: every view-writing method of EditorContext must be overridden
 * here — anything left to the parent would silently retarget the base
 * blueprint view underneath the tab. That includes the expansion actions:
 * the sidebar renders outside the scope and reads the parent's state.
 */
export function EditorDetailScope({ slideId, children }: EditorDetailScopeProps) {
  const parent = useEditor()
  const nav = useNavSelectionState(parent.slides)
  const { openDetail } = nav

  // Re-anchor when the scope is re-pointed at a different slide (and on
  // mount, since the shared state starts unselected on the landing view).
  const [lastSlideId, setLastSlideId] = useState<string | null>(null)
  if (lastSlideId !== slideId) {
    setLastSlideId(slideId)
    openDetail(slideId)
  }

  // Landing navigation from inside a slice tab is not a supported
  // affordance (the scope cannot reach the tab store to leave the tab, and
  // the parent's goLanding would switch the base view underneath it), so
  // the override is a deliberate no-op.
  const goLanding = useCallback(() => {}, [])

  const value = useMemo(
    () => ({
      ...parent,
      ...nav,
      goLanding,
    }),
    [parent, nav, goLanding],
  )

  return (
    <EditorContext.Provider value={value}>{children}</EditorContext.Provider>
  )
}
