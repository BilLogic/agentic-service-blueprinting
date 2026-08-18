import {
  Fragment,
  useEffect,
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
import type { BlueprintData } from '@/types/blueprint'
import type { PathListItem } from '@/lib/pathSelection'
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
  /** Floating chrome anchored bottom-right inside the canvas (slice tabs' Reset View). */
  floatingChrome?: ReactNode
}

/**
 * The overview canvas — every phase and scenario on one zoomable board.
 * `renderHeader` and `floatingChrome` let an embedding tab (slice focus) swap
 * the docked header and add its own canvas-anchored controls.
 */
export function ServiceOverviewView({
  skeletonHoldKey,
  soloScenarioId,
  soloPhaseId,
  renderHeader,
  floatingChrome,
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

  // Skeleton geometry, taken from nav metadata (which lands before the
  // blueprints): real phase count, real scenarios per phase. The camera
  // fits these frames, so the swap to content barely moves it.
  const skeletonPhases = useMemo(
    () =>
      phases.map((phase) => ({
        id: phase.id,
        scenarioCount: soloScenarioId
          ? 1
          : getSubslides(phase.id, slides).length,
      })),
    [phases, slides, soloScenarioId],
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
            renderHeader()
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
                  skeleton={
                    <ServiceOverviewCanvasSkeleton
                      phases={skeletonPhases}
                      loopChannelOffset={
                        postToPreLoop
                          ? PHASE_OVERVIEW_LOOP_CHANNEL_OFFSET + 16
                          : 0
                      }
                    />
                  }
                >
                  <div
                    ref={(node) => {
                      overviewRef.current = node
                      setOverviewEl(node)
                    }}
                    data-service-overview
                    data-canvas-fit
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
            {/* Determinate load progress, in SCREEN space — the shaped
                skeleton lives inside the viewport and scales with the
                camera, but a progress bar must not. Same holdKey, so it
                joins the skeleton's session: appears together after the
                250 ms hold, leaves in the same commit the content fades
                in, and fast loads see neither. */}
            {!noPathsSelected ? (
              // role=status lives HERE now: the shaped skeleton went
              // visibility-hidden (the bar is the one visible signal), and
              // visibility removes it from the accessibility tree with it.
              <div
                role={overviewSettled ? undefined : 'status'}
                aria-label={overviewSettled ? undefined : 'Loading canvas'}
                className="pointer-events-none absolute inset-0 z-20 flex items-center justify-center"
              >
                <DeferredSkeleton
                  loading={!overviewSettled}
                  holdKey={canvasHoldKey}
                  skeleton={
                    <CanvasLoadProgress
                      stages={[
                        { label: 'Loading structure…', done: !slidesLoading },
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
