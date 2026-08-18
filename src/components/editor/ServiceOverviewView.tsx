import {
  Fragment,
  memo,
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import { BlueprintCellDetailPanel } from '@/components/blueprint/BlueprintCellDetailPanel'
import { PhaseScenarioOverview } from '@/components/blueprint/PhaseScenarioOverview'
import { CanvasPhaseSection } from '@/components/editor/CanvasPhaseSection'
import { OverviewPhaseRowDivider } from '@/components/editor/OverviewPhaseRowDivider'
import {
  PhaseOverviewPhaseLoopArrow,
  PHASE_OVERVIEW_LOOP_CHANNEL_OFFSET,
} from '@/components/editor/PhaseOverviewPhaseLoopArrow'
import { CanvasEmptyState } from '@/components/editor/CanvasEmptyState'
import { CanvasLoadProgress } from '@/components/editor/CanvasLoadProgress'
import { ServiceOverviewCanvasSkeleton } from '@/components/editor/EditorLoadingSkeletons'
import { DeferredSkeleton } from '@/components/ui/deferred-skeleton'
import { NavbarZoomIndicator } from '@/components/editor/EditorZoomIndicator'
import { SlideStickyHeader } from '@/components/editor/SlideStickyHeader'
import { ZoomPanViewport } from '@/components/editor/ZoomPanViewport'
import {
  BlueprintCellDetailProvider,
  useBlueprintCellDetail,
} from '@/contexts/BlueprintCellDetailContext'
import { CanvasZoomChromeProvider } from '@/contexts/CanvasZoomChromeContext'
import {
  CANVAS_REVEAL_ARROWS,
  CANVAS_REVEAL_CELLS,
  CANVAS_REVEAL_DONE,
  CANVAS_REVEAL_LANES,
  CANVAS_REVEAL_PANELS,
} from '@/contexts/canvasRevealContext'
import { useEditor } from '@/contexts/EditorContext'
import { usePhaseBlueprintFilters } from '@/hooks/usePhaseBlueprintFilters'
import { useMobileShell } from '@/hooks/useMobileShell'
import { cn } from '@/lib/utils'
import { isBlueprintCellDetailEnabled } from '@/lib/blueprintDisplayFlags'
import {
  getCanvasFocusFitInsets,
  getCanvasFocusMaxZoom,
  getCanvasFocusSelector,
} from '@/lib/canvasFocus'
import {
  OVERVIEW_CANVAS_PADDING_X,
  OVERVIEW_CANVAS_PADDING_Y,
} from '@/lib/overviewLayout'
import { collectOverviewPathOptionsForScenarios } from '@/lib/overviewPathFilters'
import {
  getMainSlides,
  getParentSlide,
  getSlideDisplayLabel,
  getOverviewPostToPreLoopTransition,
  getSubslides,
  isOverviewFlowArrowAnchorPhase,
  shouldShowOverviewPhaseFlowArrow,
  isSubslide,
  type NavItem,
  type SlideViewType,
} from '@/types/nav'
import {
  getBlueprintArtboardSize,
  type ArtboardSize,
} from '@/lib/blueprintLayout'
import type { BlueprintData } from '@/types/blueprint'
import {
  MOTION_CAMERA_MS,
  MOTION_FADE_MS,
  MOTION_STRUCTURAL_MS,
  prefersReducedMotion,
} from '@/lib/motion'
import type { PathListItem } from '@/lib/pathSelection'
/**
 * Floor for the phone's fit-to-view zoom — 3x the phone's own semantic
 * threshold below, so the frame the reader lands on always has cell text in
 * it with room to pinch out before the text goes. Roughly half a phase board
 * across on a 390px screen.
 */
const MOBILE_MIN_FIT_ZOOM = 0.45

/**
 * Where the phone's cells give up their text. Lower than the desktop 0.25
 * because a phone has ~3 device pixels per CSS pixel: at 0.15 the blurbs
 * are small but still ink on the screen, and a reader who pinches out to
 * see where they are keeps something to read. At 0.25 the whole board went
 * blank the moment they zoomed out at all, which reads as "this blueprint
 * has no content" rather than "you are too far out".
 */
const MOBILE_SEMANTIC_ZOOM_THRESHOLD = 0.15

/**
 * Which element's `transitionend` is allowed to close each reveal stage.
 *
 * The chain is event-driven and `transitionend` bubbles, so without this the
 * handler on the board root treats any opacity transition in the subtree as
 * its cue — including every hover the board carries. Keyed by the stage
 * being waited out, so stage N only listens to the layer stage N opened.
 */
const REVEAL_ROOT_SOURCE = ':scope'
const REVEAL_STAGE_SOURCE: Record<number, string | undefined> = {
  [CANVAS_REVEAL_LANES]: REVEAL_ROOT_SOURCE,
  [CANVAS_REVEAL_PANELS]: '[data-phase-scenario-panel]',
  [CANVAS_REVEAL_CELLS]: '[data-blueprint-cell-anchor], [data-blueprint-cell]',
  [CANVAS_REVEAL_ARROWS]: '[data-blueprint-arrows]',
}

const OVERVIEW_PAN_IGNORE =
  // Interactive CHROME only — container-wide entries (compare panel, phase
  // section/overview wrappers) used to be here too, which made every drag
  // that started inside a path board a dead drag: empty board space must
  // pan like the rest of the canvas.
  "button, a, input, textarea, select, label, [role='button'], [data-slide-sticky-header], [data-zoom-indicator], [data-annotation-toolbar], [data-canvas-annotation-layer], [data-canvas-phase-interactive], [data-phase-menubar-header], [data-path-description-trigger], [data-cell-detail-panel], [data-blueprint-cell-interactive], [data-slot='menubar'], [data-slot='menubar-trigger'], [data-canvas-nav]"

function CanvasFocusEscapeHandler() {
  const { view, goHome } = useEditor()
  const { isOpen: cellDetailOpen } = useBlueprintCellDetail()

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape' || view !== 'detail') return
      if (event.defaultPrevented) return
      if (cellDetailOpen) return

      const target = event.target
      if (
        target instanceof HTMLElement &&
        (target.isContentEditable ||
          target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.tagName === 'SELECT')
      ) {
        return
      }

      if (
        document.querySelector(
          '[data-visual-walkthrough-modal], [role="dialog"][data-state="open"]',
        )
      ) {
        return
      }

      event.preventDefault()
      goHome()
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [cellDetailOpen, goHome, view])

  return null
}

