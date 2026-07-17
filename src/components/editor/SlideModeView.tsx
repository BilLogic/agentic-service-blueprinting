import { useMemo } from 'react'
import { BlueprintCellDetailPanel } from '@/components/blueprint/BlueprintCellDetailPanel'
import { BlueprintSlideContent } from '@/components/blueprint/BlueprintSlideContent'
import { SlideStickyHeader } from '@/components/editor/SlideStickyHeader'
import { ZoomPanViewport } from '@/components/editor/ZoomPanViewport'
import { BlueprintCellDetailProvider } from '@/contexts/BlueprintCellDetailContext'
import { useEditor } from '@/contexts/EditorContext'
import {
  getPhaseScenarioIds,
  usePhaseBlueprintFilters,
} from '@/hooks/usePhaseBlueprintFilters'
import { useScenarioBlueprint } from '@/hooks/useScenarioBlueprint'
import { isBlueprintCellDetailEnabled } from '@/lib/blueprintDisplayFlags'
import { SlideNav } from '@/components/editor/SlideNav'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Skeleton } from '@/components/ui/skeleton'
import {
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuSkeleton,
} from '@/components/ui/sidebar'
import {
  getBlueprintScenarioId,
  isSubslide,
} from '@/types/slides'

export function SlideModeSidebarNav() {
  const {
    slides,
    activeSlideId,
    openDetail,
    view,
    slidesLoading,
    slidesError,
  } = useEditor()

  return (
    <SidebarContent className="px-2 pb-1 pt-0.5">
      {slidesError && (
        <Alert variant="destructive" className="mb-2">
          <AlertTitle className="text-xs">Phases</AlertTitle>
          <AlertDescription className="text-xs">{slidesError}</AlertDescription>
        </Alert>
      )}
      {slidesLoading ? (
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {[1, 2, 3, 4, 5].map((i) => (
                <SidebarMenuItem key={i}>
                  <SidebarMenuSkeleton />
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      ) : (
        <SlideNav
          slides={slides}
          activeSlideId={activeSlideId}
          onSelect={openDetail}
          isHome={view === 'home'}
        />
      )}
    </SidebarContent>
  )
}

export function SlideModeMain() {
  const {
    activeSlide,
    activeSlideId,
    slides,
    slidesLoading,
    getScenarioDisplayViewType,
    setScenarioDisplayViewType,
  } = useEditor()

  const scenarioId = getBlueprintScenarioId(activeSlide)
  const phaseScenarioIds = useMemo(() => {
    if (!activeSlide || isSubslide(activeSlide)) return []
    return getPhaseScenarioIds(activeSlide, slides)
  }, [activeSlide, slides])
  const isPhaseDetail = phaseScenarioIds.length > 0

  const phaseFilters = usePhaseBlueprintFilters({
    scenarioIds: phaseScenarioIds,
    slides,
    enabled: isPhaseDetail,
    getScenarioDisplayViewType,
    setScenarioDisplayViewType,
  })

  const scenarioBlueprint = useScenarioBlueprint(
    isPhaseDetail ? undefined : scenarioId,
  )

  const headerPaths = isPhaseDetail
    ? phaseFilters.filterPaths
    : scenarioBlueprint.paths
  const headerSelectedPathIds = isPhaseDetail
    ? phaseFilters.filterSelectedPathIds
    : scenarioBlueprint.selectedPathIds
  const handleTogglePath = isPhaseDetail
    ? phaseFilters.toggleFilterPath
    : scenarioBlueprint.togglePathSelection

  const viewportResetKey = isPhaseDetail
    ? `${activeSlideId}:${phaseFilters.filterSelectedPathIds.join(',')}:${phaseFilters.loading}`
    : `${activeSlideId}:${scenarioBlueprint.selectedPathIds.join(',')}:${scenarioBlueprint.blueprints.length}`

  const cellDetailBlueprints = useMemo(() => {
    if (isPhaseDetail) {
      return [...phaseFilters.blueprintsByPathId.values()]
    }
    return scenarioBlueprint.allBlueprints
  }, [
    isPhaseDetail,
    phaseFilters.blueprintsByPathId,
    scenarioBlueprint.allBlueprints,
  ])

  const cellDetailEnabled = isBlueprintCellDetailEnabled(scenarioId)

  return (
    <BlueprintCellDetailProvider
      resetKey={activeSlideId}
      enabled={cellDetailEnabled}
      blueprints={cellDetailBlueprints}
    >
      <div
        className="relative min-h-0 min-w-0 flex-1 overflow-hidden"
        data-slide-canvas
      >
        {slidesLoading ? (
          <Skeleton className="absolute inset-0 rounded-none" />
        ) : (
          <>
            <ZoomPanViewport
              resetKey={viewportResetKey}
              className="absolute inset-0"
              panIgnoreSelector="button, a, input, textarea, select, label, [role='button'], [data-slide-sticky-header], [data-compare-panel], [data-zoom-indicator], [data-canvas-nav], [data-path-description-trigger], [data-cell-detail-panel], [data-visual-walkthrough-modal], [data-blueprint-cell-interactive], [data-phase-scenario-overview]"
            >
              <div className="px-6 md:px-8">
                <BlueprintSlideContent
                  slide={activeSlide}
                  slides={slides}
                  scenarioBlueprint={scenarioBlueprint}
                  phaseBlueprintFilters={isPhaseDetail ? phaseFilters : null}
                  showHeader={false}
                  showHeaderFilters={false}
                />
              </div>
            </ZoomPanViewport>
            {cellDetailEnabled && <BlueprintCellDetailPanel />}
            <SlideStickyHeader
              slide={activeSlide}
              slides={slides}
              paths={headerPaths}
              selectedPathIds={headerSelectedPathIds}
              onTogglePath={handleTogglePath}
            />
          </>
        )}
      </div>
    </BlueprintCellDetailProvider>
  )
}
