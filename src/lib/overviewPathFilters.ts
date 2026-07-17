import type { PathOption } from '@/components/blueprint/PathMultiSelect'
import type { PathListItem } from '@/lib/pathSelection'
import { getPathColorKey } from '@/lib/pathColorTheme'

export function getOverviewPathKey(path: Pick<PathListItem, 'path_type' | 'name'>): string {
  return getPathColorKey(path)
}

/** One entry per unique path name/type across all overview scenarios. */
export function collectOverviewPathOptions(
  pathsByScenario: Map<string, PathListItem[]>,
): PathOption[] {
  const byKey = new Map<string, PathOption>()

  for (const paths of pathsByScenario.values()) {
    for (const path of paths) {
      const key = getOverviewPathKey(path)
      if (!byKey.has(key)) {
        byKey.set(key, { ...path, id: key })
      }
    }
  }

  return [...byKey.values()].sort((a, b) => a.name.localeCompare(b.name))
}

export function isOverviewPathFilterChecked(
  pathKey: string,
  pathsByScenario: Map<string, PathListItem[]>,
  getSelectedPathIds: (scenarioId: string) => string[],
): boolean {
  let hasMatch = false

  for (const [scenarioId, paths] of pathsByScenario) {
    for (const path of paths) {
      if (getOverviewPathKey(path) !== pathKey) continue
      hasMatch = true
      if (!getSelectedPathIds(scenarioId).includes(path.id)) {
        return false
      }
    }
  }

  return hasMatch
}

export function toggleOverviewPathFilter(
  pathKey: string,
  pathsByScenario: Map<string, PathListItem[]>,
  getSelectedPathIds: (scenarioId: string) => string[],
  togglePathSelection: (scenarioId: string, pathId: string) => void,
): void {
  const shouldSelect = !isOverviewPathFilterChecked(
    pathKey,
    pathsByScenario,
    getSelectedPathIds,
  )

  for (const [scenarioId, paths] of pathsByScenario) {
    for (const path of paths) {
      if (getOverviewPathKey(path) !== pathKey) continue

      const isSelected = getSelectedPathIds(scenarioId).includes(path.id)
      if (shouldSelect && !isSelected) {
        togglePathSelection(scenarioId, path.id)
      }
      if (!shouldSelect && isSelected) {
        togglePathSelection(scenarioId, path.id)
      }
    }
  }
}