type ServicePhaseSectionProps = {
  phase: NavItem
  slides: NavItem[]
  pathsByScenario: Map<string, PathListItem[]>
  blueprintsByPathId: Map<string, BlueprintData>
  getSelectedPathIds: (scenarioId: string, paths: PathListItem[]) => string[]
  displayViewType: SlideViewType
  showFlowArrow?: boolean
  isFlowArrowAnchor?: boolean
  isLoopArrowFrom?: boolean
  isLoopArrowTo?: boolean
  dimmed?: boolean
  focusedScenarioId?: string | null
  focusActive?: boolean
  /** Slice-tab scope: mount only this scenario's artboard within the phase. */
  onlyScenarioId?: string | null
  onOpenPhase: (phaseId: string) => void
}

function ServicePhaseSection({
  phase,
  slides,
  pathsByScenario,
  blueprintsByPathId,
  getSelectedPathIds,
  displayViewType,
  onOpenPhase,
  showFlowArrow = false,
  isFlowArrowAnchor = false,
  isLoopArrowFrom = false,
  isLoopArrowTo = false,
  dimmed = false,
  focusedScenarioId = null,
  focusActive = false,
  onlyScenarioId = null,
}: ServicePhaseSectionProps) {
  const label = getSlideDisplayLabel(phase, slides)
  const description =
    phase.description ?? 'Scenarios in this phase and how they connect.'

  return (
    <CanvasPhaseSection
      title={label}
      ordinal={phase.index}
      description={description}
      phaseId={phase.id}
      variant="overview"
      showFlowArrow={showFlowArrow}
      isFlowArrowAnchor={isFlowArrowAnchor}
      isLoopArrowFrom={isLoopArrowFrom}
      isLoopArrowTo={isLoopArrowTo}
      dimmed={dimmed}
      focusActive={focusActive}
      onNavigate={() => onOpenPhase(phase.id)}
    >
      <PhaseScenarioOverview
        phase={phase}
        slides={slides}
        variant="overview"
        alignPanelHeights
        pathsByScenario={pathsByScenario}
        blueprintsByPathId={blueprintsByPathId}
        getSelectedPathIds={getSelectedPathIds}
        displayViewType={displayViewType}
        focusedScenarioId={focusedScenarioId}
        onlyScenarioId={onlyScenarioId}
        loading={false}
      />
    </CanvasPhaseSection>
  )
}

type ServiceOverviewViewProps = {
  /**
   * Shares this view's skeleton session with an embedding surface, so a
   * waterfall that resolves upstream (slice → scenario → blueprints) holds
   * one skeleton across the hand-off instead of restarting it.
   */
  skeletonHoldKey?: string
  /**
   * Slice-tab scope: only this scenario's artboard (inside its own phase
   * frame) mounts — neighboring scenarios/phases, lifecycle arrows, and the
   * prev/next sequence nav all stay out of the canvas. Zoom/pan unchanged.
   */
  soloScenarioId?: string
  /**
   * Narrows the board to one phase's scenarios. `soloScenarioId` narrows all
   * the way to a single scenario; this is the step above it, and it is what
   * the mobile Map uses — a phone asks "show me this stretch of the service",
   * never "render all 800 cells".
   */
  soloPhaseId?: string
  /**
   * Embedding tabs (slice focus) replace the built-in docked navbar header
   * with their own band. Rendered inside the canvas zoom chrome provider.
   */
  renderHeader?: () => ReactNode
  /**
   * Placeholder for `renderHeader`, held until the board opens its first
   * layer. An embedding band is canvas furniture like the annotation
   * toolbar: it must not paint finished over a canvas that is still behind
   * a loading bar, which is what a slice tab's band used to do.
   */
  renderHeaderSkeleton?: () => ReactNode
  /**
   * First stage's label on the load bar. The bar is handed from an
   * embedding surface's own phases to this canvas's copy, and a surface
   * that calls the work "slice" must not have it renamed "structure"
   * halfway through one load.
   */
  firstStageLabel?: string
  /** Floating chrome anchored bottom-right inside the canvas (slice tabs' Reset View). */
  floatingChrome?: ReactNode
  /**
   * Report this canvas's reveal stage to whatever must arrive with it —
   * today the shell's sidebar boot layer.
   *
   * Only the shell's BASE canvas passes one: it is the only mount that
   * shares a boot with the sidebar. A slice tab or the phone shell mounting
   * this view is a navigation, not a boot, and reporting from there covered
   * a populated sidebar with its loading skeleton on every tab switch. The
   * callback IS the permission — there is no global to publish into and no
   * flag to get wrong.
   */
  onRevealStage?: (stage: number) => void
}

/**
 * The overview canvas — every phase and scenario on one zoomable board.
 * `renderHeader` and `floatingChrome` let an embedding tab (slice focus) swap
 * the docked header and add its own canvas-anchored controls.
 */
