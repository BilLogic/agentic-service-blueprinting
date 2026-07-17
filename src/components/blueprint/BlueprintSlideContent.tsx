import { useMemo, useRef } from 'react'
import { PhaseScenarioOverview } from '@/components/blueprint/PhaseScenarioOverview'
import { ScenarioBlueprintPanel } from '@/components/blueprint/ScenarioBlueprintPanel'
import { ScenarioSlideHeader } from '@/components/blueprint/ScenarioSlideHeader'
import { useEditor } from '@/contexts/EditorContext'
import type { PhaseBlueprintFilters } from '@/hooks/usePhaseBlueprintFilters'
import type { useScenarioBlueprint } from '@/hooks/useScenarioBlueprint'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Skeleton } from '@/components/ui/skeleton'
import {
  SLIDE_ARTBOARD_HEIGHT,
  SLIDE_ARTBOARD_WIDTH,
} from '@/lib/slideLayout'
import {
  getBlueprintScenarioId,
  getParentSlide,
  getSlideDisplayLabel,
  getSubslides,
  isSubslide,
  type Slide,
} from '@/types/slides'
import type { BlueprintData } from '@/types/blueprint'

type ScenarioBlueprintState = ReturnType<typeof useScenarioBlueprint>

const canvasFitAttrs = { 'data-canvas-fit': '' } as const

type BlueprintSlideContentProps = {
  slide: Slide
  slides: Slide[]
  scenarioBlueprint: ScenarioBlueprintState
  phaseBlueprintFilters?: PhaseBlueprintFilters | null
  showHeader?: boolean
  showHeaderFilters?: boolean
  headerVariant?: 'default' | 'notion'
}

