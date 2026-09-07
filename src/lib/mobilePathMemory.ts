import { pickPreferredPath } from '@/lib/pathSelection'
import { storageKey } from '@/lib/storageNamespace'
import type { PathKind } from '@/types/database'

/**
 * Which path the phone last showed for each scenario (plan 2026-08-16-002
 * Phase 3): the top-bar selector reads one path at a time, and coming back
 * to a scenario should land on the path the user was reading, not reset to
 * the happy path. One localStorage key holding a scenario→path map — the
 * same shape as the agent stores (`agent-*` in the same namespace), and like
 * them it degrades to in-memory defaults when storage is unavailable
 * (private mode, quota).
 */

const STORAGE_KEY = storageKey('mobile-paths')

function readMap(): Record<string, string> {
  if (typeof window === 'undefined') return {}
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return {}
    const parsed: unknown = JSON.parse(raw)
    if (typeof parsed !== 'object' || parsed === null) return {}
    return Object.fromEntries(
      Object.entries(parsed as Record<string, unknown>).filter(
        (entry): entry is [string, string] => typeof entry[1] === 'string',
      ),
    )
  } catch {
    return {}
  }
}

export function readLastViewedPath(scenarioId: string): string | null {
  return readMap()[scenarioId] ?? null
}

export function writeLastViewedPath(scenarioId: string, pathId: string): void {
  if (typeof window === 'undefined') return
  try {
    const map = readMap()
    map[scenarioId] = pathId
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(map))
  } catch {
    // Storage full or forbidden — the selector still works, it just
    // forgets across visits.
  }
}

/**
 * The default rule, pure so a unit test can pin it: last-viewed wins when it
 * still exists in the scenario's path list; otherwise the preferred (happy)
 * path; `null` when the scenario has no paths at all.
 */
export function resolveDefaultPathId(
  stored: string | null,
  paths: readonly { id: string; name: string; kind: PathKind }[],
): string | null {
  if (stored !== null && paths.some((path) => path.id === stored)) return stored
  return pickPreferredPath(paths)?.id ?? null
}