function ServiceOverviewViewImpl({
  skeletonHoldKey,
  soloScenarioId,
  soloPhaseId,
  renderHeader,
  renderHeaderSkeleton,
  firstStageLabel = 'Loading structure…',
  floatingChrome,
  onRevealStage,
}: ServiceOverviewViewProps = {}) {
  const overviewRef = useRef<HTMLDivElement>(null)
  const [overviewEl, setOverviewEl] = useState<HTMLDivElement | null>(null)
  const mobileShell = useMobileShell()
  const {
    slides,
    slidesLoading,
    openDetail,
    goHome,
    view,
    activeSlide,
    cameraTargetId,
    focusNonce,
    getScenarioDisplayViewType,
    setScenarioDisplayViewType,
    skipCanvasFitAnimation,
    consumeCanvasFitAnimationSkip,
  } = useEditor()
  const allPhases = useMemo(() => getMainSlides(slides), [slides])
  const soloPhase = useMemo(() => {
    if (soloScenarioId)
      return (
        allPhases.find((phase) =>
          getSubslides(phase.id, slides).some(
            (scenario) => scenario.id === soloScenarioId,
          ),
        ) ?? null
      )
    if (soloPhaseId)
      return allPhases.find((phase) => phase.id === soloPhaseId) ?? null
    return null
  }, [allPhases, slides, soloScenarioId, soloPhaseId])
  const phases = useMemo(
    () => (soloPhase ? [soloPhase] : allPhases),
    [allPhases, soloPhase],
  )
  const scenarioIds = soloScenarioId
    ? [soloScenarioId]
    : soloPhase
      ? getSubslides(soloPhase.id, slides).map((scenario) => scenario.id)
      : slides.filter((slide) => isSubslide(slide)).map((slide) => slide.id)
  const isDetail = view === 'detail'
  const focusedScenarioId =
    isDetail && isSubslide(activeSlide) ? activeSlide.id : null
  const focusedPhaseId = isDetail
    ? isSubslide(activeSlide)
      ? getParentSlide(activeSlide, slides)?.id
      : activeSlide.id
    : null

  const {
    pathsByScenario,
    blueprintsByPathId,
    loading: blueprintsLoading,
    progress: blueprintsProgress,
    filterPaths: overviewPaths,
    filterSelectedPathIds: overviewSelectedPathIds,
    viewType: overviewViewType,
    resolveSelectedPathIds,
  } = usePhaseBlueprintFilters({
    scenarioIds,
    slides,
    getScenarioDisplayViewType,
    setScenarioDisplayViewType,
  })

  const overviewReady = !slidesLoading && !blueprintsLoading
  // Content holds until the bar has visibly REACHED 100%: readiness flips
  // the bar to full, and the reveal follows a beat later — loading ends at
  // a full bar, never mid-bar.
  // Lazy init + the sawLoading ref: a WARM mount (everything cached,
  // ready on first render) settles instantly — the 450 ms full-bar dwell
  // only applies when this mount actually showed a loading pass, else
  // every tab-switch back would flash a skeleton that used to be instant.
  const [overviewSettled, setOverviewSettled] = useState(() => overviewReady)
  const sawLoadingRef = useRef(!overviewReady)
  useEffect(() => {
    if (!overviewReady) sawLoadingRef.current = true
    const timer = window.setTimeout(
      () => setOverviewSettled(overviewReady),
      overviewReady && sawLoadingRef.current ? 450 : 0,
    )
    return () => window.clearTimeout(timer)
  }, [overviewReady])
  // One session for the canvas skeleton AND the progress overlay: they are
  // separate DeferredSkeleton instances (canvas space vs screen space), and
  // only a shared key makes them appear and leave as one surface.
  const canvasHoldKey = skeletonHoldKey ?? 'service-overview-canvas'
  const fitSelector = getCanvasFocusSelector(view, activeSlide)
  const maxFitZoom = getCanvasFocusMaxZoom(view)
  const fitInsets = getCanvasFocusFitInsets(view)
  // The phone's fit floor. A phase board is far wider than a phone, so an
  // unfloored fit lands around 0.2 — under the semantic threshold, which is
  // why the default view arrived as a grid of grey blocks with nothing to
  // read. Floored, the camera frames the board's top-left at a legible
  // scale and the reader pans from there. Desktop keeps the true fit: a
  // laptop can hold a whole phase at a readable size.
  const minFitZoom = mobileShell ? MOBILE_MIN_FIT_ZOOM : undefined
  const semanticZoomThreshold = mobileShell
    ? MOBILE_SEMANTIC_ZOOM_THRESHOLD
    : undefined

  /*
    Skeleton geometry — real phase count and real scenarios per phase from
    nav metadata, plus the REAL panel size for any scenario whose blueprint
    has already landed.

    The camera pre-fits against these frames, so how close they are to the
    finished board is exactly how far the camera has to move afterwards. A
    scenario panel's size is not a guess: `getBlueprintArtboardSize` derives
    it from the blueprint's step count and layer/divider/corridor counts,
    all fixed constants. The estimator used to ignore that and assume a flat
    640 x min-height per scenario, which on a real board was ~2.4x off — and
    that error IS the corrective zoom the reveal was built to hide.

    Nav metadata still carries the shape while blueprints are in flight, so
    the estimate improves as the data arrives rather than waiting for it.
  */
  const skeletonPhases = useMemo(
    () =>
      phases.map((phase) => {
        const scenarios = soloScenarioId
          ? [soloScenarioId]
          : getSubslides(phase.id, slides).map((slide) => slide.id)
        const panels = scenarios
          .map((scenarioId) => {
            const paths = pathsByScenario.get(scenarioId) ?? []
            const blueprint = paths
              .map((path) => blueprintsByPathId.get(path.id))
              .find((entry): entry is BlueprintData => entry !== undefined)
            return blueprint ? getBlueprintArtboardSize(blueprint) : null
          })
          .filter((size): size is ArtboardSize => size !== null)
        return {
          id: phase.id,
          scenarioCount: scenarios.length,
          ...(panels.length === scenarios.length && panels.length > 0
            ? {
                panelWidth: Math.max(...panels.map((size) => size.width)),
                panelHeight: Math.max(...panels.map((size) => size.height)),
              }
            : {}),
        }
      }),
    [blueprintsByPathId, pathsByScenario, phases, slides, soloScenarioId],
  )

  // Camera key. Deliberately excludes the selected path ids: toggling a path
  // is a filter, not a navigation, and having it here threw away the user's
  // pan/zoom on every checkbox. `focusNonce` bumps on each nav click so
  // re-selecting the row you are already on recenters after panning away.
  const fitKey = overviewReady
    ? `service-canvas:${view}:${cameraTargetId ?? 'none'}:${phases.length}-${scenarioIds.length}:${focusNonce}`
    : `service-canvas:loading:${skeletonPhases.map((phase) => phase.scenarioCount).join('-') || 'unknown'}`

  // The cell-detail panel clears its selection when this changes, so it must
  // track navigation only — never the camera's own bookkeeping. `fitKey`
  // flips once when the skeleton swaps to content, which is not a
  // navigation, and using it here silently deselected any cell picked in the
  // first moments after a load.
  const cellDetailResetKey = `service-canvas:${view}:${cameraTargetId ?? 'none'}:${focusNonce}`

  // Every fit up to and including the swap to content is a jump. The
  // skeleton fit frames a fresh mount (animating it would swoop in from
  // pan 0,0 / zoom 1) and the swap fit only corrects the skeleton's
  // approximate geometry under the 200 ms content fade — neither is a
  // navigation, so neither animates. Navigations after that do.
  const [contentSettled, setContentSettled] = useState(false)
  useEffect(() => {
    if (!overviewReady || contentSettled) return
    // Deferred to a microtask so this render does not cascade: the fit for
    // the swap commit was already scheduled (by the viewport's effect,
    // which runs first) with animation off, and the flag only needs to be
    // true by the time the *next* navigation changes the fit key.
    queueMicrotask(() => setContentSettled(true))
  }, [contentSettled, overviewReady])

  /*
   * Progressive reveal — landing only (per mount; navigations never re-run
   * it, a board already on screen must not have its data vanish).
   *
   * The contract, in order:
   *
   *   A  loading    progress bar in screen space; board mounted but
   *                   invisible (stage 0). Queries land.
   *   B  staging     THE BAR IS STILL UP. Layout settles, the camera snaps
   *                   to its final fit — every adjustment happens behind a
   *                   surface that is already there, so none is ever seen.
   *                   Nothing on screen changes; the bar is simply working.
   *   C  handoff     bar dissolves FIRST, over one full beat, board still
   *                   hidden. Only once it has gone do the lanes begin.
   *                   Sequential, not a crossfade: two opacity animations
   *                   over the same pixels read as a flash. And never a
   *                   gap either — the bar is up until the beat it leaves.
   *   ── layout goes quiet ──    nothing below starts until the board has
   *                               stopped resizing, so the camera is FIXED
   *                               before anything detailed exists to see
   *   D  disclosure, each arrival overlapping the next beat:
   *        stage 1  phase frames + lane structure
   *        stage 2  scenario panels rise in
   *        stage 3  cells fade in
   *        stage 4  trigger arrows fade in
   *        stage 5  done — attribute removed, reveal CSS stops matching
   *
   * The stability gate is what was missing in earlier cuts: beats keyed off
   * the content swap alone ran while the board was still growing, so the
   * camera's corrective moves played mid-reveal as a zoom nobody asked for.
   * A ResizeObserver on the board plus one quiet interval (a fade beat)
   * orders them strictly: camera first, then curtain.
   */
  const [revealStage, setRevealStage] = useState(0)
  /**
   * The bar's own dissolve, which STARTS the chain. Everything after it is
   * driven by the previous layer finishing, not by a clock.
   */
  const [barDissolving, setBarDissolving] = useState(false)
  const revealStartedRef = useRef(false)
  /**
   * Highest stage already advanced out of.
   *
   * A PERFORMANCE guard, not a correctness one — worth stating precisely,
   * because it looks like the latter. Hundreds of cells finish their fade in
   * the same frame and each bubbles a `transitionend`, but every handler in
   * that burst closes over the same `revealStage` and so calls `setState`
   * with an identical value, which React bails out of on its own. What this
   * saves is ~600 no-op state calls per layer on a full board; what it does
   * not do is make a late event from an earlier stage harmless, because
   * such an event carries the stage it was captured at and is refused by
   * the same comparison.
   */
  const advancedRef = useRef(-1)
  /*
   * Publish the stage for the surfaces outside this canvas that have to
   * arrive with it — today the sidebar's boot layer.
   *
   * OPT-IN, and only the shell's base canvas opts in. Every mount used to
   * publish, and this component also backs slice tabs and the phone shell:
   * switching between a slice tab and the workspace remounted it, published
   * stage 0, and dropped the sidebar's full boot skeleton over an already
   * populated sidebar for ~450 ms on an ordinary tab switch. Nothing in the
   * sidebar is loading there — only the shell's own boot has a sidebar to
   * wait for.
   *
   * A LAYOUT effect, deliberately: the base canvas mounts in the same commit
   * the reader leaves the cover page, and a stage published after paint
   * would let the sidebar paint one frame of finished rows before flipping
   * to its skeleton. Reset to done on unmount so a sidebar that outlives
   * this canvas is never stranded on a skeleton.
   */
  useLayoutEffect(() => {
    if (!onRevealStage) return
    onRevealStage(revealStage)
    /*
      The reset rides the SAME phase as the write. It used to be a passive
      effect, and React flushes passive destroys for a deleted tree after
      the commit that replaced it — so a canvas handing over to another
      publishing canvas would go: new canvas's layout effect writes 0, paint,
      then the OLD canvas's passive cleanup writes DONE over it. The store
      would claim the boot was finished while the live canvas still had its
      loading bar up, and the new canvas would never republish 0 because its
      deps had not changed. Only one mount publishes today, so this was
      latent rather than live; same-phase writes retire the hazard instead
      of relying on that staying true.
    */
    return () => onRevealStage(CANVAS_REVEAL_DONE)
  }, [onRevealStage, revealStage])

  const advanceReveal = useCallback((from: number) => {
    if (from < CANVAS_REVEAL_LANES || from >= CANVAS_REVEAL_DONE) return
    if (advancedRef.current >= from) return
    advancedRef.current = from
    setRevealStage(from + 1)
  }, [])

  /*
   * EVENT-CHAINED, not timed. Each layer opens because the previous one
   * finished — `transitionend` bubbling from the board root — so the
   * sequence cannot drift when a frame is slow or a stage is heavier than
   * its budget, and no two layers can ever animate at once. Timers survive
   * only as a watchdog: if a layer has nothing to animate (a board with no
   * arrows, a cancelled transition) its event never arrives, and the chain
   * must not stall there.
   */
  useEffect(() => {
    if (revealStage >= CANVAS_REVEAL_DONE) return
    /*
      STAGE 0 IS COVERED TOO, and that is the important part.

      Stage 0 used to have no floor: its only exits were the bar's
      `transitionend` and a handoff timer owned by the gate effect below.
      That effect latches `revealStartedRef` BEFORE its timers resolve and
      clears those timers in its cleanup — so if its deps changed in the
      window between (a background refetch flipping `overviewSettled`, which
      unmounts the board and nulls `overviewEl`), the re-run hit the latch,
      returned early, and rescheduled nothing. `barDissolving` was already
      true, so no property changed and no `transitionend` ever came. The
      board stayed `visibility: hidden` forever, and the shell's boot layer —
      keyed on `revealStage < 1` — stayed opaque over the sidebar with
      `role="status"` announcing "Loading the workspace". A dead app, one
      stray refetch away, recoverable only by reload.

      This watchdog keys on `revealStage`, not on a latch, so it re-arms on
      every re-run and cannot be stranded by one. Stage 0's budget is the
      whole staging window (the gate's own hard cap plus a margin) so it
      only ever fires when the gate has genuinely failed to.
    */
    const watchdog = window.setTimeout(
      () => {
        if (revealStage === 0) {
          setRevealStage((stage) => (stage === 0 ? 1 : stage))
          return
        }
        advanceReveal(revealStage)
      },
      revealStage === 0 ? MOTION_CAMERA_MS * 8 : MOTION_STRUCTURAL_MS * 2,
    )
    return () => window.clearTimeout(watchdog)
  }, [revealStage, advanceReveal])

  useEffect(() => {
    /*
      Keyed on `overviewSettled` + `overviewEl`, NOT on `contentSettled`.
      `contentSettled` flips the moment the data is ready — up to 450ms
      BEFORE DeferredSkeleton mounts the board. Keyed there, this effect ran
      while `overviewRef.current` was null: the observer observed nothing,
      the quiet timer fired unopposed, and the whole choreography played out
      against an unmounted board — which then mounted fully visible at a
      mid-layout framing and was corrected in plain view.
    */
    if (!overviewSettled || !overviewEl || revealStartedRef.current) return
    /*
      A WARM MOUNT STILL WAITS. Tried and reverted, 2026-08-18.

      A review flagged that keying the bar on the reveal hands warm mounts a
      ceremony they used to be spared, and proposed jumping straight to done
      when `sawLoadingRef` never tripped. That reads correct and is wrong
      here: the stability gate is not covering the DATA wait, it is covering
      the CAMERA. Layout settles and the fit snaps after mount whether or not
      a query was in flight, so skipping the gate on a warm load put the
      board on screen at whatever framing existed at mount — which is the
      "random landing, zoomed into the middle of nowhere" this whole
      choreography was built to remove. Verified by reverting it and watching
      the board come back fitted.

      The honest cost is a beat of ceremony on an instant load. The
      alternative is the bug.
    */
    if (prefersReducedMotion()) {
      revealStartedRef.current = true
      const timer = window.setTimeout(() => {
        setBarDissolving(true)
        advancedRef.current = CANVAS_REVEAL_DONE
        setRevealStage(CANVAS_REVEAL_DONE)
      }, 0)
      return () => window.clearTimeout(timer)
    }
    let stabilityTimer = 0
    let handoffTimer = 0
    let disposed = false
    const begin = () => {
      if (revealStartedRef.current) return
      revealStartedRef.current = true
      observer.disconnect()
      // Only the bar dissolves here. Stage 1 waits for it to finish (the
      // bar's own `onTransitionEnd`), and every stage after that waits for
      // the layer before it.
      setBarDissolving(true)
      // Watchdog for the handoff itself: if the bar never transitions (it
      // was never shown on a warm load, so there is nothing to fade), the
      // chain still has to start.
      handoffTimer = window.setTimeout(() => {
        setRevealStage((stage) => (stage === 0 ? 1 : stage))
      }, MOTION_FADE_MS * 2)
    }
    /*
      One camera beat of quiet, after the fonts have landed. The window can
      be short because the LOADING BAR covers it: the wait is honest progress
      rather than a dead canvas.
    */
    const arm = () => {
      window.clearTimeout(stabilityTimer)
      stabilityTimer = window.setTimeout(begin, MOTION_CAMERA_MS)
    }
    const observer = new ResizeObserver(arm)
    /*
      Optional-chained and caught: fonts are ADVISORY here — they are one
      more reason the board might still reflow, not a precondition for
      showing it. jsdom does not implement `document.fonts` at all, so the
      bare read threw inside an effect (which React escalates to unmounting
      the tree) in any component test that rendered this view.
    */
    const fontsReady = document.fonts?.ready ?? Promise.resolve()
    void fontsReady
      .catch(() => undefined)
      .then(() => {
        if (disposed || revealStartedRef.current) return
        observer.observe(overviewEl)
        arm()
      })
    /*
      Hard cap. The bar is gated on this reveal rather than on the data, so
      a board that never goes quiet would strand it on screen forever.
    */
    const capTimer = window.setTimeout(begin, MOTION_CAMERA_MS * 6)
    return () => {
      disposed = true
      window.clearTimeout(stabilityTimer)
      window.clearTimeout(handoffTimer)
      window.clearTimeout(capTimer)
      observer.disconnect()
    }
  }, [overviewSettled, overviewEl])

  const noPathsSelected =
    overviewPaths.length > 0 && overviewSelectedPathIds.length === 0

  const postToPreLoop = soloPhase
    ? null
    : getOverviewPostToPreLoopTransition(phases)
  const cellDetailBlueprints = useMemo(
    () => [...blueprintsByPathId.values()],
    [blueprintsByPathId],
  )
  // Cells open the detail panel only when a SCENARIO is the focus — either
  // selected in the base view or scoped by a slice tab (soloScenarioId).
  // Everywhere wider (overview zoom, a phase's row of boards) cells stay
  // inert, so clicks fall through to the scenario/phase panels and navigate.
  // Phase-level detail used to qualify, which reintroduced the "panel opens
  // from the zoomed-out view" bug this gate exists to prevent.
  const cellDetailEnabled =
    isBlueprintCellDetailEnabled() &&
    isDetail &&
    (focusedScenarioId !== null || soloScenarioId != null)

  const focusedHeader = useMemo(() => {
    if (!isDetail) return null

    const scopeScenarioIds = isSubslide(activeSlide)
      ? [activeSlide.id]
      : getSubslides(activeSlide.id, slides).map((scenario) => scenario.id)

    const scopedPaths = collectOverviewPathOptionsForScenarios(
      pathsByScenario,
      scopeScenarioIds,
    )
    const scopedPathIds = new Set(scopedPaths.map((path) => path.id))
    const scopedSelectedPathIds = overviewSelectedPathIds.filter((id) =>
      scopedPathIds.has(id),
    )

    return {
      slide: activeSlide,
      paths: scopedPaths,
      selectedPathIds: scopedSelectedPathIds,
    }
  }, [
    activeSlide,
    isDetail,
    overviewSelectedPathIds,
    pathsByScenario,
    slides,
  ])

  // The viewport below has already scheduled this fit with animation
  // suppressed (child effects run before parent effects), so release the
  // one-shot now — every later navigation animates.
  useEffect(() => {
    if (!overviewReady || !skipCanvasFitAnimation) return
    consumeCanvasFitAnimationSkip()
  }, [overviewReady, skipCanvasFitAnimation, consumeCanvasFitAnimationSkip])

  return (
    <CanvasZoomChromeProvider>
      <BlueprintCellDetailProvider
        resetKey={cellDetailResetKey}
        enabled={cellDetailEnabled}
        blueprints={cellDetailBlueprints}
      >
        <CanvasFocusEscapeHandler />
        <div className="flex min-h-0 min-w-0 flex-1 flex-col">
          {renderHeader ? (
            /*
              The band arrives WITH the canvas, on the same beat the bottom
              toolbar does — both are furniture of the board, and neither
              should be finished while the board is still staging. Through
              DeferredSkeleton on the canvas's own hold key, so it inherits
              the session the embedding surface's earlier phases opened and
              swaps with one fade rather than popping.
            */
            <DeferredSkeleton
              loading={
                revealStage < CANVAS_REVEAL_LANES &&
                renderHeaderSkeleton !== undefined
              }
              holdKey={canvasHoldKey}
              skeleton={renderHeaderSkeleton?.() ?? null}
            >
              {renderHeader()}
            </DeferredSkeleton>
          ) : focusedHeader ? (
            <SlideStickyHeader
              slide={focusedHeader.slide}
              slides={slides}
              paths={focusedHeader.paths}
              selectedPathIds={focusedHeader.selectedPathIds}
            />
          ) : // Overview: no navbar. The workspace tab in the top nav already
          // names the view; a bar holding only a repeated title read as a
          // broken fragment. The zoom pill floats over the canvas instead.
          null}
          <div
            className="relative min-h-0 min-w-0 flex-1 overflow-hidden"
            data-slide-canvas
            /*
              Canvas chrome (annotation toolbar, zoom pill, sequence nav) is
              furniture OF the canvas, and it renders as a sibling of the
              revealed board rather than inside it — so it needs its own
              handle.

              It opens WITH the lanes (stage 1) and finishes as the scenario
              blurbs begin (stage 2) — its fade is one `--motion-fade`, the
              same beat the chain advances on, so it lands exactly on the
              handover. It waited until stage 4 in the first cut, which read
              as the toolbar being an afterthought bolted on at the end;
              starting it with the first layer makes the canvas and its
              controls one arriving surface. What it must never do is float
              over the loading bar, which stage 0 still prevents.
            */
            /*
              Dropped entirely once the reveal is done, exactly as the board
              root drops `data-canvas-reveal`: left on, its transition rule
              keeps matching the toolbar and the zoom pill for the life of
              the canvas. Nothing declares a competing opacity transition
              today, which is precisely why it would be found late.
            */
            {...(revealStage < CANVAS_REVEAL_DONE
              ? {
                  'data-canvas-reveal-chrome':
                    revealStage < CANVAS_REVEAL_LANES && !noPathsSelected
                      ? 'pending'
                      : 'shown',
                }
              : {})}
          >
            {floatingChrome ? (
              <div
                className={cn(
                  'pointer-events-none absolute bottom-4 z-30 [&>*]:pointer-events-auto',
                  // Bottom-centered on the phone (thumb reach, and the
                  // corner is where the agent FAB lives); bottom-right on
                  // desktop, beside the cursor's natural resting corner.
                  mobileShell ? 'left-1/2 -translate-x-1/2' : 'right-4',
                )}
              >
                {floatingChrome}
              </div>
            ) : null}
            {/* Reset View is a MOBILE affordance (no scroll wheel, easy to
                lose the canvas): bottom-centered under the thumb. Desktop
                has no Reset View at all — double-click/Home reframe. */}
            {mobileShell && !renderHeader ? (
              <div className="pointer-events-none absolute bottom-4 left-1/2 z-30 flex -translate-x-1/2 items-center [&>*]:pointer-events-auto">
                <NavbarZoomIndicator />
              </div>
            ) : null}
            {noPathsSelected ? (
              <div className="absolute inset-0 flex">
                <CanvasEmptyState />
              </div>
            ) : (
              <ZoomPanViewport
                resetKey={fitKey}
                fitSelector={fitSelector}
                maxFitZoom={maxFitZoom}
                minFitZoom={minFitZoom}
                semanticZoomThreshold={semanticZoomThreshold}
                fitMargin={fitInsets.margin}
                fitTopInset={fitInsets.topInset}
                fitBottomInset={fitInsets.bottomInset}
                animateFit={!skipCanvasFitAnimation && contentSettled}
                // Off. The prev/next phase pair sat at the bottom corners
                // flanking the tool bar, which made three bottom controls
                // that look alike and do unrelated things — and the sidebar
                // already navigates phases, with the whole list visible
                // rather than one neighbour at a time.
                showSequenceNav={false}
                onResetView={isDetail ? goHome : undefined}
                className="absolute inset-0"
                panIgnoreSelector={OVERVIEW_PAN_IGNORE}
                focusCellsKey={focusedScenarioId ?? soloScenarioId ?? undefined}
              >
                <DeferredSkeleton
                  loading={!overviewSettled}
                  holdKey={canvasHoldKey}
                  // The reveal owns this board's entrance (`data-canvas-reveal`
                  // below). Without this the wrapper ALSO ran a 200ms
                  // `animate-in fade-in` the moment the data resolved — a
                  // second opacity animation over the same pixels, firing
                  // mid-load while the bar was still up, owned by nobody.
                  fadeOnSwap={false}
                  skeleton={
                    /*
                      `invisible`, not removed: the skeleton's geometry still
                      seeds the loading-phase camera fit, but it must never
                      PAINT. A painted skeleton board sits at the estimator's
                      framing and the real board then appears at the true
                      fit — two boards at visibly different framings, which
                      reads as a camera correction no matter how instant the
                      cut. The loading surface is the progress bar alone
                      (screen-space, camera-independent); the first board the
                      reader ever sees is the revealed one, already framed.
                    */
                    <div className="invisible" aria-hidden>
                      <ServiceOverviewCanvasSkeleton
                        phases={skeletonPhases}
                        loopChannelOffset={
                          postToPreLoop
                            ? PHASE_OVERVIEW_LOOP_CHANNEL_OFFSET + 16
                            : 0
                        }
                      />
                    </div>
                  }
                >
                  <div
                    ref={(node) => {
                      overviewRef.current = node
                      setOverviewEl(node)
                    }}
                    data-service-overview
                    data-canvas-fit
                    // `undefined` omits the attribute and a number is
                    // stringified — React already does what the conditional
                    // spread was doing by hand.
                    data-canvas-reveal={
                      revealStage < CANVAS_REVEAL_DONE ? revealStage : undefined
                    }
                    // Each layer's fade completing is what opens the next.
                    // `transitionend` bubbles, so one handler on the root
                    // hears the board, the panels, the cells and the arrows.
                    /*
                      The sender must be the layer we are waiting on.

                      `transitionend` bubbles — that is what makes one
                      handler enough — but it also means this hears EVERY
                      opacity transition anywhere in a 663-cell subtree, and
                      the board is full of them: the scenario title badge's
                      hover, the visual play button's, the column and lane
                      handles, the empty-cell slots, the slice sequence
                      badge's threshold fade. A reader whose cursor is
                      resting over the canvas (where they just clicked) and
                      who twitches it once could advance the chain a stage
                      early; a few twitches ran it to 5, where the attribute
                      is removed and every in-flight cell transition is
                      deleted mid-flight — hundreds of cells popping at once.
                      It worked on my machine because my cursor was parked
                      over the sidebar I had just clicked.

                      One `matches()` per event closes it. Anything hovering
                      is on a party line; only the layer this stage opened
                      may advance it.
                    */
                    onTransitionEnd={(event) => {
                      if (event.propertyName !== 'opacity') return
                      const selector = REVEAL_STAGE_SOURCE[revealStage]
                      if (!selector) return
                      const target = event.target
                      if (!(target instanceof Element)) return
                      if (selector === REVEAL_ROOT_SOURCE) {
                        if (target !== event.currentTarget) return
                      } else if (!target.matches(selector)) {
                        return
                      }
                      advanceReveal(revealStage)
                    }}
                    className="relative inline-flex w-max flex-col items-start"
                    style={{
                      paddingTop: OVERVIEW_CANVAS_PADDING_Y,
                      paddingBottom: OVERVIEW_CANVAS_PADDING_Y,
                      paddingRight: OVERVIEW_CANVAS_PADDING_X,
                      paddingLeft:
                        OVERVIEW_CANVAS_PADDING_X +
                        (postToPreLoop
                          ? PHASE_OVERVIEW_LOOP_CHANNEL_OFFSET + 16
                          : 0),
                    }}
                  >
                    {phases.map((phase, index) => {
                      const phaseIsFocused = focusedPhaseId === phase.id
                      const dimPhase = isDetail && !phaseIsFocused

                      return (
                        <Fragment key={phase.id}>
                          {index > 0 &&
                          !shouldShowOverviewPhaseFlowArrow(
                            phases[index - 1],
                            phase,
                          ) ? (
                            <OverviewPhaseRowDivider />
                          ) : null}
                          <ServicePhaseSection
                            phase={phase}
                            slides={slides}
                            pathsByScenario={pathsByScenario}
                            blueprintsByPathId={blueprintsByPathId}
                            getSelectedPathIds={resolveSelectedPathIds}
                            displayViewType={overviewViewType}
                            onOpenPhase={openDetail}
                            dimmed={dimPhase}
                            focusActive={phaseIsFocused}
                            focusedScenarioId={
                              phaseIsFocused ? focusedScenarioId : null
                            }
                            onlyScenarioId={soloScenarioId ?? null}
                            showFlowArrow={shouldShowOverviewPhaseFlowArrow(
                              phase,
                              phases[index + 1],
                            )}
                            isFlowArrowAnchor={isOverviewFlowArrowAnchorPhase(
                              phase,
                            )}
                            isLoopArrowFrom={
                              phase.id === postToPreLoop?.fromPhaseId
                            }
                            isLoopArrowTo={phase.id === postToPreLoop?.toPhaseId}
                          />
                        </Fragment>
                      )
                    })}
                    {postToPreLoop ? (
                      <PhaseOverviewPhaseLoopArrow
                        overviewRef={overviewRef}
                        overviewEl={overviewEl}
                      />
                    ) : null}
                  </div>
                </DeferredSkeleton>
              </ZoomPanViewport>
            )}
            {/*
                Determinate load progress, in SCREEN space — the shaped
                skeleton lives inside the viewport and scales with the
                camera, but a progress bar must not. Same holdKey, so it
                joins the skeleton's session and fast loads see neither.

                Gated on the REVEAL, not on the data. Keyed on
                `overviewSettled` the bar left the moment the queries
                resolved — while the board was still staging behind it — and
                the reader got a dead empty canvas until stage 1 opened.
                Held to `revealStage`, the bar covers the whole staging
                window (layout settling, camera snapping) and hands over to
                the board directly: it fades out across stage 1 while the
                lanes fade in, then unmounts at stage 2. Never a gap.
            */}
            {!noPathsSelected ? (
              // role=status lives HERE now: the shaped skeleton went
              // visibility-hidden (the bar is the one visible signal), and
              // visibility removes it from the accessibility tree with it.
              <div
                role={revealStage < CANVAS_REVEAL_LANES ? 'status' : undefined}
                aria-label={
                  revealStage < CANVAS_REVEAL_LANES ? 'Loading canvas' : undefined
                }
                className={cn(
                  'pointer-events-none absolute inset-0 z-20 flex items-center justify-center',
                  'transition-opacity duration-(--motion-fade) ease-out',
                  barDissolving && 'opacity-0',
                )}
                // The bar finishing its dissolve is what opens stage 1 —
                // the handoff is chained, not scheduled, so the lanes can
                // never begin while any of the bar is still on screen.
                onTransitionEnd={(event) => {
                  if (event.propertyName !== 'opacity') return
                  setRevealStage((stage) => (stage === 0 ? 1 : stage))
                }}
              >
                <DeferredSkeleton
                  /*
                    Unmounts a beat AFTER the dissolve finishes, not on the
                    same beat. The fade is one `--motion-fade` and stage 1 is
                    one `--motion-fade` away, so unmounting there was an exact
                    tie — a frame of scheduling jitter either way and the bar
                    vanishes mid-fade instead of completing it. It sits at
                    opacity 0 (and pointer-events-none) for the extra beat,
                    which costs nothing and cannot be seen.
                  */
                  loading={revealStage < CANVAS_REVEAL_PANELS}
                  holdKey={canvasHoldKey}
                  skeleton={
                    <CanvasLoadProgress
                      progressKey={canvasHoldKey}
                      stages={[
                        { label: firstStageLabel, done: !slidesLoading },
                        {
                          label: 'Loading blueprints…',
                          done: !blueprintsLoading,
                        },
                      ]}
                      // Real ticks: the structure query + each settled
                      // blueprint chunk is one unit — no synthetic fill.
                      units={{
                        loaded:
                          (slidesLoading ? 0 : 1) + blueprintsProgress.loaded,
                        total: 1 + blueprintsProgress.total,
                      }}
                    />
                  }
                >
                  {null}
                </DeferredSkeleton>
              </div>
            ) : null}
            {cellDetailEnabled ? <BlueprintCellDetailPanel /> : null}
          </div>
        </div>
      </BlueprintCellDetailProvider>
    </CanvasZoomChromeProvider>
  )
}

/**
 * Memoised, because the shell re-renders it for reasons that have nothing
 * to do with the board.
 *
 * `DesktopEditorShell` subscribes to the reveal store, so every stage change
 * re-rendered it — and `ActiveTabContent` is a plain function passing fresh
 * props, so each of those re-rendered all ~660 cells. The publication is a
 * layout effect, so that work landed BEFORE the paint of the stage it
 * announced: each beat's first frame was gated on a full board reconcile,
 * inside the window where hundreds of opacity transitions are meant to be
 * running smoothly. The same barrier fixes an older one — dragging the
 * sidebar divider calls `setAsideWidth` per pointermove, which was
 * re-rendering the whole board at 60 Hz.
 */
export const ServiceOverviewView = memo(ServiceOverviewViewImpl)
