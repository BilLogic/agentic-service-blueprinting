import { Fragment, useId, useMemo, useRef } from 'react'
import {
  getScenarioSwimlaneBodyHeight,
  ScenarioBlueprintPanel,
} from '@/components/blueprint/ScenarioBlueprintPanel'
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
import { Skeleton } from '@/components/ui/skeleton'

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
}

function PhaseScenarioConnector({ width }: { width: number }) {
  const markerId = useId().replace(/:/g, '')

  return (
    <div
      className="flex shrink-0 items-center justify-center self-center"
      style={{ width }}
      aria-hidden
    >
      <svg width={width} height={24} className="overflow-visible">
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
            <path d="M 0 0 L 10 5 L 0 10 Z" fill={BLUEPRINT_THEME.arrow} />
          </marker>
        </defs>
        <path
          d={`M 0 12 H ${width - 8}`}
          fill="none"
          stroke={BLUEPRINT_THEME.arrow}
          strokeWidth={2}
          markerEnd={`url(#${markerId})`}
        />
      </svg>
    </div>
  )
}

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
}: PhaseScenarioOverviewProps) {
  const { getScenarioDisplayViewType, openDetail } = useEditor()
  const isOverview = variant === 'overview'
  const scenarioGap = isOverview ? OVERVIEW_SCENARIO_GAP : DEFAULT_SCENARIO_GAP

  const renderScenarioSeparator = (index: number, total: number) => {
    if (index >= total - 1) return null
    return <PhaseScenarioConnector width={scenarioGap} />
  }

  const scenarios = useMemo(
    () => getSubslides(phase.id, slides),
    [phase.id, slides],
  )
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
        displayViewType:
          displayViewTypeProp ?? getScenarioDisplayViewType(scenario),
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
    getScenarioDisplayViewType,
    getSelectedPathIdsProp,
    displayViewTypeProp,
  ])

  const sharedPanelHeight = useMemo(() => {
    if (!alignPanelHeights || sharedSwimlaneBodyHeight === undefined) {
      return undefined
    }

    if (sharedSwimlaneBodyHeight === 0) {
      return COMPARE_MIN_PANEL_HEIGHT
    }

    return Math.max(
      COMPARE_MIN_PANEL_HEIGHT,
      getPanelHeightFromSwimlaneBody(sharedSwimlaneBodyHeight),
    )
  }, [alignPanelHeights, sharedSwimlaneBodyHeight])

  const rowRef = useRef<HTMLDivElement>(null)
  const rowMeasureKey = `${phase.id}:${sharedSwimlaneBodyHeight ?? 0}:${scenarios.length}:${loading}`
  const rowPanelHeight = useAlignedPhaseRowPanelHeight(
    rowRef,
    sharedPanelHeight,
    alignPanelHeights,
    rowMeasureKey,
  )

  if (scenarios.length === 0) {
    return (
      <div
        className={cn(
          'flex min-h-[240px] items-center justify-center rounded-lg border border-dashed p-8 text-center',
          className,
        )}
      >
        <p className="text-sm text-muted-foreground">
          No scenarios in this phase yet.
        </p>
      </div>
    )
  }

  if (loading) {
    const skeletonHeight = sharedPanelHeight ?? COMPARE_MIN_PANEL_HEIGHT

    return (
      <div
        className={cn('inline-flex items-stretch', className)}
        data-phase-scenario-overview=""
      >
        {scenarios.map((scenario, index) => (
          <Fragment key={scenario.id}>
            <Skeleton
              className="shrink-0 rounded-2xl"
              style={{
                width: 640,
                height: skeletonHeight,
              }}
            />
            {renderScenarioSeparator(index, scenarios.length)}
          </Fragment>
        ))}
      </div>
    )
  }

  return (
    <div
      ref={rowRef}
      className={cn('inline-flex items-stretch', className)}
      data-phase-scenario-overview=""
    >
      {scenarios.map((scenario, index) => {
        const label = getSlideDisplayLabel(scenario, slides)
        const paths = pathsByScenario.get(scenario.id) ?? []
        const selectedPathIds = getSelectedPathIdsProp
          ? getSelectedPathIdsProp(scenario.id, paths)
          : defaultSelectedPathIds(paths)

        return (
          <Fragment key={scenario.id}>
            <ScenarioBlueprintPanel
              slide={scenario}
              slides={slides}
              paths={paths}
              selectedPathIds={selectedPathIds}
              blueprintsByPathId={blueprintsByPathId}
              sectionTitleLabel={label}
              lockedPanelHeight={rowPanelHeight}
              fixedSwimlaneBodyHeight={sharedSwimlaneBodyHeight}
              lockPanelHeight={alignPanelHeights}
              displayViewType={displayViewTypeProp}
              onNavigate={() => openDetail(scenario.id)}
            />

            {renderScenarioSeparator(index, scenarios.length)}
          </Fragment>
        )
      })}
    </div>
  )
}
