import { Fragment, useCallback, useId, useMemo, useRef } from 'react'
import {
  getScenarioSwimlaneBodyHeight,
  ScenarioBlueprintPanel,
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
export function PhaseScenarioOverview({
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
}: PhaseScenarioOverviewProps) {
  const { getScenarioDisplayViewType, openDetail } = useEditor()
  const isOverview = variant === 'overview'

  /*
    Per-scenario override beats the phase-uniform prop. The prop is the
    overview filter's shared default — but the Compare toggle sets a view
    for *one* scenario, and a phase-level 'stacked' silently clobbering
    it is exactly how a toggle looks broken while its state is correct.

    'merged' coerces to 'stacked' here: it is a focused-scenario mode, and
    overview rows render only the horizontal arrangement.
  */
  const resolveViewType = useCallback(
    (scenario: NavItem): SlideViewType => {
      const perScenario = getScenarioDisplayViewType(scenario)
      const resolved =
        perScenario !== 'stacked'
          ? perScenario
          : (displayViewTypeProp ?? perScenario)
      return resolved === 'merged' ? 'stacked' : resolved
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

  const sharedSwimlaneBodyHeight = useMemo(() => {
    if (!alignPanelHeights) return undefined

    const heights = scenarios.map((scenario) => {
      const paths = pathsByScenario.get(scenario.id) ?? []
      const selectedPathIds = getSelectedPathIdsProp
        ? getSelectedPathIdsProp(scenario.id, paths)
        : defaultSelectedPathIds(paths)
      return getScenarioSwimlaneBodyHeight({
        displayViewType: resolveViewType(scenario),
        paths,
        selectedPathIds,
        blueprintsByPathId,
      })
    })

    return Math.max(0, ...heights)
  }, [
    alignPanelHeights,
    scenarios,
    pathsByScenario,
    blueprintsByPathId,
    getSelectedPathIdsProp,
    resolveViewType,
  ])

  const sharedPanelHeight = useMemo(() => {
    if (!alignPanelHeights || sharedSwimlaneBodyHeight === undefined) {
      return undefined
    }

    // No selected paths (or no content) — keep the row empty, don't force a
    // minimum gray panel height.
    if (sharedSwimlaneBodyHeight === 0) {
      return undefined
    }

    return getPanelHeightFromSwimlaneBody(sharedSwimlaneBodyHeight, {
      lockHeight: true,
    })
  }, [alignPanelHeights, sharedSwimlaneBodyHeight])

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
  const rowMeasureKey = `${phase.id}:${sharedSwimlaneBodyHeight ?? 0}:${scenarios.length}:${loading}:${viewTypesMeasureKey}:${selectedPathsMeasureKey}:${focusedScenarioId ?? ''}`
  const rowPanelHeight = useAlignedPhaseRowPanelHeight(
    rowRef,
    sharedPanelHeight,
    alignPanelHeights,
    rowMeasureKey,
  )

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
    const skeletonHeight = sharedPanelHeight ?? COMPARE_MIN_PANEL_HEIGHT

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
              height={skeletonHeight}
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
        /*
          The focused scenario leaves the overview's shared-row contract:
          without the locked height / phase-uniform view type it becomes the
          FOCUSED SCENARIO VIEW, where compared paths stack as vertical
          bands. Its dimmed siblings keep the horizontal row layout.
        */
        const isFocusedScenario = focusedScenarioId === scenario.id

        return (
          <Fragment key={scenario.id}>
            <ScenarioBlueprintPanel
              slide={scenario}
              slides={slides}
              paths={paths}
              selectedPathIds={selectedPathIds}
              blueprintsByPathId={blueprintsByPathId}
              sectionTitleLabel={label}
              lockedPanelHeight={isFocusedScenario ? undefined : rowPanelHeight}
              fixedSwimlaneBodyHeight={
                isFocusedScenario ? undefined : sharedSwimlaneBodyHeight
              }
              lockPanelHeight={isFocusedScenario ? false : alignPanelHeights}
              displayViewType={
                isFocusedScenario ? undefined : resolveViewType(scenario)
              }
              onNavigate={() => openDetail(scenario.id)}
              dimmed={
                dimAllScenarios ||
                (focusedScenarioId !== null &&
                  focusedScenarioId !== scenario.id)
              }
              focusActive={focusedScenarioId === scenario.id}
            />

            {renderScenarioSeparator(index, visibleScenarioSelections.length)}
          </Fragment>
        )
      })}
    </div>
  )
}
