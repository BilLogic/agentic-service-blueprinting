import { Fragment, memo, useCallback, useId, useMemo, useRef } from 'react'
import {
  getScenarioBlueprintPanelHeight,
  getScenarioSwimlaneBodyHeight,
  ScenarioBlueprintPanelBody,
} from '@/components/blueprint/ScenarioBlueprintPanel'
import { CanvasEmptyState } from '@/components/editor/CanvasEmptyState'
import { useEditor } from '@/contexts/EditorContext'
import { useAlignedPhaseRowPanelHeight } from '@/hooks/useAlignedPhaseRowPanelHeight'
import { useCanvasBlueprints } from '@/hooks/useCanvasBlueprints'
import { defaultSelectedPathIds } from '@/lib/pathSelection'
import type { PathListItem } from '@/lib/pathSelection'
import { COMPARE_MIN_PANEL_HEIGHT, getPanelHeightFromSwimlaneBody } from '@/lib/sideBySideCompareLayout'
import { BLUEPRINT_THEME } from '@/lib/blueprintTheme'
import { OVERVIEW_SCENARIO_GAP } from '@/lib/overviewLayout'
import { resolveScenarioPanelHeight } from '@/lib/phaseRowPanelHeight'
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
}

type PhaseScenarioOverviewBodyProps = PhaseScenarioOverviewProps & {
  getScenarioDisplayViewType: (scenario: NavItem) => SlideViewType
  /** OPTIONAL: mobile passes nothing — the drawer owns navigation there. */
  openDetail?: (scenarioId: string) => void
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

/** A phase frame on the overview canvas: its scenario panels plus the flow arrows between them. */
/** A phase frame on the overview canvas: its scenario panels plus the flow arrows between them. */
export function PhaseScenarioOverview({
  ...props
}: PhaseScenarioOverviewProps) {
  const { getScenarioDisplayViewType, openDetail } = useEditor()
  return (
    <PhaseScenarioOverviewBody
      {...props}
      getScenarioDisplayViewType={getScenarioDisplayViewType}
      openDetail={openDetail}
    />
  )
}

/**
 * Heavy board body with its navigation dependencies passed as STABLE props.
 *
 * Reading them from context inside the body meant every context change
 * reconciled every phase board on the canvas — which lands in the same commit
 * as the camera ease, the worst possible moment for it. Memoised here, with
 * the two context values hoisted into the wrapper above.
 */
export const PhaseScenarioOverviewBody = memo(function PhaseScenarioOverviewBody({
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
  getScenarioDisplayViewType,
  openDetail,
}: PhaseScenarioOverviewBodyProps) {
  const isOverview = variant === 'overview'

  /*
    Per-scenario override beats the phase-uniform prop. The prop is the
    overview filter's shared default — but the Compare toggle sets a view
    for *one* scenario, and a phase-level 'stacked' silently clobbering
    it is exactly how a toggle looks broken while its state is correct.

    The resolved mode is passed through at every camera level. Overview and
    focus must render the same grid; navigation changes framing, not topology.
  */
  const resolveViewType = useCallback(
    (scenario: NavItem): SlideViewType => {
      const perScenario = getScenarioDisplayViewType(scenario)
      const resolved =
        perScenario !== 'stacked'
          ? perScenario
          : (displayViewTypeProp ?? perScenario)
      return resolved
    },
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

  const sharedSwimlaneBodyHeight = useMemo(() => {
    if (!alignPanelHeights) return undefined

    const heights = rowHeightScenarios.map((scenario) => {
      const paths = pathsByScenario.get(scenario.id) ?? []
      const selectedPathIds = selectedPathIdsFor(scenario)
      return getScenarioSwimlaneBodyHeight({
        displayViewType: resolveViewType(scenario),
        paths,
        selectedPathIds,
        blueprintsByPathId,
      })
    })

    // Undefined, not 0 — and zero is reachable two ways, not one. The row
    // can be empty (its only scenario is the focused one), and it can be
    // non-empty but measure zero throughout, which happens when none of this
    // phase's path keys match the global selection (see the cross-scenario
    // naming note in PathSelectionContext). Either way a shared body height
    // of zero would pin a panel flat rather than say "there is nothing to
    // align to" — and `sharedPanelHeight` below has always guarded `> 0`, so
    // anything less here makes the two memos disagree about what zero means.
    const tallest = Math.max(0, ...heights)
    return tallest > 0 ? tallest : undefined
  }, [
    alignPanelHeights,
    rowHeightScenarios,
    pathsByScenario,
    blueprintsByPathId,
    selectedPathIdsFor,
    resolveViewType,
  ])

  const sharedPanelHeight = useMemo(() => {
    if (!alignPanelHeights) return undefined
    const heights = rowHeightScenarios.map((scenario) => {
      const paths = pathsByScenario.get(scenario.id) ?? []
      const selectedPathIds = getSelectedPathIdsProp
        ? getSelectedPathIdsProp(scenario.id, paths)
        : defaultSelectedPathIds(paths)
      return getScenarioBlueprintPanelHeight({
        displayViewType: resolveViewType(scenario),
        paths,
        selectedPathIds,
        blueprintsByPathId,
        // Aligned row panels are height-locked: no resize handle, so no
        // handle chrome in the placeholder either.
        scrollChrome: { lockHeight: alignPanelHeights },
      })
    })
    const height = Math.max(0, ...heights)
    return height > 0 ? height : undefined
  }, [
    alignPanelHeights,
    rowHeightScenarios,
    pathsByScenario,
    blueprintsByPathId,
    getSelectedPathIdsProp,
    resolveViewType,
  ])


  /*
    The focused panel's OWN floor, so that excluding it above cannot shrink
    it.

    The exclusion answers "whose height may drive the SIBLINGS". Left to
    itself it silently answers a second question too — "how tall is the
    focused panel" — and gets it wrong whenever the focused scenario is the
    tallest in its row: the row height drops to the siblings' maximum and
    the focused panel goes down with it, which reads as the container
    padding jumping between the phase view and the scenario view.

    `max(rowHeight, itsOwnEstimate)` restores the exact number it had at
    overview, because the row maximum is by definition the larger of "the
    siblings' maximum" and "its own estimate".
  */
  const focusedSwimlaneBodyFloor = useMemo(() => {
    if (!alignPanelHeights || focusedScenarioId === null) return undefined
    if (!focusedScenarioExpanded) return undefined
    const scenario = scenarios.find((item) => item.id === focusedScenarioId)
    if (!scenario) return undefined
    const height = getScenarioSwimlaneBodyHeight({
      displayViewType: resolveViewType(scenario),
      paths: pathsByScenario.get(scenario.id) ?? [],
      selectedPathIds: selectedPathIdsFor(scenario),
      blueprintsByPathId,
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

  const focusedPanelHeightFloor = useMemo(
    () =>
      focusedSwimlaneBodyFloor === undefined
        ? undefined
        : getPanelHeightFromSwimlaneBody(focusedSwimlaneBodyFloor, {
            lockHeight: true,
          }),
    [focusedSwimlaneBodyFloor],
  )

  /*
    One stable navigate handler per scenario.

    `ScenarioBlueprintPanel` is memoised, and an inline
    `() => openDetail(scenario.id)` is a new identity on every render — so
    every panel and all of its cells re-rendered whenever anything above them
    changed, including the row-height measurement settling. That lands in the
    same commit as the camera ease, which is the worst possible moment for it.

    No opener means no navigation: the Map stays empty, every panel gets
    `onNavigate === undefined`, and `navigable` is false — inert, not a dead
    button. That is how the phone gets a canvas that cannot navigate.
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
    .map((scenario) => {
      const paths = pathsByScenario.get(scenario.id) ?? []
      const selectedPathIds = getSelectedPathIdsProp
        ? getSelectedPathIdsProp(scenario.id, paths)
        : defaultSelectedPathIds(paths)
      return selectedPathIds.join(',')
    })
    .join('|')
  const viewTypesMeasureKey = scenarios
    .map((scenario) => resolveViewType(scenario))
    .join(',')
  const rowMeasureKey = `${phase.id}:${sharedSwimlaneBodyHeight ?? 0}:${scenarios.length}:${loading}:${viewTypesMeasureKey}:${selectedPathsMeasureKey}:${focusedScenarioId ?? ''}:${focusedScenarioExpanded}`
  const { rowPanelHeight, focusedPanelHeight } = useAlignedPhaseRowPanelHeight(
    rowRef,
    sharedPanelHeight,
    focusedPanelHeightFloor,
    alignPanelHeights,
    rowMeasureKey,
  )
  /** The height a given scenario's panel takes. */
  const panelHeightFor = (scenarioId: string) =>
    focusedScenarioExpanded && focusedScenarioId === scenarioId
      ? focusedPanelHeight
      : rowPanelHeight

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
          description="Add one with the + on this phase's row in the sidebar (Edit mode)."
        />
      </div>
    )
  }

  if (loading) {
    /*
      The skeleton has to stand exactly where the panel will, and that is
      per-scenario now: `sharedPanelHeight` leaves an expanded focused
      scenario out, so a skeleton sized from it alone would be short by the
      same margin the panel used to be, and the board would step once when
      the content arrived.
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
          description="The selected path only exists in another phase or scenario."
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
                FOCUS CHANGES NO GEOMETRY. The focused scenario takes the
                same row height and the same lock as its neighbours.

                It used to drop the lock and hug its content, which is
                load-bearing in the wrong direction: a canvas click starts
                the camera ease from the geometry on screen, React's
                navigation then recomputes the fit, and the fit skips its
                second animation only when the two targets agree. A panel
                that resizes *because* it became focused guarantees a second
                ease superseding the first partway through — an ease-in-out
                restarting from a moving camera drops to zero velocity,
                which is the lurch.

                Every scenario takes the same `displayViewType` resolution,
                focused or not — the arrangement no longer forks on focus,
                so there is nothing for a focus branch to protect.
              */
              lockedPanelHeight={panelHeightFor(scenario.id)}
              fixedSwimlaneBodyHeight={
                scenarioViewType === 'single'
                  ? resolveScenarioPanelHeight({
                      rowPanelHeight: sharedSwimlaneBodyHeight,
                      ownHeightFloor: focusedSwimlaneBodyFloor,
                      isFocused: isFocusedScenario && focusedScenarioExpanded,
                    })
                  : undefined
              }
              lockPanelHeight={alignPanelHeights}
              displayViewType={scenarioViewType}
              excludeFromRowHeight={
                isFocusedScenario && focusedScenarioExpanded
              }
              onNavigate={navigateByScenario.get(scenario.id)}
              dimmed={
                dimAllScenarios ||
                (focusedScenarioId !== null &&
                  focusedScenarioId !== scenario.id)
              }
              focusActive={focusedScenarioId === scenario.id}
              getScenarioDisplayViewType={getScenarioDisplayViewType}
            />

            {renderScenarioSeparator(index, visibleScenarioSelections.length)}
          </Fragment>
        )
      })}
    </div>
  )
})
