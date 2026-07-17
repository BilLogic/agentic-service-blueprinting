import type { PathType } from '@/types/database'

export type PathListItem = {
  id: string
  name: string
  description: string | null
  note: string | null
  path_type: PathType
}

export function defaultSelectedPathIds(paths: PathListItem[]): string[] {
  const preferred = paths.find((p) => p.path_type === 'happy') ?? paths[0]
  return preferred ? [preferred.id] : []
}

export function pruneSelectedPathIds(
  selected: string[],
  paths: PathListItem[],
): string[] {
  return selected.filter((id) => paths.some((p) => p.id === id))
}

export function togglePathInSelection(
  selected: string[],
  pathId: string,
): string[] {
  if (selected.includes(pathId)) {
    return selected.filter((id) => id !== pathId)
  }
  return [...selected, pathId]
}

/** Preserve activation order when resolving selected paths to display items. */
export function itemsInSelectionOrder<T>(
  selectedPathIds: readonly string[],
  lookup: (pathId: string) => T | undefined,
): T[] {
  return selectedPathIds
    .map((id) => lookup(id))
    .filter((item): item is T => item !== undefined)
}
