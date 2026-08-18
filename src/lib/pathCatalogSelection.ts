import { getPathColorKey } from '@/lib/pathColorTheme'
import {
  defaultSelectedPathIds,
  pickPreferredPath,
  type PathListItem,
} from '@/lib/pathSelection'

/** Registered paths per scenario id — the shared path store's backing map. */
export type PathCatalog = Record<string, PathListItem[]>

/**
 * The path filter's two states.
 *
 * `null` — nobody has touched the filter, so every scenario shows its OWN
 * default path. An array — an explicit global selection of path identities,
 * including the empty array ("nothing selected"), which is a real state a
 * user can reach and must not be silently refilled.
 *
 * The distinction is the whole point. Path identity is `path_type:name`, and
 * nothing makes two scenarios name their happy paths the same: a blueprint
 * whose scenarios run "First visit", "No-database run", "Guided mapping" is
 * ordinary, not pathological. Deriving one global default key from the first
 * scenario that happened to load therefore matched nothing anywhere else, and
 * every phase but that one rendered "No selected paths in this phase". The
 * old sample content reused a single path name across scenarios, so the key
 * matched everywhere by luck and hid it.
 *
 * Falling back per scenario *always* — even under an explicit selection —
 * would fix the symptom and break the filter: unchecking a path would leave
 * every scenario showing its default anyway. So the fallback belongs to the
 * default state alone.
 */
export type ActivePathKeys = readonly string[] | null

export function getPathKey(
  path: Pick<PathListItem, 'path_type' | 'name'>,
): string {
  return getPathColorKey(path)
}

/** The identity of a scenario's own default path (its happy path, else its first). */
export function defaultPathKeyForScenario(
  paths: readonly PathListItem[],
): string | undefined {
  const preferred = pickPreferredPath(paths)
  return preferred ? getPathKey(preferred) : undefined
}

/**
 * Every scenario's default path identity, deduped, in catalog order.
 *
 * This is what the PATHS checkboxes show as checked while the filter is
 * untouched, and the starting point a first toggle edits. It is a *union*, so
 * on a blueprint with five differently-named happy paths it has five entries —
 * but no scenario ever gets more than one of them, because a key that belongs
 * to another scenario's paths cannot match this one's. Per-scenario selection
 * stays single, which is what the compare cluster gates on.
 */
export function defaultPathKeysFromCatalog(catalog: PathCatalog): string[] {
  const keys: string[] = []
  const seen = new Set<string>()
  for (const paths of Object.values(catalog)) {
    const key = defaultPathKeyForScenario(paths)
    if (key === undefined || seen.has(key)) continue
    seen.add(key)
    keys.push(key)
  }
  return keys
}

function selectedIdsForPaths(
  paths: readonly PathListItem[],
  activePathKeys: readonly string[],
): string[] {
  if (activePathKeys.length === 0) return []
  const keySet = new Set(activePathKeys)
  return paths
    .filter((path) => keySet.has(getPathKey(path)))
    .map((path) => path.id)
}

/** Selected path uuids per scenario for the given filter state. */
export function deriveSelections(
  catalog: PathCatalog,
  activePathKeys: ActivePathKeys,
): Record<string, string[]> {
  const next: Record<string, string[]> = {}
  for (const [scenarioId, paths] of Object.entries(catalog)) {
    next[scenarioId] =
      activePathKeys === null
        ? defaultSelectedPathIds(paths)
        : selectedIdsForPaths(paths, activePathKeys)
  }
  return next
}
