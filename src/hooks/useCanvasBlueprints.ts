import { useMemo } from 'react'
import { useQueries } from '@tanstack/react-query'
import {
  filterPathsForScenarioUi,
  getBlueprintFallback,
  getFallbackPathsForScenario,
} from '@/data/blueprintFallbacks'
import { useSupabase } from '@/contexts/SupabaseProvider'
import { queryClient } from '@/lib/queryClient'
import { withSupabaseTimeout } from '@/lib/supabaseFetchTimeout'
import { resolveBlueprintForScenario } from '@/lib/resolveBlueprint'
import type { RawPath } from '@/lib/normalizeBlueprint'
import type { PathListItem } from '@/lib/pathSelection'
import { pickPreferredPath } from '@/lib/pathSelection'
import { PATH_BLUEPRINT_SELECT } from '@/lib/workflowQueries'
import type { BlueprintData } from '@/types/blueprint'

type CanvasRawPath = RawPath & {
  scenario_id: string
}

type CanvasBlueprintMaps = {
  blueprintsByScenario: Map<string, BlueprintData>
  pathsByScenario: Map<string, PathListItem[]>
  blueprintsByPathId: Map<string, BlueprintData>
  usingFallback: boolean
}

const EMPTY_MAPS: CanvasBlueprintMaps = {
  blueprintsByScenario: new Map(),
  pathsByScenario: new Map(),
  blueprintsByPathId: new Map(),
  usingFallback: false,
}

function pickPathForScenario(paths: CanvasRawPath[]): CanvasRawPath | null {
  if (paths.length === 0) return null
  return pickPreferredPath(paths) ?? null
}

function buildFallbackMaps(scenarioIds: string[]): CanvasBlueprintMaps {
  const blueprintsByScenario = new Map<string, BlueprintData>()
  const pathsByScenario = new Map<string, PathListItem[]>()
  const blueprintsByPathId = new Map<string, BlueprintData>()

  for (const scenarioId of scenarioIds) {
    const paths = getFallbackPathsForScenario(scenarioId)
    if (paths.length > 0) {
      pathsByScenario.set(scenarioId, paths)
    }

    for (const path of paths) {
      const blueprint = getBlueprintFallback(scenarioId, path.id)
      if (blueprint) {
        blueprintsByPathId.set(path.id, blueprint)
      }
    }

    const defaultBlueprint = getBlueprintFallback(scenarioId)
    if (defaultBlueprint) {
      blueprintsByScenario.set(scenarioId, defaultBlueprint)
    }
  }

  return {
    blueprintsByScenario,
    pathsByScenario,
    blueprintsByPathId,
    usingFallback: blueprintsByScenario.size > 0,
  }
}

/**
 * Group fetched path rows into the per-scenario / per-path blueprint maps.
 *
 * Reached only when a database is configured, which is why nothing here
 * reaches for the bundled sample: a scenario the database has no paths for is
 * a scenario with no paths, and it draws its empty state rather than this
 * template's fixture wearing the deployment's name. The only registry call left is
 * `filterPathsForScenarioUi`, which hides ids rather than supplying content.
 */
function deriveFromRows(
  rows: CanvasRawPath[],
  orderedScenarioIds: string[],
): CanvasBlueprintMaps {
  const grouped = new Map<string, CanvasRawPath[]>()
  const byPathId = new Map<string, BlueprintData>()

  for (const row of rows) {
    const list = grouped.get(row.scenario_id) ?? []
    list.push(row)
    grouped.set(row.scenario_id, list)

    const resolved = resolveBlueprintForScenario(row.scenario_id, row)
    if (resolved.blueprint) {
      byPathId.set(row.id, resolved.blueprint)
    }
  }

  const byScenario = new Map<string, BlueprintData>()
  const pathsMap = new Map<string, PathListItem[]>()

  for (const scenarioId of orderedScenarioIds) {
    const scenarioPaths = grouped.get(scenarioId) ?? []
    if (scenarioPaths.length > 0) {
      pathsMap.set(
        scenarioId,
        filterPathsForScenarioUi(
          scenarioId,
          scenarioPaths.map((path) => ({
            id: path.id,
            name: path.name,
            summary: path.summary ?? null,
            note: path.note ?? null,
            kind: path.kind,
          })),
        ),
      )
    }

    const chosen = pickPathForScenario(scenarioPaths)
    const resolved = resolveBlueprintForScenario(scenarioId, chosen)
    if (resolved.blueprint) {
      byScenario.set(scenarioId, resolved.blueprint)
    }
  }

  return {
    blueprintsByScenario: byScenario,
    pathsByScenario: pathsMap,
    blueprintsByPathId: byPathId,
    usingFallback: false,
  }
}

const SCENARIO_KEY_PREFIX = 'canvas-blueprints:scenario:'

/**
 * Invalidate exactly the scenarios a write touched — one refetch, not a
 * board-wide storm, which is what the per-scenario keys below buy. Membership
 * changes (create/delete/duplicate scenario) still go through
 * `invalidateStructure()`'s bare 'canvas-blueprints' prefix, which these keys
 * also match.
 */
