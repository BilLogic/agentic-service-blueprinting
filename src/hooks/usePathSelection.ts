import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  defaultSelectedPathIds,
  pruneSelectedPathIds,
  togglePathInSelection,
  type PathListItem,
} from '@/lib/pathSelection'

function pathIdsKey(paths: PathListItem[]): string {
  return paths.map((path) => path.id).join('|')
}

export function usePathSelection(paths: PathListItem[]) {
  const pathsKey = useMemo(() => pathIdsKey(paths), [paths])
  const [selectedPathIds, setSelectedPathIds] = useState<string[]>([])
  const syncedPathsKeyRef = useRef('')
  const pathsRef = useRef(paths)
  pathsRef.current = paths

  useEffect(() => {
    const currentPaths = pathsRef.current
    const isNewPathSet = pathsKey !== syncedPathsKeyRef.current
    if (isNewPathSet) {
      syncedPathsKeyRef.current = pathsKey
    }

    setSelectedPathIds((prev) => {
      const pruned = pruneSelectedPathIds(prev, currentPaths)

      if (isNewPathSet) {
        if (pruned.length > 0) return pruned
        return currentPaths.length > 0
          ? defaultSelectedPathIds(currentPaths)
          : []
      }

      if (
        pruned.length === prev.length &&
        pruned.every((id, index) => id === prev[index])
      ) {
        return prev
      }

      return pruned
    })
  }, [pathsKey])

  const togglePathSelection = useCallback((pathId: string) => {
    setSelectedPathIds((prev) => togglePathInSelection(prev, pathId))
  }, [])

  return { selectedPathIds, setSelectedPathIds, togglePathSelection }
}

export function usePathSelectionsByScenario(
  pathsByScenario: Map<string, PathListItem[]>,
) {
  const pathsKey = useMemo(
    () =>
      [...pathsByScenario.entries()]
        .map(([id, paths]) => `${id}:${pathIdsKey(paths)}`)
        .sort()
        .join('|'),
    [pathsByScenario],
  )

  const [selections, setSelections] = useState<Record<string, string[]>>({})
  const syncedPathsKeyRef = useRef('')

  useEffect(() => {
    const isNewPathSet = pathsKey !== syncedPathsKeyRef.current
    if (isNewPathSet) {
      syncedPathsKeyRef.current = pathsKey
    }

    setSelections((prev) => {
      let next: Record<string, string[]> | null = null

      for (const [scenarioId, paths] of pathsByScenario) {
        if (paths.length === 0) continue

        const current = prev[scenarioId] ?? []
        const pruned = pruneSelectedPathIds(current, paths)
        const resolved = isNewPathSet
          ? pruned.length > 0
            ? pruned
            : defaultSelectedPathIds(paths)
          : pruned

        const unchanged =
          current.length === resolved.length &&
          current.every((id, index) => id === resolved[index])

        if (!unchanged) {
          if (!next) next = { ...prev }
          next[scenarioId] = resolved
        }
      }

      return next ?? prev
    })
  }, [pathsByScenario, pathsKey])

  const getSelectedPathIds = useCallback(
    (scenarioId: string) => selections[scenarioId] ?? [],
    [selections],
  )

  const togglePathSelection = useCallback((scenarioId: string, pathId: string) => {
    setSelections((prev) => ({
      ...prev,
      [scenarioId]: togglePathInSelection(prev[scenarioId] ?? [], pathId),
    }))
  }, [])

  return { selections, getSelectedPathIds, togglePathSelection }
}
