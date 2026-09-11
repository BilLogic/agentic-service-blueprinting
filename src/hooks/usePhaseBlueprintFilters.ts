import { useCallback, useMemo } from 'react'
import { useCanvasBlueprints } from '@/hooks/useCanvasBlueprints'
import { usePathSelectionsByScenario } from '@/hooks/usePathSelection'
import type { BlueprintData } from '@/types/blueprint'
import { defaultSelectedPathIds, type PathListItem } from '@/lib/pathSelection'
import { getSubslides, isSubslide, type NavItem, type SlideViewType } from '@/types/nav'

type UsePhaseBlueprintFiltersOptions = {
  scenarioIds: string[]
  slides: NavItem[]
  enabled?: boolean
  /** `undefined` for a scenario that has made no layout choice. */
  getScenarioDisplayViewType: (slide: NavItem) => SlideViewType | undefined
  setScenarioDisplayViewType: (scenarioId: string, layout: SlideViewType) => void
  /**
   * The scenario the reader is inside, if any. It is the one entry on a
   * phase row that draws the reader's selection rather than its happy path.
   */
  focusedScenarioId?: string | null
}

export type PhaseBlueprintFilters = {
  pathsByScenario: Map<string, PathListItem[]>
  blueprintsByPathId: Map<string, BlueprintData>
  loading: boolean
  /** Real fetch progress: settled request chunks over total. */
  progress: { loaded: number; total: number }
  layout: SlideViewType
  setViewType: (layout: SlideViewType) => void
  /** This view's selection for a scenario — what a focused scenario draws. */
  resolveSelectedPathIds: (scenarioId: string, paths: PathListItem[]) => string[]
  /** The scenario's happy path alone — what a phase row draws. */
  resolveHappyPathIds: (scenarioId: string, paths: PathListItem[]) => string[]
  /**
   * What the canvas draws for a scenario: the reader's selection when it is
   * the focused scenario, its happy path otherwise.
   */
  resolveDrawnPathIds: (scenarioId: string, paths: PathListItem[]) => string[]
}

/**
 * View settings for a set of scenarios — one phase, or the whole service.
 *
 * **No path filter.** A phase canvas draws each scenario's happy path and
 * nothing else: paths belong to a scenario. The cross-scenario filter that
 * used to sit in the phase header folded paths by `${kind}:${name}`, so one
 * row could toggle "the happy path" in every scenario at once. That only
 * worked while every scenario gave its happy path the same name. Once each
 * path has its own name the fold folds nothing, and the filter listed
 * unrelated routes as though they were one choice.
 *
 * Variants and exceptions are reachable where they belong: inside the focused
 * scenario, through its path picker.
 */
export function usePhaseBlueprintFilters({
  scenarioIds,
  slides,
  enabled = true,
  getScenarioDisplayViewType,
  setScenarioDisplayViewType,
  focusedScenarioId = null,
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

  /*
    Feeds the shared path-selection store and reads back this view's
    selections. The phase header offers no path filter any more, but the
    store still has to be fed: it is what the focused scenario's picker reads,
    and it is where each scenario's default is derived. Dropping this call
    leaves the catalog empty, and every scenario opens on "Paths shown: none".

    `activeScenarioIds` is the scope: the store may prune any of these that
    came back with no paths, which is how a deleted — or reverted-duplicate —
    scenario leaves the catalog instead of outliving the session in it.
  */
  const { getSelectedPathIds } = usePathSelectionsByScenario(
    pathsByScenario,
    activeScenarioIds,
  )

  const layout = useMemo(() => {
    if (activeScenarioIds.length === 0) return 'stacked' as SlideViewType

    const viewTypes = activeScenarioIds.map((scenarioId) => {
      const scenario = slides.find((slide) => slide.id === scenarioId)
      const scenarioViewType = scenario
        ? (getScenarioDisplayViewType(scenario) ?? 'stacked')
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

  const resolveSelectedPathIds = useCallback(
    // Empty selection is intentional — do not fall back to the happy path.
    (scenarioId: string, _paths: PathListItem[]) => getSelectedPathIds(scenarioId),
    [getSelectedPathIds],
  )

  /**
   * The happy path, and only it — what a PHASE row draws.
   *
   * Picked the same way the store picks a scenario's default, so the path a
   * row draws is the path the scenario opens on.
   */
  const resolveHappyPathIds = useCallback(
    (_scenarioId: string, paths: PathListItem[]) => defaultSelectedPathIds(paths),
    [],
  )

  /*
    ONE resolver for what the canvas draws, used by the panels and by every
    count the view derives from them.

    They were two in the deployment this rule came from: the panels were
    handed the happy-path resolver while the view's own selection memo called
    the selection resolver, so nothing the reader picked ever reached a panel.
    A focused scenario with two paths chosen drew one band, and the header
    reported two. Whatever these are, they have to be the same thing, or the
    canvas and the control that drives it disagree in a way nothing raises.
  */
  const resolveDrawnPathIds = useCallback(
    (scenarioId: string, paths: PathListItem[]) =>
      scenarioId === focusedScenarioId
        ? resolveSelectedPathIds(scenarioId, paths)
        : resolveHappyPathIds(scenarioId, paths),
    [focusedScenarioId, resolveSelectedPathIds, resolveHappyPathIds],
  )

  return {
    pathsByScenario,
    blueprintsByPathId,
    loading,
    progress,
    layout,
    setViewType,
    resolveSelectedPathIds,
    resolveHappyPathIds,
    resolveDrawnPathIds,
  }
}

export function getPhaseScenarioIds(phase: NavItem, slides: NavItem[]): string[] {
  return getSubslides(phase.id, slides).map((scenario) => scenario.id)
}

export function isPhaseWithScenarios(slide: NavItem, slides: NavItem[]): boolean {
  return !isSubslide(slide) && getPhaseScenarioIds(slide, slides).length > 0
}
