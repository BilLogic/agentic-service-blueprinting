import { Fragment, memo, useCallback, useId, useMemo, useRef } from 'react'
import {
  getScenarioBlueprintPanelHeight,
  ScenarioBlueprintPanelBody,
} from '@/components/blueprint/ScenarioBlueprintPanel'
import { CanvasEmptyState } from '@/components/editor/CanvasEmptyState'
import { useAlignedPhaseRowPanelHeight } from '@/hooks/useAlignedPhaseRowPanelHeight'
import { useCanvasBlueprints } from '@/hooks/useCanvasBlueprints'
import { defaultSelectedPathIds } from '@/lib/pathSelection'
import type { PathListItem } from '@/lib/pathSelection'
import { COMPARE_MIN_PANEL_HEIGHT } from '@/lib/sideBySideCompareLayout'
import { BLUEPRINT_THEME } from '@/lib/blueprintTheme'
import { OVERVIEW_SCENARIO_GAP } from '@/lib/overviewLayout'
import { SUBSLIDE_GAP } from '@/lib/slideLayout'
import {
  getSlideDisplayLabel,
  getSubslides,
  type NavItem,
  type SlideViewType,
} from '@/types/nav'
import type { BlueprintData } from '@/types/blueprint'
import { cn } from '@/lib/utils'
import { BlueprintPanelLoadingSkeleton } from '@/components/editor/EditorLoadingSkeletons'

const DEFAULT_SCENARIO_GAP = SUBSLIDE_GAP

type PhaseScenarioOverviewProps = {
  phase: NavItem
  slides: NavItem[]
  className?: string
  /** When true, scenario panels share one row height (detail phase view). */
  alignPanelHeights?: boolean
  /** Service overview uses tighter gaps between scenario panels. */
  variant?: 'default' | 'overview'
  /** Preloaded blueprint maps (service overview). Skips per-phase fetch. */
  pathsByScenario?: Map<string, PathListItem[]>
  blueprintsByPathId?: Map<string, BlueprintData>
  loading?: boolean
  /** When set, overrides default happy-path selection (service overview filters). */
  getSelectedPathIds?: (scenarioId: string, paths: PathListItem[]) => string[]
  /** Phase/overview filter view type — keeps row sizing aligned across scenarios. */
  displayViewType?: SlideViewType
  /**
   * When set in canvas focus mode, scenarios other than this id are dimmed.
   * Pass null to dim nothing within the phase (phase-level focus).
   */
  focusedScenarioId?: string | null
  /** When true, dim every scenario in this phase (another phase is focused). */
  dimAllScenarios?: boolean
  /** Slice-tab scope: mount only this scenario's artboard. */
  onlyScenarioId?: string | null
  /**
   * Opens a scenario from the canvas. OPTIONAL: mobile passes nothing, so a
   * tap on a board cannot move between scenarios — the drawer owns that.
   */
  openDetail?: (scenarioId: string) => void
  /**
   * The scenario's own layout choice, `undefined` when it has made none —
   * which is what lets `displayViewType` reach it.
   */
  getScenarioDisplayViewType: (scenario: NavItem) => SlideViewType | undefined
}

function PhaseScenarioConnector({ width }: { width: number }) {
  const markerId = useId().replace(/:/g, '')

  return (
    <div
      className="flex shrink-0 items-center justify-center self-center"
      style={{ width }}
      aria-hidden
    >
      {/*
        The reveal's arrow layer (stage 4). This connector was the one
        untagged link on the board: it draws BETWEEN scenario panels, so it
        sits in the phase's flex row rather than inside either panel's
        blueprint, and it was surfacing with the lanes at stage 1 — an arrow
        pointing at two panels that had not arrived yet. Not a z-order
        problem: the reveal is opacity-driven, and this element simply never
        carried the attribute the reveal keys on.
      */}
      <svg
        data-blueprint-arrows=""
        width={width}
        height={24}
        className="overflow-visible"
      >
        <defs>
          <marker
            id={markerId}
            viewBox="0 0 10 10"
            refX="9"
            refY="5"
            markerWidth="8"
            markerHeight="8"
            orient="auto"
            markerUnits="userSpaceOnUse"
          >
            <path d="M 0 0 L 10 5 L 0 10 Z" style={{ fill: BLUEPRINT_THEME.arrow }} />
          </marker>
        </defs>
        <path
          d={`M 0 12 H ${width - 8}`}
          fill="none"
          style={{ stroke: BLUEPRINT_THEME.arrow }}
          strokeWidth={2}
          markerEnd={`url(#${markerId})`}
        />
      </svg>
    </div>
  )
}

