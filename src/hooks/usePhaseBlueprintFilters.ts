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
import type { BlueprintData } from '@/types/blueprint'
import type { PathListItem } from '@/lib/pathSelection'
import { getSubslides, isSubslide, type NavItem, type SlideViewType } from '@/types/nav'

type UsePhaseBlueprintFiltersOptions = {
  scenarioIds: string[]
  slides: NavItem[]
  enabled?: boolean
  getScenarioDisplayViewType: (slide: NavItem) => SlideViewType
  setScenarioDisplayViewType: (scenarioId: string, viewType: SlideViewType) => void
}

export type PhaseBlueprintFilters = {
  pathsByScenario: Map<string, PathListItem[]>
  blueprintsByPathId: Map<string, BlueprintData>
  loading: boolean
  /** Real fetch progress: settled request chunks over total. */
  progress: { loaded: number; total: number }
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
  const activeScenarioIds = useMemo(
    () => (enabled ? scenarioIds : []),
    [enabled, scenarioIds],
  )
  const {
    pathsByScenario,
    blueprintsByPathId,
    loading,
    progress,
  } = useCanvasBlueprints(activeScenarioIds)

  // `activeScenarioIds` is the scope: the store may prune any of these that
  // came back with no paths, which is how a deleted — or reverted-duplicate —
  // scenario leaves the catalog instead of outliving the session in it.
  const { getSelectedPathIds, togglePathKey, activePathKeys } =
    usePathSelectionsByScenario(pathsByScenario, activeScenarioIds)

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
            activePathKeys,
          ),
        )
        .map((path) => path.id),
    [filterPaths, pathsByScenario, activePathKeys],
  )

  const viewType = useMemo(() => {
    if (activeScenarioIds.length === 0) return 'stacked' as SlideViewType

    const viewTypes = activeScenarioIds.map((scenarioId) => {
      const scenario = slides.find((slide) => slide.id === scenarioId)
      const scenarioViewType = scenario
        ? getScenarioDisplayViewType(scenario)
        : ('stacked' as SlideViewType)
      // 'merged' is a focused-scenario mode; overview rows render stacked.
      return scenarioViewType === 'merged'
        ? ('stacked' as SlideViewType)
        : scenarioViewType
    })

    return viewTypes.every((type) => type === viewTypes[0])
      ? viewTypes[0]!
      : ('stacked' as SlideViewType)
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
        togglePathKey,
      )
    },
    [pathsByScenario, getSelectedPathIds, togglePathKey],
  )

  const resolveSelectedPathIds = useCallback(
    (scenarioId: string, _paths: PathListItem[]) => {
      // Empty selection is intentional — do not fall back to happy path.
      return getSelectedPathIds(scenarioId)
    },
    [getSelectedPathIds],
  )

  return {
    pathsByScenario,
    blueprintsByPathId,
    loading,
    progress,
    filterPaths,
    filterSelectedPathIds,
    viewType,
    setViewType,
    toggleFilterPath,
    resolveSelectedPathIds,
  }
}

export function getPhaseScenarioIds(phase: NavItem, slides: NavItem[]): string[] {
  return getSubslides(phase.id, slides).map((scenario) => scenario.id)
}

export function isPhaseWithScenarios(slide: NavItem, slides: NavItem[]): boolean {
  return !isSubslide(slide) && getPhaseScenarioIds(slide, slides).length > 0
}
