import { useCallback, useMemo } from 'react'
import type { PathOption } from '@/components/blueprint/PathMultiSelect'
import { useCanvasBlueprints } from '@/hooks/useCanvasBlueprints'
import { usePathSelectionsByScenario } from '@/hooks/usePathSelection'
import {
  collectOverviewPathOptions,
  getOverviewPathKey,
  isOverviewPathFilterChecked,
  toggleOverviewPathFilter,
} from '@/lib/overviewPathFilters'
import { defaultSelectedPathIds } from '@/lib/pathSelection'
import type { BlueprintData } from '@/types/blueprint'
import type { PathListItem } from '@/lib/pathSelection'
import { getSubslides, isSubslide, type Slide, type SlideViewType } from '@/types/slides'

type UsePhaseBlueprintFiltersOptions = {
  scenarioIds: string[]
  slides: Slide[]
  enabled?: boolean
  getScenarioDisplayViewType: (slide: Slide) => SlideViewType
  setScenarioDisplayViewType: (scenarioId: string, viewType: SlideViewType) => void
}

export type PhaseBlueprintFilters = {
  pathsByScenario: Map<string, PathListItem[]>
  blueprintsByPathId: Map<string, BlueprintData>
  loading: boolean
  filterPaths: PathOption[]
  filterSelectedPathIds: string[]
  viewType: SlideViewType
  setViewType: (viewType: SlideViewType) => void
  toggleFilterPath: (pathKey: string) => void
  resolveSelectedPathIds: (scenarioId: string, paths: PathListItem[]) => string[]
}

/** View/path filters scoped to a set of scenarios (one phase or the full overview). */
export function usePhaseBlueprintFilters({
  scenarioIds,
  slides,
  enabled = true,
  getScenarioDisplayViewType,
  setScenarioDisplayViewType,
}: UsePhaseBlueprintFiltersOptions): PhaseBlueprintFilters {
  const activeScenarioIds = enabled ? scenarioIds : []
  const {
    pathsByScenario,
    blueprintsByPathId,
    loading,
  } = useCanvasBlueprints(activeScenarioIds)
  const { getSelectedPathIds, togglePathSelection } =
    usePathSelectionsByScenario(pathsByScenario)

  const filterPaths = useMemo(
    () => collectOverviewPathOptions(pathsByScenario),
    [pathsByScenario],
  )

  const filterSelectedPathIds = useMemo(
    () =>
      filterPaths
        .filter((path) =>
          isOverviewPathFilterChecked(
            getOverviewPathKey(path),
            pathsByScenario,
            getSelectedPathIds,
          ),
        )
        .map((path) => path.id),
    [filterPaths, pathsByScenario, getSelectedPathIds],
  )

  const viewType = useMemo(() => {
    if (activeScenarioIds.length === 0) return 'side-by-side' as SlideViewType

    const viewTypes = activeScenarioIds.map((scenarioId) => {
      const scenario = slides.find((slide) => slide.id === scenarioId)
      return scenario
        ? getScenarioDisplayViewType(scenario)
        : ('side-by-side' as SlideViewType)
    })

    return viewTypes.every((type) => type === viewTypes[0])
      ? viewTypes[0]!
      : ('side-by-side' as SlideViewType)
  }, [activeScenarioIds, slides, getScenarioDisplayViewType])

  const setViewType = useCallback(
    (nextViewType: SlideViewType) => {
      for (const scenarioId of activeScenarioIds) {
        setScenarioDisplayViewType(scenarioId, nextViewType)
      }
    },
    [activeScenarioIds, setScenarioDisplayViewType],
  )

  const toggleFilterPath = useCallback(
    (pathKey: string) => {
      toggleOverviewPathFilter(
        pathKey,
        pathsByScenario,
        getSelectedPathIds,
        togglePathSelection,
      )
    },
    [pathsByScenario, getSelectedPathIds, togglePathSelection],
  )

  const resolveSelectedPathIds = useCallback(
    (scenarioId: string, paths: PathListItem[]) => {
      const selected = getSelectedPathIds(scenarioId)
      return selected.length > 0 ? selected : defaultSelectedPathIds(paths)
    },
    [getSelectedPathIds],
  )

  return {
    pathsByScenario,
    blueprintsByPathId,
    loading,
    filterPaths,
    filterSelectedPathIds,
    viewType,
    setViewType,
    toggleFilterPath,
    resolveSelectedPathIds,
  }
}

export function getPhaseScenarioIds(phase: Slide, slides: Slide[]): string[] {
  return getSubslides(phase.id, slides).map((scenario) => scenario.id)
}

export function isPhaseWithScenarios(slide: Slide, slides: Slide[]): boolean {
  return !isSubslide(slide) && getPhaseScenarioIds(slide, slides).length > 0
}