/**
 * A phase frame on the overview canvas: its scenario panels plus the flow
 * arrows between them.
 *
 * Memoised, with what it needs from the editor handed in as props. It used to
 * read the editor context itself, and that context carries the navigation
 * state, so every click re-rendered every phase body on the canvas — every
 * panel and every cell — in the commit the camera's flight starts from.
 */
export const PhaseScenarioOverview = memo(function PhaseScenarioOverview({
  phase,
  slides,
  className,
  alignPanelHeights = true,
  variant = 'default',
  pathsByScenario: pathsByScenarioProp,
  blueprintsByPathId: blueprintsByPathIdProp,
  loading: loadingProp,
  getSelectedPathIds: getSelectedPathIdsProp,
  displayViewType: displayViewTypeProp,
  focusedScenarioId = null,
  dimAllScenarios = false,
  onlyScenarioId = null,
  openDetail,
  getScenarioDisplayViewType,
}: PhaseScenarioOverviewProps) {
  const isOverview = variant === 'overview'

  /*
    Per-scenario override beats the phase-uniform prop. The prop is the
    overview filter's shared default — but the Compare toggle sets a view
    for *one* scenario, and a phase-level 'stacked' silently clobbering
    it is exactly how a toggle looks broken while its state is correct.

    "Has no override" is `undefined`, which is why this reads as a plain
    `??` chain rather than a test against 'stacked': an explicit 'stacked'
    and no choice at all must not be the same thing.

    The resolved mode is passed through at every camera level, and 'merged'
    is passed through with it. It used to coerce to 'stacked' here, because
    an overview row had a horizontal arrangement of its own that could not
    draw a merged board. There is one arrangement now, so an overview tile
    renders the mode the scenario is actually in — navigation changes
    framing, not topology.
  */
  const resolveViewType = useCallback(
    (scenario: NavItem): SlideViewType =>
      getScenarioDisplayViewType(scenario) ?? displayViewTypeProp ?? 'stacked',
    [displayViewTypeProp, getScenarioDisplayViewType],
  )
  const scenarioGap = isOverview ? OVERVIEW_SCENARIO_GAP : DEFAULT_SCENARIO_GAP

  const renderScenarioSeparator = (index: number, total: number) => {
    if (index >= total - 1) return null
    return <PhaseScenarioConnector width={scenarioGap} />
  }

  const scenarios = useMemo(() => {
    const all = getSubslides(phase.id, slides)
    return onlyScenarioId
      ? all.filter((scenario) => scenario.id === onlyScenarioId)
      : all
  }, [onlyScenarioId, phase.id, slides])
  const scenarioIds = useMemo(
    () => scenarios.map((scenario) => scenario.id),
    [scenarios],
  )
  const usePreloaded =
    pathsByScenarioProp !== undefined && blueprintsByPathIdProp !== undefined
  const fetched = useCanvasBlueprints(usePreloaded ? [] : scenarioIds)
  const pathsByScenario = pathsByScenarioProp ?? fetched.pathsByScenario
  const blueprintsByPathId =
    blueprintsByPathIdProp ?? fetched.blueprintsByPathId
  const loading = loadingProp ?? fetched.loading

  const selectedPathIdsFor = useCallback(
    (scenario: NavItem) => {
      const paths = pathsByScenario.get(scenario.id) ?? []
      return getSelectedPathIdsProp
        ? getSelectedPathIdsProp(scenario.id, paths)
        : defaultSelectedPathIds(paths)
    },
    [pathsByScenario, getSelectedPathIdsProp],
  )

  /*
    Is the focused scenario showing MORE than its default path selection?

    That, not focus itself, is what the row-height exclusion is for. Focus
    alone must change no geometry — and excluding a panel changes the row
    height, which IS a geometry change. Gating on the expansion gives both
    invariants at once: a plain focus leaves every number in the row exactly
    where it was, and a comparison opened inside the focused panel still
    cannot reach its dimmed neighbours.
  */
  const focusedScenarioExpanded = useMemo(() => {
    if (focusedScenarioId === null) return false
    const scenario = scenarios.find((item) => item.id === focusedScenarioId)
    if (!scenario) return false
    const paths = pathsByScenario.get(scenario.id) ?? []
    const selected = [...selectedPathIdsFor(scenario)].sort().join(',')
    const fallback = [...defaultSelectedPathIds(paths)].sort().join(',')
    return selected !== fallback
  }, [focusedScenarioId, scenarios, pathsByScenario, selectedPathIdsFor])

  /** Whose height feeds the row's shared number. */
  const rowHeightScenarios = useMemo(
    () =>
      focusedScenarioExpanded
        ? scenarios.filter((scenario) => scenario.id !== focusedScenarioId)
        : scenarios,
    [scenarios, focusedScenarioId, focusedScenarioExpanded],
  )

  const sharedPanelHeight = useMemo(() => {
    if (!alignPanelHeights) return undefined

    const heights = rowHeightScenarios.map((scenario) =>
      getScenarioBlueprintPanelHeight({
        displayViewType: resolveViewType(scenario),
        paths: pathsByScenario.get(scenario.id) ?? [],
        selectedPathIds: selectedPathIdsFor(scenario),
        blueprintsByPathId,
        // Aligned row panels are height-locked: no resize handle, so no
        // handle chrome in the placeholder either.
        scrollChrome: { lockHeight: true },
      }),
    )

    // No selected paths (or no content) — keep the row empty rather than
    // forcing a minimum gray panel height on it.
    const height = Math.max(0, ...heights)
    return height > 0 ? height : undefined
  }, [
    alignPanelHeights,
    rowHeightScenarios,
    pathsByScenario,
    blueprintsByPathId,
    selectedPathIdsFor,
    resolveViewType,
  ])

  /*
    The excluded panel's OWN floor, so that leaving it out above cannot
    shrink it.

    The exclusion answers "whose height may drive the SIBLINGS". Left to
    itself it silently answers a second question too — "how tall is this
    panel" — and gets it wrong whenever the expanded scenario is the tallest
    in its row: the row height drops to the siblings' maximum and the
    expanded panel goes down with it, which reads as the container padding
    jumping between the phase view and the scenario view.
  */
  const expandedPanelHeightFloor = useMemo(() => {
    if (!alignPanelHeights || !focusedScenarioExpanded) return undefined
    const scenario = scenarios.find((item) => item.id === focusedScenarioId)
    if (!scenario) return undefined
    const height = getScenarioBlueprintPanelHeight({
      displayViewType: resolveViewType(scenario),
      paths: pathsByScenario.get(scenario.id) ?? [],
      selectedPathIds: selectedPathIdsFor(scenario),
      blueprintsByPathId,
      scrollChrome: { lockHeight: true },
    })
    return height > 0 ? height : undefined
  }, [
    alignPanelHeights,
    focusedScenarioId,
    focusedScenarioExpanded,
    scenarios,
    pathsByScenario,
    blueprintsByPathId,
    selectedPathIdsFor,
    resolveViewType,
  ])

  /*
    One stable navigate handler per scenario.

    The panels are memoised, and an inline `() => openDetail(scenario.id)` is
    a new identity on every render, so every panel and all of its cells
    re-rendered whenever anything above them changed — the row height
    settling included, which lands in the same commit as the camera ease.

    No opener means no navigation. The view above decides that — on a phone
    every move between scenarios belongs to the drawer — and withholding the
    handler is what makes the panel genuinely inert: `navigable` in
    `ResizableComparePanel` is gated on it existing, so there is no
    `role="button"`, no pointer cursor and no aria-label promising a
    destination, instead of a button that swallows taps. Panning and pinching
    over it are unaffected, and so is opening a cell.
  */
  const navigateByScenario = useMemo(() => {
    const handlers = new Map<string, () => void>()
    if (!openDetail) return handlers
    for (const scenario of scenarios) {
      handlers.set(scenario.id, () => openDetail(scenario.id))
    }
    return handlers
  }, [scenarios, openDetail])

  const rowRef = useRef<HTMLDivElement>(null)
  const selectedPathsMeasureKey = scenarios
    .map((scenario) => selectedPathIdsFor(scenario).join(','))
    .join('|')
  const viewTypesMeasureKey = scenarios
    .map((scenario) => resolveViewType(scenario))
    .join(',')
  const rowMeasureKey = `${phase.id}:${sharedPanelHeight ?? 0}:${scenarios.length}:${loading}:${viewTypesMeasureKey}:${selectedPathsMeasureKey}:${focusedScenarioId ?? ''}:${focusedScenarioExpanded}`
  const { rowPanelHeight, excludedPanelHeight } = useAlignedPhaseRowPanelHeight(
    rowRef,
    sharedPanelHeight,
    expandedPanelHeightFloor,
    alignPanelHeights,
    rowMeasureKey,
  )
  const isExcluded = (scenarioId: string) =>
    focusedScenarioExpanded && focusedScenarioId === scenarioId
  /** The height a given scenario's panel takes. */
  const panelHeightFor = (scenarioId: string) =>
    isExcluded(scenarioId) ? excludedPanelHeight : rowPanelHeight

  if (scenarios.length === 0) {
    // Scenario creation lives on the phase row's `+` in the sidebar (the row
    // knows which phase it means) — no create callback reaches this canvas
    // frame, so the empty state teaches the route instead of offering one.
    return (
      <div
        className={cn(
          'flex min-h-[220px] min-w-[min(36rem,65vw)] items-stretch',
          className,
        )}
        data-phase-scenario-overview=""
        data-phase-empty=""
      >
        <CanvasEmptyState
          variant="phase"
          title="No scenarios in this phase yet"
          summary="Add one with the + on this phase's row in the sidebar (Edit mode)."
        />
      </div>
    )
  }

  if (loading) {
    /*
      The skeleton has to stand exactly where the panel will, and that is
      per-scenario now: the shared height leaves an expanded focused
      scenario out, so a skeleton sized from it alone would be short by the
      same margin, and the board would step once when the content arrived.
    */
    const skeletonHeightFor = (scenarioId: string) =>
      panelHeightFor(scenarioId) ?? COMPARE_MIN_PANEL_HEIGHT

    return (
      <div
        className={cn('inline-flex items-stretch', className)}
        data-phase-scenario-overview=""
        role="status"
        aria-busy="true"
        aria-label="Loading phase scenarios"
      >
        {scenarios.map((scenario, index) => (
          <Fragment key={scenario.id}>
            <BlueprintPanelLoadingSkeleton
              height={skeletonHeightFor(scenario.id)}
              width={640}
            />
            {renderScenarioSeparator(index, scenarios.length)}
          </Fragment>
        ))}
      </div>
    )
  }

  const scenarioSelections = scenarios.map((scenario) => {
    const paths = pathsByScenario.get(scenario.id) ?? []
    const selectedPathIds = getSelectedPathIdsProp
      ? getSelectedPathIdsProp(scenario.id, paths)
      : defaultSelectedPathIds(paths)
    return { scenario, paths, selectedPathIds }
  })

  const visibleScenarioSelections = scenarioSelections.filter(
    ({ selectedPathIds }) => selectedPathIds.length > 0,
  )
  const hasAnyPaths = scenarioSelections.some(({ paths }) => paths.length > 0)

  // Selected paths exist elsewhere, but not in this phase.
  if (visibleScenarioSelections.length === 0 && hasAnyPaths) {
    return (
      <div
        className={cn(
          'flex min-h-[220px] min-w-[min(36rem,65vw)] items-stretch',
          className,
        )}
        data-phase-scenario-overview=""
        data-phase-empty=""
      >
        <CanvasEmptyState
          variant="phase"
          title="No selected paths in this phase"
          summary="The selected path only exists in another phase or scenario."
        />
      </div>
    )
  }

  return (
    <div
      ref={rowRef}
      className={cn('inline-flex items-stretch', className)}
      data-phase-scenario-overview=""
    >
      {visibleScenarioSelections.map(({ scenario, paths, selectedPathIds }, index) => {
        const label = getSlideDisplayLabel(scenario, slides)
        const scenarioViewType = resolveViewType(scenario)
        const isFocusedScenario = focusedScenarioId === scenario.id

        return (
          <Fragment key={scenario.id}>
            <ScenarioBlueprintPanelBody
              slide={scenario}
              slides={slides}
              paths={paths}
              selectedPathIds={selectedPathIds}
              blueprintsByPathId={blueprintsByPathId}
              sectionTitleLabel={label}
              /*
                FOCUS CHANGES NO GEOMETRY, AND NO TOPOLOGY. Every scenario
                takes the same row props whether or not it is the focused
                one, and the same resolved view type.

                The geometry half is load-bearing for the camera. A canvas
                click starts the ease from the geometry on screen, React's
                navigation then recomputes the fit, and the fit skips its
                second animation only when the two targets agree. A panel
                that resizes *because* it became focused guarantees a second
                ease superseding the first partway through — an ease-in-out
                restarting from a moving camera drops to zero velocity,
                which is the lurch.

                The topology half is newer. `displayViewType` used to go
                undefined for the focused scenario, so the panel resolved
                its own mode and drew a different arrangement from the tile
                the reader had just clicked. A tile and the board it opens
                should not be two pictures to learn, so the tile is handed
                the very mode it will open in.
              */
              lockedPanelHeight={panelHeightFor(scenario.id)}
              lockPanelHeight={alignPanelHeights}
              excludeFromRowHeight={isExcluded(scenario.id)}
              displayViewType={scenarioViewType}
              // A stable handler, or none at all — see `navigateByScenario`.
              onNavigate={navigateByScenario.get(scenario.id)}
              dimmed={
                dimAllScenarios ||
                (focusedScenarioId !== null && !isFocusedScenario)
              }
              focusActive={isFocusedScenario}
              getScenarioDisplayViewType={getScenarioDisplayViewType}
            />

            {renderScenarioSeparator(index, visibleScenarioSelections.length)}
          </Fragment>
        )
      })}
    </div>
  )
})
