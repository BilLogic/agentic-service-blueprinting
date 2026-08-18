import { useEffect, useMemo, useRef, type RefObject } from 'react'
import { ResizableComparePanel } from '@/components/blueprint/ResizableComparePanel'
import { ServiceBlueprintGrid } from '@/components/blueprint/ServiceBlueprintGrid'
import { MergedCompareGrid } from '@/components/blueprint/MergedCompareGrid'
import { SideBySideCompareGrid } from '@/components/blueprint/SideBySideCompareGrid'
import { StackedCompareGrid } from '@/components/blueprint/StackedCompareGrid'
import {
  CompareDivergenceStrip,
  COMPARE_STRIP_HEIGHT,
} from '@/components/blueprint/CompareDivergenceStrip'
import { useBlueprintCellDetailOptional } from '@/contexts/BlueprintCellDetailContext'
import { useEditor } from '@/contexts/EditorContext'
import { registerCompareReview } from '@/lib/compareReviewStore'
import {
  buildCompareModel,
  type CompareBlueprints,
} from '@/lib/compareSlots'
import { itemsInSelectionOrder, type PathListItem } from '@/lib/pathSelection'
import {
  getComparePanelHeight,
  getComparePanelWidth,
  getMergedComparePanelHeight,
  getPanelHeightFromSwimlaneBody,
  getStackedComparePanelHeight,
  getStackedComparePanelWidth,
} from '@/lib/sideBySideCompareLayout'

export {
  getScenarioBlueprintPanelHeight,
  getScenarioSwimlaneBodyHeight,
} from '@/lib/sideBySideCompareLayout'
export type { ScenarioSwimlaneLayoutInput } from '@/lib/sideBySideCompareLayout'
import {
  getParentSlide,
  getSlideDisplayLabel,
  type NavItem,
  type SlideViewType,
} from '@/types/nav'
import { BlueprintPanelLoadingSkeleton } from '@/components/editor/EditorLoadingSkeletons'
import type { BlueprintData } from '@/types/blueprint'

type ScenarioBlueprintPanelProps = {
  slide: NavItem
  slides: NavItem[]
  paths: PathListItem[]
  selectedPathIds: string[]
  blueprintsByPathId: Map<string, BlueprintData>
  loading?: boolean
  scrollContainerRef?: RefObject<HTMLDivElement | null>
  /** When set, scenario title sits on the gray panel; path frames show path type. */
  sectionTitleLabel?: string
  /** Fixed panel height (phase overview uses the max across scenarios). */
  lockedPanelHeight?: number
  /** Fixed white swimlane board height shared across a phase row. */
  fixedSwimlaneBodyHeight?: number
  /** When true, panel height does not grow with measured content. */
  lockPanelHeight?: boolean
  /** When set, clicking the panel opens this scenario. */
  onNavigate?: () => void
  /** Phase/overview filter view type — keeps row sizing aligned across scenarios. */
  displayViewType?: SlideViewType
  /** When true, this panel is visually de-emphasized (canvas focus mode). */
  dimmed?: boolean
  /** When true, this panel is the camera focus target — no hover chrome. */
  focusActive?: boolean
}