export function BlueprintSlideContent({
  slide,
  slides,
  scenarioBlueprint,
  phaseBlueprintFilters = null,
  showHeader = true,
  showHeaderFilters = true,
  headerVariant = 'default',
}: BlueprintSlideContentProps) {
  const compareScrollRef = useRef<HTMLDivElement>(null)
  const { getScenarioDisplayViewType } = useEditor()
  const scenarioId = getBlueprintScenarioId(slide)
  const hasDirectBlueprint = scenarioId !== undefined && !isSubslide(slide)
  const {
    paths,
    selectedPathIds,
    togglePathSelection,
    blueprints,
    allBlueprints,
    integratedBlueprint,
    loading,
    error,
    configured,
  } = scenarioBlueprint

  const label = getSlideDisplayLabel(slide, slides)
  const parentSlide = getParentSlide(slide, slides)
  const blueprintsByPathId = useMemo(() => {
    const map = new Map<string, BlueprintData>()
    for (const blueprint of allBlueprints) {
      map.set(blueprint.path.id, blueprint)
    }
    return map
  }, [allBlueprints])
  const scenarioDescription =
    slide.description?.trim() ||
    paths.find((path) => selectedPathIds.includes(path.id))?.description ||
    paths[0]?.description ||
    null
  const displayViewType =
    phaseBlueprintFilters?.viewType ?? getScenarioDisplayViewType(slide)
  const useIntegratedLayout =
    displayViewType === 'integrated' && paths.length > 0
  const useSideBySideLayout =
    displayViewType === 'side-by-side' && selectedPathIds.length > 0
  const useSinglePathLayout =
    displayViewType === 'single' && selectedPathIds.length > 0
  const noPathsSelected =
    !useIntegratedLayout && paths.length > 0 && selectedPathIds.length === 0

  const handleTogglePath = (pathId: string) => {
    togglePathSelection(pathId)
  }

  const visibleBlueprints = noPathsSelected
    ? []
    : useSideBySideLayout || useSinglePathLayout
      ? blueprints
      : []

  const showIntegratedGrid =
    useIntegratedLayout && integratedBlueprint !== null

  if (!isSubslide(slide) && !hasDirectBlueprint) {
    const phaseScenarios = getSubslides(slide.id, slides)

    if (phaseScenarios.length > 0) {
      const overview = (
        <PhaseScenarioOverview
          phase={slide}
          slides={slides}
          alignPanelHeights
          displayViewType={phaseBlueprintFilters?.viewType}
          pathsByScenario={phaseBlueprintFilters?.pathsByScenario}
          blueprintsByPathId={phaseBlueprintFilters?.blueprintsByPathId}
          getSelectedPathIds={phaseBlueprintFilters?.resolveSelectedPathIds}
          loading={phaseBlueprintFilters?.loading}
        />
      )

      if (!showHeader) {
        return (
          <div className="inline-flex flex-col py-4" {...canvasFitAttrs}>
            {overview}
          </div>
        )
      }

      return (
        <div
          {...canvasFitAttrs}
          className="inline-flex flex-col"
          style={{
            width: SLIDE_ARTBOARD_WIDTH,
            minHeight: SLIDE_ARTBOARD_HEIGHT,
          }}
        >
          <ScenarioSlideHeader
            title={label}
            description={
              slide.description ??
              'Scenarios in this phase and how they connect.'
            }
            showFilters={false}
            variant={headerVariant}
          />
          <div className="mt-6">{overview}</div>
        </div>
      )
    }

    if (!showHeader) {
      return (
        <div
          {...canvasFitAttrs}
          className="flex min-h-[240px] items-center justify-center p-8"
        >
          <p className="text-sm text-muted-foreground">
            Choose a scenario from the sidebar to open its blueprint.
          </p>
        </div>
      )
    }

    return (
      <div
        {...canvasFitAttrs}
        className="inline-flex flex-col"
        style={{
          width: SLIDE_ARTBOARD_WIDTH,
          minHeight: SLIDE_ARTBOARD_HEIGHT,
        }}
      >
        <ScenarioSlideHeader
          title={label}
          slide={isSubslide(slide) ? slide : undefined}
          description={
            slide.description ??
            'Select a scenario under this phase to view its service blueprint.'
          }
          showFilters={false}
          variant={headerVariant}
        />
      </div>
    )
  }

  const header = showHeader ? (
    <ScenarioSlideHeader
      title={label}
      slide={isSubslide(slide) ? slide : undefined}
      description={scenarioDescription}
      phaseLabel={parentSlide ? getSlideDisplayLabel(parentSlide, slides) : undefined}
      paths={paths}
      selectedPathIds={selectedPathIds}
      onTogglePath={handleTogglePath}
      showFilters={showHeaderFilters}
      variant={headerVariant}
      className={headerVariant === 'notion' ? 'mb-8' : undefined}
    />
  ) : null

  if (noPathsSelected) {
    return (
      <div
        {...canvasFitAttrs}
        className="inline-flex flex-col"
        style={{
          width: SLIDE_ARTBOARD_WIDTH,
          minHeight: SLIDE_ARTBOARD_HEIGHT,
        }}
      >
        {header}
      </div>
    )
  }

  if (loading && !showIntegratedGrid && visibleBlueprints.length === 0) {
    return (
      <div {...canvasFitAttrs} className="inline-flex w-max min-w-full flex-col">
        {header}
        <div className="flex flex-col gap-3">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="min-h-[320px] w-full" />
        </div>
      </div>
    )
  }

  if (error && !showIntegratedGrid && visibleBlueprints.length === 0) {
    return (
      <div {...canvasFitAttrs} className="inline-flex w-max min-w-full flex-col">
        {header}
        <Alert variant="destructive">
          <AlertTitle>Could not load blueprint</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      </div>
    )
  }

  if (!showIntegratedGrid && visibleBlueprints.length === 0) {
    return (
      <div {...canvasFitAttrs} className="inline-flex w-max min-w-full flex-col">
        {header}
        <div className="flex min-h-[280px] flex-col items-center justify-center rounded-lg border border-dashed p-8 text-center">
          <p className="text-sm text-muted-foreground">
            No blueprint data for this scenario yet.
          </p>
          {error && (
            <p className="mt-2 text-xs text-destructive">{error}</p>
          )}
          {!configured && (
            <p className="mt-2 text-xs text-muted-foreground">
              Without Supabase, only Application and Warm-Up use demo data. Copy{' '}
              <code className="text-xs">.env.example</code> to{' '}
              <code className="text-xs">.env</code> and run{' '}
              <code className="text-xs">npm run supabase:reset</code> for live data.
            </p>
          )}
        </div>
      </div>
    )
  }

  return (
    <div {...canvasFitAttrs} className="inline-flex w-max min-w-full flex-col">
      {header}
      <ScenarioBlueprintPanel
        slide={slide}
        slides={slides}
        paths={paths}
        selectedPathIds={selectedPathIds}
        blueprintsByPathId={blueprintsByPathId}
        loading={loading}
        scrollContainerRef={compareScrollRef}
      />
    </div>
  )
}
