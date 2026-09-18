import { pickPreferredPath } from '@/lib/pathSelection'
import { storageKey } from '@/lib/storageNamespace'
import type { PathKind } from '@/types/database'

/**
 * Which path the phone last showed for each scenario: the top-bar
 * selector reads one path at a time, and coming back to a scenario should
 * land on the path the user was reading, not reset to the happy path. One
 * localStorage key holding a scenario→path map — the same shape as the
 * agent stores (`agent-*` in the same namespace), and like them it
 * degrades to in-memory defaults when storage is unavailable (private
 * mode, quota).
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

function readLastViewedPath(scenarioId: string): string | null {
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

/** A path, as much of one as any rule here needs to read. */
type PathOption = { id: string; name: string; kind: PathKind }

/**
 * The default rule, pure so the resolutions below share one statement of it:
 * last-viewed wins when it still exists in the scenario's path list;
 * otherwise the preferred (happy) path; `null` when the scenario has no paths
 * at all.
 *
 * The existence check is the whole reason this is not `stored ?? happy`. A
 * path a reader was last on can be deleted from the blueprint between two
 * visits, and a remembered id that matches nothing selects nothing — which
 * renders as a board with no path on it rather than as the scenario's happy
 * path, and reads to the reader as content that has gone missing.
 */
function resolveDefaultPathId(
  stored: string | null,
  paths: readonly PathOption[],
): string | null {
  if (stored !== null && paths.some((path) => path.id === stored)) return stored
  return pickPreferredPath(paths)?.id ?? null
}

/**
 * The path a scenario OPENS on: what the reader last read there if it still
 * exists, else the scenario's happy path, else `null` for a scenario with no
 * paths.
 *
 * Storage is read in here rather than by the caller on purpose. Two callers
 * needed this answer — the phone's shell and `openScenario`, which lands
 * mobile and desktop the same way — and each used to compose the read and the
 * rule for itself. Two copies of a two-step rule is how the phone and the
 * desktop come to open a scenario on different paths while both look correct
 * in isolation.
 *
 * @param scenarioId - Scenario whose remembered path is consulted.
 * @param paths - That scenario's registered paths.
 * @returns The path id to select, or `null` when the scenario has none.
 */
export function resolveRememberedPathId(
  scenarioId: string,
  paths: readonly PathOption[],
): string | null {
  return resolveDefaultPathId(readLastViewedPath(scenarioId), paths)
}

/**
 * The path a surface SHOWS: an explicit selection if the reader (or the
 * filter) has made one, else what this scenario opens on, else `null` — which
 * is also the answer when no scenario is selected at all, because the
 * overview has no path dimension to read.
 *
 * This is the whole of what the phone's shell needs to know about path
 * memory, so the shell keeps none of it. The precedence matters and is not
 * obvious: an explicit selection has to beat the remembered one, or tapping a
 * path in the selector would be overruled on the next render by the path that
 * was remembered before the tap.
 *
 * @param scenarioId - The selected scenario, or `null` on the overview.
 * @param selectedPathIds - Paths the selection store holds for that scenario.
 * @param paths - That scenario's registered paths.
 * @returns The path id to show, or `null` when there is none to show.
 */
export function resolveShownPathId(
  scenarioId: string | null,
  selectedPathIds: readonly string[],
  paths: readonly PathOption[],
): string | null {
  if (scenarioId === null) return null
  return selectedPathIds[0] ?? resolveRememberedPathId(scenarioId, paths)
}