/** One scenario's blueprint inside a compare panel — title badge, filters and grid. */
export function ScenarioBlueprintPanel({
  slide,
  slides,
  paths,
  selectedPathIds,
  blueprintsByPathId,
  loading = false,
  scrollContainerRef: scrollContainerRefProp,
  sectionTitleLabel,
  lockedPanelHeight,
  fixedSwimlaneBodyHeight,
  lockPanelHeight = false,
  onNavigate,
  displayViewType: displayViewTypeProp,
  dimmed = false,
  focusActive = false,
}: ScenarioBlueprintPanelProps) {
  const { getScenarioDisplayViewType } = useEditor()
  const internalScrollRef = useRef<HTMLDivElement>(null)
  const scrollContainerRef = scrollContainerRefProp ?? internalScrollRef

  const scenarioName = getSlideDisplayLabel(slide, slides)
  const parentPhase = getParentSlide(slide, slides)
  const phaseName = parentPhase
    ? getSlideDisplayLabel(parentPhase, slides)
    : undefined
  const storedViewType =
    displayViewTypeProp ?? getScenarioDisplayViewType(slide)
  // Compare needs two sides. The toggle hides below 2 selected paths, but
  // the stored override survives — falling back here keeps a scenario from
  // being stranded in a compare it can no longer leave.
  const displayViewType =
    storedViewType === 'merged' && selectedPathIds.length < 2
      ? 'stacked'
      : storedViewType
  const useSideBySideLayout =
    (displayViewType === 'stacked' || displayViewType === 'merged') &&
    selectedPathIds.length > 0
  const useSinglePathLayout =
    displayViewType === 'single' && selectedPathIds.length > 0
  /*
    Two arrangements of the same path bands. Overview rows render under a
    shared-row-height contract (locked heights, phase-uniform view type) and
    keep the horizontal layout; the focused scenario view — no overview
    constraints — stacks the bands vertically on one canonical step axis.
  */
  const isOverviewConstrained =
    lockedPanelHeight !== undefined ||
    fixedSwimlaneBodyHeight !== undefined ||
    displayViewTypeProp !== undefined
  const useStackedArrangement = useSideBySideLayout && !isOverviewConstrained

  const visibleBlueprints = useMemo(
    () =>
      useSideBySideLayout || useSinglePathLayout
        ? itemsInSelectionOrder(selectedPathIds, (id) =>
            blueprintsByPathId.get(id),
          )
        : [],
    [
      blueprintsByPathId,
      selectedPathIds,
      useSideBySideLayout,
      useSinglePathLayout,
    ],
  )

  /*
    THE compare model — computed once here, distributed via props; consumers
    never call `buildCompareModel` themselves. Gated null until every
    selected blueprint is loaded: a half-refreshed pair would fabricate
    flash divergences.
  */
  const compareModel = useMemo(() => {
    if (!useStackedArrangement) return null
    if (visibleBlueprints.length < 2) return null
    if (visibleBlueprints.length !== selectedPathIds.length) return null
    return buildCompareModel(visibleBlueprints as CompareBlueprints)
  }, [selectedPathIds.length, useStackedArrangement, visibleBlueprints])

  /*
    Merged = ONE COMBINED BLUEPRINT (Phase 4b). `MergedCompareGrid` renders
    the compared paths as a single grid — one lane rail, one canonical step
    axis, shared slots drawn once, divergent slots stacking each path's
    version — so the mode is a real canvas change, not a reading posture.

    The reading PRESET: entering Merged opens the Differences ledger, so
    one gesture lands in review posture. (Fold retired 2026-08-17 — the
    step axis no longer compresses on entry.)

    This is THE one seam for it: both entry paths — the menubar
    CompareViewToggle and the agent's `set_scenario_view merged` — mutate the
    EditorContext view override, and both land here as a `displayViewType`
    transition. Gating the tracked mode on `compareModel` makes degenerate
    cases (<2 paths, half-loaded pair, overview rows) a natural no-op, and
    the null-reset means re-entering compare does not replay a stale
    transition.
  */
  const cellDetail = useBlueprintCellDetailOptional()
  const openDifferences = cellDetail?.openDifferences
  const compareMode = compareModel ? displayViewType : null
  const previousCompareModeRef = useRef<SlideViewType | null>(null)
  useEffect(() => {
    const previous = previousCompareModeRef.current
    previousCompareModeRef.current = compareMode
    if (previous === 'stacked' && compareMode === 'merged') {
      openDifferences?.()
    }
  }, [compareMode, openDifferences])

  /*
    Publish THE compare context (model + blueprints + scenario identity) to
    the cross-surface store — the menubar [≠ N] chip, the portalled ledger
    drawer and the agent all read from it. Exactly one panel qualifies at a
    time (only the focused scenario leaves the overview's shared-row
    contract), so the registration is effectively a singleton.
  */
  useEffect(() => {
    if (!compareModel) return
    const unregisterStore = registerCompareReview({
      slideId: slide.id,
      scenarioName,
      phaseName,
      viewMode: displayViewType,
      model: compareModel,
      blueprints: visibleBlueprints,
    })
    return () => {
      unregisterStore()
    }
  }, [
    compareModel,
    displayViewType,
    phaseName,
    scenarioName,
    slide.id,
    visibleBlueprints,
  ])

  /*
    Merged only renders once the model exists — it IS a comparison, so a
    single path or a half-loaded pair has nothing to merge and falls back to
    the stacked bands (which read fine with one band).
  */
  const mergedModel =
    useStackedArrangement && displayViewType === 'merged' ? compareModel : null

  // Arrangement is part of the key: switching stacked bands ⇄ overview row
  // re-measures instead of keeping the other arrangement's size.
  const compareFitContentKey = `${slide.id}:${selectedPathIds.join(',')}:${displayViewType}:${useStackedArrangement ? 'bands' : 'row'}:${paths.length}`
  const stackedColumnCount =
    compareModel?.columns.length ??
    visibleBlueprints.reduce((sum, blueprint) => sum + blueprint.steps.length, 0)
  const sectionTitleDescription = sectionTitleLabel
    ? slide.description
    : undefined
  const showPathTypeBadge = Boolean(sectionTitleLabel)

  const panelHeight =
    lockedPanelHeight ??
    (fixedSwimlaneBodyHeight !== undefined
      ? getPanelHeightFromSwimlaneBody(fixedSwimlaneBodyHeight, {
          lockHeight: lockPanelHeight,
        })
      : mergedModel !== null
        ? // Merged is about one band tall; the swell over divergent slots
          // comes from the panel's measurement, not from this floor.
          getMergedComparePanelHeight(visibleBlueprints)
        : useStackedArrangement
          ? getStackedComparePanelHeight(visibleBlueprints)
          : getComparePanelHeight(visibleBlueprints))

  const fillSwimlaneHeight = fixedSwimlaneBodyHeight !== undefined

  const comparePanelProps = {
    // Compare-grid estimates run hot (the height one predates
    // classification collapsing stacked slots). A floor set from a hot
    // estimate is dead gray space — the measured content rules instead.
    minWidth: useStackedArrangement
      ? getStackedComparePanelWidth(stackedColumnCount)
      : getComparePanelWidth(visibleBlueprints),
    minHeight: panelHeight,
    defaultWidth: useStackedArrangement
      ? getStackedComparePanelWidth(stackedColumnCount)
      : getComparePanelWidth(visibleBlueprints),
    defaultHeight: panelHeight,
    lockHeight: lockPanelHeight,
    onNavigate,
    navigateLabel: onNavigate ? `Open ${scenarioName} scenario` : undefined,
    panelTitleLabel: sectionTitleLabel,
    panelTitleDescription: sectionTitleDescription,
    focusSlideId: slide.id,
    dimmed,
    focusActive,
    scrollContainerRef,
  }

  // The stacked axis needs every selected blueprint before it means anything
  // — a band-by-band trickle would reshuffle canonical columns per arrival.
  const stackedStillLoading =
    loading &&
    useStackedArrangement &&
    selectedPathIds.length >= 2 &&
    visibleBlueprints.length < selectedPathIds.length

  if (
    (loading && visibleBlueprints.length === 0) ||
    stackedStillLoading
  ) {
    return (
      <div
        className="flex flex-col gap-2 transition-[opacity,filter] ease-out"
        data-focus-slide-id={slide.id}
        data-canvas-focus-dimmed={dimmed ? '' : undefined}
        style={dimmed ? { opacity: 0.3, filter: 'saturate(0.5)' } : undefined}
        role="status"
        aria-busy="true"
        aria-label="Loading blueprint"
      >
        <BlueprintPanelLoadingSkeleton />
      </div>
    )
  }

  if (visibleBlueprints.length === 0) {
    // Selected filter paths don't exist here — omit the card entirely so only
    // scenarios that contain the path remain in the phase row.
    if (selectedPathIds.length === 0 && paths.length > 0) {
      return null
    }

    return (
      <div
        className="flex min-h-[280px] min-w-[320px] items-center justify-center rounded-lg border border-dashed p-8 text-center transition-[opacity,filter] ease-out"
        data-focus-slide-id={slide.id}
        data-canvas-focus-dimmed={dimmed ? '' : undefined}
        style={dimmed ? { opacity: 0.3, filter: 'saturate(0.5)' } : undefined}
      >
        <p className="text-sm text-muted-foreground">
          No blueprint data for this scenario yet.
        </p>
      </div>
    )
  }

  if (useSideBySideLayout) {
    // Strip in STACKED only: merged already reads as one combined board
    // (labels + wash carry divergence); the zone strip on top of it was
    // chrome without a job.
    const stripVisible = compareModel !== null && displayViewType !== 'merged'
    return (
      <ResizableComparePanel
        {...comparePanelProps}
        chromeBar={
          stripVisible ? (
            <CompareDivergenceStrip
              model={compareModel}
              blueprints={visibleBlueprints}
              slideId={slide.id}
            />
          ) : undefined
        }
        chromeBarHeight={stripVisible ? COMPARE_STRIP_HEIGHT : 0}
        fitContentKey={`${compareFitContentKey}:${visibleBlueprints.map((b) => b.path.id).join(',')}`}
      >
        {mergedModel !== null ? (
          <MergedCompareGrid
            blueprints={visibleBlueprints}
            model={mergedModel}
            scrollContainerRef={scrollContainerRef}
            scenarioName={scenarioName}
            phaseName={phaseName}
          />
        ) : useStackedArrangement ? (
          <StackedCompareGrid
            blueprints={visibleBlueprints}
            model={compareModel}
            scrollContainerRef={scrollContainerRef}
            scenarioName={scenarioName}
            phaseName={phaseName}
            sectionTitleLabel={sectionTitleLabel}
          />
        ) : (
          <SideBySideCompareGrid
            blueprints={visibleBlueprints}
            scrollContainerRef={scrollContainerRef}
            scenarioName={scenarioName}
            phaseName={phaseName}
            sectionTitleLabel={sectionTitleLabel}
            fixedSwimlaneBodyHeight={fixedSwimlaneBodyHeight}
            fillSwimlaneHeight={fillSwimlaneHeight}
          />
        )}
      </ResizableComparePanel>
    )
  }

  return (
    <ResizableComparePanel
      {...comparePanelProps}
      fitContentKey={`${compareFitContentKey}:${visibleBlueprints.map((b) => b.path.id).join(',')}:single`}
    >
      <div className="flex flex-row items-start gap-6">
        {visibleBlueprints.map((data) => (
          <ServiceBlueprintGrid
            key={data.path.id}
            data={data}
            className="shrink-0"
            scenarioName={scenarioName}
          phaseName={phaseName}
            headerTitleLabel={sectionTitleLabel}
            headerTitleDescription={sectionTitleDescription}
            showPathTypeBadge={showPathTypeBadge}
            fixedSwimlaneBodyHeight={fixedSwimlaneBodyHeight}
            fillSwimlaneHeight={fillSwimlaneHeight}
          />
        ))}
      </div>
    </ResizableComparePanel>
  )
}
