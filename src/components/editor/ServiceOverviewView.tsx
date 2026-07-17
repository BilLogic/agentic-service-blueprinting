import { Fragment, useMemo, useRef, useState } from 'react'
import { BlueprintCellDetailPanel } from '@/components/blueprint/BlueprintCellDetailPanel'
import { PhaseScenarioOverview } from '@/components/blueprint/PhaseScenarioOverview'
import { CanvasPhaseSection } from '@/components/editor/CanvasPhaseSection'
import { OverviewPhaseRowDivider } from '@/components/editor/OverviewPhaseRowDivider'
import {
  PhaseOverviewPhaseLoopArrow,
  PHASE_OVERVIEW_LOOP_CHANNEL_OFFSET,
} from '@/components/editor/PhaseOverviewPhaseLoopArrow'
import { ServiceOverviewStickyHeader } from '@/components/editor/ServiceOverviewMenubarHeader'
import { ZoomPanViewport } from '@/components/editor/ZoomPanViewport'
import { BlueprintCellDetailProvider } from '@/contexts/BlueprintCellDetailContext'
import { useEditor } from '@/contexts/EditorContext'
import { usePhaseBlueprintFilters } from '@/hooks/usePhaseBlueprintFilters'
import {
  OVERVIEW_CANVAS_PADDING_X,
  OVERVIEW_CANVAS_PADDING_Y,
} from '@/lib/overviewLayout'
import {
  getMainSlides,
  getSlideDisplayLabel,
  getOverviewPostToPreLoopTransition,
  shouldShowOverviewPhaseFlowArrow,
  isSubslide,
  type Slide,
  type SlideViewType,
} from '@/types/slides'
import type { BlueprintData } from '@/types/blueprint'
import type { PathListItem } from '@/lib/pathSelection'
import { Skeleton } from '@/components/ui/skeleton'

const OVERVIEW_PAN_IGNORE =
  "button, a, input, textarea, select, label, [role='button'], [data-slide-sticky-header], [data-compare-panel], [data-zoom-indicator], [data-phase-scenario-overview], [data-phase-scenario-panel], [data-canvas-phase-interactive], [data-phase-menubar-header], [data-canvas-phase-section], [data-path-description-trigger], [data-cell-detail-panel], [data-blueprint-cell-interactive], [data-slot='menubar'], [data-slot='menubar-trigger']"

type ServicePhaseSectionProps = {
  phase: Slide
  slides: Slide[]
  pathsByScenario: Map<string, PathListItem[]>
  blueprintsByPathId: Map<string, BlueprintData>
  getSelectedPathIds: (scenarioId: string, paths: PathListItem[]) => string[]
  displayViewType: SlideViewType
  showFlowArrow?: boolean
  isFlowArrowAnchor?: boolean
  isLoopArrowFrom?: boolean
  isLoopArrowTo?: boolean
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
}: ServicePhaseSectionProps & { onOpenPhase: (phaseId: string) => void }) {
  const label = getSlideDisplayLabel(phase, slides)
  const description =
    phase.description ?? 'Scenarios in this phase and how they connect.'

  return (
    <CanvasPhaseSection
      title={label}
      description={description}
      phaseId={phase.id}
      variant="overview"
      showFlowArrow={showFlowArrow}
      isFlowArrowAnchor={isFlowArrowAnchor}
      isLoopArrowFrom={isLoopArrowFrom}
      isLoopArrowTo={isLoopArrowTo}
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
        loading={false}
      />
    </CanvasPhaseSection>
  )
}

export function ServiceOverviewView() {
  const overviewRef = useRef<HTMLDivElement>(null)
  const [overviewEl, setOverviewEl] = useState<HTMLDivElement | null>(null)
  const {
    slides,
    slidesLoading,
    openDetail,
    getScenarioDisplayViewType,
    setScenarioDisplayViewType,
  } = useEditor()
  const phases = getMainSlides(slides)
  const scenarioIds = slides
    .filter((slide) => isSubslide(slide))
    .map((slide) => slide.id)

  const {
    pathsByScenario,
    blueprintsByPathId,
    loading: blueprintsLoading,
    filterPaths: overviewPaths,
    filterSelectedPathIds: overviewSelectedPathIds,
    viewType: overviewViewType,
    toggleFilterPath: handleOverviewTogglePath,
    resolveSelectedPathIds,
  } = usePhaseBlueprintFilters({
    scenarioIds,
    slides,
    getScenarioDisplayViewType,
    setScenarioDisplayViewType,
  })

  const overviewReady = !slidesLoading && !blueprintsLoading
  const fitKey = overviewReady
    ? `service-overview-ready-${phases.length}-${scenarioIds.length}-${overviewSelectedPathIds.join(',')}`
    : 'service-overview-loading'

  const postToPreLoop = getOverviewPostToPreLoopTransition(phases)
  const cellDetailBlueprints = useMemo(
    () => [...blueprintsByPathId.values()],
    [blueprintsByPathId],
  )
  const cellDetailEnabled = true

  if (!overviewReady) {
    return (
      <div
        className="relative min-h-0 min-w-0 flex-1 overflow-hidden"
        style={{ backgroundColor: '#F4F4F4' }}
      >
        <Skeleton className="absolute inset-0 rounded-none opacity-40" />
        <div className="relative flex h-full flex-col items-center justify-center gap-2 px-6 text-center">
          <p className="text-sm font-medium text-foreground">Loading service overview…</p>
          <p className="text-xs text-muted-foreground">
            Using local blueprint data if the database is slow or unavailable.
          </p>
        </div>
      </div>
    )
  }

  return (
    <BlueprintCellDetailProvider
      resetKey={fitKey}
      enabled={cellDetailEnabled}
      blueprints={cellDetailBlueprints}
    >
      <div
        className="relative min-h-0 min-w-0 flex-1 overflow-hidden"
        data-slide-canvas
      >
        <ZoomPanViewport
          resetKey={fitKey}
          showSequenceNav={false}
          className="absolute inset-0"
          panIgnoreSelector={OVERVIEW_PAN_IGNORE}
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
                (postToPreLoop ? PHASE_OVERVIEW_LOOP_CHANNEL_OFFSET + 16 : 0),
            }}
          >
            {phases.map((phase, index) => (
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
                  showFlowArrow={shouldShowOverviewPhaseFlowArrow(
                    phase,
                    phases[index + 1],
                  )}
                  isFlowArrowAnchor={index === 0}
                  isLoopArrowFrom={phase.id === postToPreLoop?.fromPhaseId}
                  isLoopArrowTo={phase.id === postToPreLoop?.toPhaseId}
                />
              </Fragment>
            ))}
            {postToPreLoop ? (
              <PhaseOverviewPhaseLoopArrow
                overviewRef={overviewRef}
                overviewEl={overviewEl}
              />
            ) : null}
          </div>
        </ZoomPanViewport>
        {cellDetailEnabled ? <BlueprintCellDetailPanel /> : null}
        <ServiceOverviewStickyHeader
          paths={overviewPaths}
          selectedPathIds={overviewSelectedPathIds}
          onTogglePath={handleOverviewTogglePath}
        />
      </div>
    </BlueprintCellDetailProvider>
  )
}
