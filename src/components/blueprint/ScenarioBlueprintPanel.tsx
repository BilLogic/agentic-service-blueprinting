import { useMemo, useRef, type RefObject } from 'react'
import { IntegratedBlueprintGrid } from '@/components/blueprint/IntegratedBlueprintGrid'
import { ResizableComparePanel } from '@/components/blueprint/ResizableComparePanel'
import { ServiceBlueprintGrid } from '@/components/blueprint/ServiceBlueprintGrid'
import { SideBySideCompareGrid } from '@/components/blueprint/SideBySideCompareGrid'
import { useEditor } from '@/contexts/EditorContext'
import { mergeIntegratedBlueprint } from '@/lib/mergeIntegratedBlueprint'
import { itemsInSelectionOrder, type PathListItem } from '@/lib/pathSelection'
import {
  getComparePanelHeight,
  getComparePanelWidth,
  getIntegratedPanelHeight,
  getIntegratedPanelWidth,
  getPanelHeightFromSwimlaneBody,
} from '@/lib/sideBySideCompareLayout'

export {
  getScenarioBlueprintPanelHeight,
  getScenarioSwimlaneBodyHeight,
} from '@/lib/sideBySideCompareLayout'
export type { ScenarioSwimlaneLayoutInput } from '@/lib/sideBySideCompareLayout'
import {
  getSlideDisplayLabel,
  type NavItem,
  type SlideViewType,
} from '@/types/nav'
import type { BlueprintData } from '@/types/blueprint'
import { Skeleton } from '@/components/ui/skeleton'

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
}

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
}: ScenarioBlueprintPanelProps) {
  const { getScenarioDisplayViewType } = useEditor()
  const internalScrollRef = useRef<HTMLDivElement>(null)
  const scrollContainerRef = scrollContainerRefProp ?? internalScrollRef

  const scenarioName = getSlideDisplayLabel(slide, slides)
  const displayViewType =
    displayViewTypeProp ?? getScenarioDisplayViewType(slide)
  const useIntegratedLayout =
    displayViewType === 'integrated' && paths.length > 0
  const useSideBySideLayout =
    displayViewType === 'side-by-side' && selectedPathIds.length > 0
  const useSinglePathLayout =
    displayViewType === 'single' && selectedPathIds.length > 0

  const allBlueprints = useMemo(
    () =>
      paths
        .map((path) => blueprintsByPathId.get(path.id))
        .filter((blueprint): blueprint is BlueprintData => blueprint !== undefined),
    [paths, blueprintsByPathId],
  )

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

  const integratedBlueprint = useMemo(
    () => mergeIntegratedBlueprint(allBlueprints, selectedPathIds),
    [allBlueprints, selectedPathIds],
  )

  const showIntegratedGrid =
    useIntegratedLayout && integratedBlueprint !== null

  const compareFitContentKey = `${slide.id}:${selectedPathIds.join(',')}:${displayViewType}:${paths.length}`
  const sectionTitleDescription = sectionTitleLabel
    ? slide.description
    : undefined
  const showPathTypeBadge = Boolean(sectionTitleLabel)

  const integratedPathCount = Math.max(1, selectedPathIds.length)
  const panelHeight =
    lockedPanelHeight ??
    (fixedSwimlaneBodyHeight !== undefined
      ? getPanelHeightFromSwimlaneBody(fixedSwimlaneBodyHeight)
      : showIntegratedGrid
        ? getIntegratedPanelHeight(
            integratedBlueprint!.layers,
            integratedBlueprint!,
            false,
            new Set(),
            { sourceBlueprints: allBlueprints, selectedPathIds },
          )
        : getComparePanelHeight(visibleBlueprints))

  const fillSwimlaneHeight = fixedSwimlaneBodyHeight !== undefined

  const comparePanelProps = {
    minWidth: showIntegratedGrid
      ? getIntegratedPanelWidth(
          integratedBlueprint!.steps.length,
          false,
          integratedPathCount,
        )
      : getComparePanelWidth(visibleBlueprints),
    minHeight: panelHeight,
    defaultWidth: showIntegratedGrid
      ? getIntegratedPanelWidth(
          integratedBlueprint!.steps.length,
          false,
          integratedPathCount,
        )
      : getComparePanelWidth(visibleBlueprints),
    defaultHeight: panelHeight,
    lockHeight: lockPanelHeight,
    onNavigate,
    navigateLabel: onNavigate ? `Open ${scenarioName} scenario` : undefined,
    panelTitleLabel: sectionTitleLabel,
    panelTitleDescription: sectionTitleDescription,
    scrollContainerRef,
  }

  if (loading && visibleBlueprints.length === 0 && !showIntegratedGrid) {
    return (
      <div className="flex flex-col gap-2">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="min-h-[320px] w-[640px]" />
      </div>
    )
  }

  if (!showIntegratedGrid && visibleBlueprints.length === 0) {
    return (
      <div className="flex min-h-[280px] min-w-[320px] items-center justify-center rounded-lg border border-dashed p-8 text-center">
        <p className="text-sm text-muted-foreground">
          No blueprint data for this scenario yet.
        </p>
      </div>
    )
  }

  if (showIntegratedGrid) {
    return (
      <ResizableComparePanel
        {...comparePanelProps}
        fitContentKey={`${compareFitContentKey}:${integratedBlueprint.cells.length}`}
      >
        <IntegratedBlueprintGrid
          data={integratedBlueprint}
          embedded
          scrollContainerRef={scrollContainerRef}
          selectedPathIds={selectedPathIds}
          scenarioName={scenarioName}
          walkthroughBlueprints={allBlueprints}
          fixedSwimlaneBodyHeight={fixedSwimlaneBodyHeight}
          fillSwimlaneHeight={fillSwimlaneHeight}
          showPathTypeBadge={showPathTypeBadge}
        />
      </ResizableComparePanel>
    )
  }

  if (useSideBySideLayout) {
    return (
      <ResizableComparePanel
        {...comparePanelProps}
        fitContentKey={`${compareFitContentKey}:${visibleBlueprints.map((b) => b.path.id).join(',')}`}
      >
        <SideBySideCompareGrid
          blueprints={visibleBlueprints}
          scrollContainerRef={scrollContainerRef}
          scenarioName={scenarioName}
          sectionTitleLabel={sectionTitleLabel}
          sectionTitleDescription={sectionTitleDescription}
          fixedSwimlaneBodyHeight={fixedSwimlaneBodyHeight}
          fillSwimlaneHeight={fillSwimlaneHeight}
        />
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
            walkthroughBlueprints={allBlueprints}
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
