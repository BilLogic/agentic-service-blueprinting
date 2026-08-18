import type { PathType } from '@/types/database'

export type PathListItem = {
  id: string
  name: string
  description: string | null
  note: string | null
  path_type: PathType
}

/**
 * The one "which path should a fresh visit show?" rule: a path literally
 * named "Happy Path" wins over other happy-typed paths, then any happy
 * path, then the first path.
 */
export function pickPreferredPath<
  T extends { name: string; path_type: PathType },
>(paths: readonly T[]): T | undefined {
  if (paths.length === 0) return undefined
  const namedHappy = paths.find(
    (path) =>
      path.path_type === 'happy' && /^happy\s*path$/i.test(path.name.trim()),
  )
  if (namedHappy) return namedHappy
  return paths.find((path) => path.path_type === 'happy') ?? paths[0]
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