export function invalidateCanvasBlueprintsForScenario(
  scenarioId: string,
): void {
  void queryClient.invalidateQueries({
    predicate: (query) =>
      String(query.queryKey[0] ?? '') === `${SCENARIO_KEY_PREFIX}${scenarioId}`,
  })
}

/**
 * Path-scoped variant for callers that only know the path (the cell panel
 * editor): match the one scenario query whose cached rows contain the
 * path. A query with no cached data yet is counted as matching — stale to
 * be safe.
 */
export function invalidateCanvasBlueprintsForPath(pathId: string): void {
  void queryClient.invalidateQueries({
    predicate: (query) => {
      const key = String(query.queryKey[0] ?? '')
      if (!key.startsWith(SCENARIO_KEY_PREFIX)) return false
      const rows = query.state.data as CanvasRawPath[] | undefined
      return rows === undefined || rows.some((row) => row.id === pathId)
    },
  })
}

/**
 * Blueprints for a set of scenarios, fetched ONE QUERY PER SCENARIO so
 * loading progress is measurable (each settle is one real tick), cache
 * keys are stable under membership changes (adding a scenario adds one
 * key; the rest stay warm), and a lost request degrades only its own
 * scenario to the static fallback instead of the whole board. Keys live
 * under the `canvas-blueprints:` prefix the mutation contract
 * invalidates.
 */
export function useCanvasBlueprints(scenarioIds: string[]) {
  const idsKey = scenarioIds.slice().sort().join(',')
  const orderedScenarioIds = useMemo(
    () => (idsKey ? idsKey.split(',') : []),
    [idsKey],
  )
  const staticFallbacks = useMemo(
    () => buildFallbackMaps(orderedScenarioIds),
    [orderedScenarioIds],
  )

  const { client, configured } = useSupabase()
  const noDb = !configured || !client

  const results = useQueries({
    queries: orderedScenarioIds.map((scenarioId) => ({
      queryKey: [`${SCENARIO_KEY_PREFIX}${scenarioId}`],
      enabled: !noDb,
      queryFn: ({ signal }): Promise<CanvasRawPath[]> =>
        withSupabaseTimeout(signal, async (deadline) => {
          const { data, error } = await client!
            .from('paths')
            .select(PATH_BLUEPRINT_SELECT)
            .eq('scenario_id', scenarioId)
            .abortSignal(deadline)
          if (error) throw new Error(error.message)
          return (data ?? []) as CanvasRawPath[]
        }),
    })),
  })

  const loadedCount = results.filter(
    (result) => result.data !== undefined || result.error !== null,
  ).length
  const anyError = results.some((result) => result.error !== null)
  const allSettled = noDb || loadedCount === results.length
  const loading = orderedScenarioIds.length > 0 && !allSettled

  // dataUpdatedAt, not a y/e/n status string: after a mutation calls
  // invalidateQueries('canvas-blueprints') the refetched chunks come back
  // with data still DEFINED, so a status-only key never changed and the
  // canvas kept rendering pre-edit rows until a reload.
  const rowsKey = results
    .map((result) => (result.error ? 'e' : String(result.dataUpdatedAt ?? 0)))
    .join(',')
  const derived = useMemo<CanvasBlueprintMaps>(() => {
    if (orderedScenarioIds.length === 0) return EMPTY_MAPS
    if (noDb || !allSettled) {
      // Still on the wire → empty (the skeleton owns the canvas); no DB at
      // all → the static local fallbacks, same as before the split.
      return noDb ? staticFallbacks : EMPTY_MAPS
    }
    // Per-scenario degradation: a failed scenario contributes no rows and
    // therefore no board — the other scenarios keep their fetched data. It
    // does NOT contribute the bundled fixture: a read that failed against a
    // real database is an outage, and the sample is not what an outage looks
    // like.
    const rows = results.flatMap((result) => result.data ?? [])
    return deriveFromRows(rows, orderedScenarioIds)
    // rowsKey stands in for the results array's per-render identity churn.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orderedScenarioIds, noDb, allSettled, rowsKey, staticFallbacks])

  const firstError = results.find((result) => result.error)?.error
  const error = anyError
    ? firstError instanceof Error
      ? firstError.message
      : String(firstError)
    : null

  return {
    blueprintsByScenario: derived.blueprintsByScenario,
    pathsByScenario: derived.pathsByScenario,
    blueprintsByPathId: derived.blueprintsByPathId,
    loading,
    error,
    /** The board on screen IS the bundled sample — only ever true with no
     *  database configured. A failed read against a real database is an
     *  outage, not a fallback, and `error` is what reports it. */
    usingFallback: derived.usingFallback,
    /** Real network progress: settled chunks over total chunks. A no-DB
     *  session has nothing on the wire — it reports complete, so the bar
     *  never parks below full while nothing is loading. */
    progress: noDb
      ? { loaded: results.length, total: results.length }
      : { loaded: loadedCount, total: results.length },
  }
}
