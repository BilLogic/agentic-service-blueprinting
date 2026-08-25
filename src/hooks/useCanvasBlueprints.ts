import { useMemo } from 'react'
import { useQueries } from '@tanstack/react-query'
import {
  getBlueprintFallback,
  getFallbackPathsForScenario,
  mergePathsWithFallback,
} from '@/data/blueprintFallbacks'
import { useSupabase } from '@/contexts/SupabaseProvider'
import { queryClient } from '@/lib/queryClient'
import { raceSupabaseQuery } from '@/lib/supabaseFetchTimeout'
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

/** Group fetched path rows into the per-scenario / per-path blueprint maps. */
function deriveFromRows(
  rows: CanvasRawPath[],
  orderedScenarioIds: string[],
  staticFallbacks: CanvasBlueprintMaps,
): CanvasBlueprintMaps {
  const grouped = new Map<string, CanvasRawPath[]>()
  const byPathId = new Map<string, BlueprintData>()
  let anyFallback = false

  for (const row of rows) {
    const list = grouped.get(row.scenario_id) ?? []
    list.push(row)
    grouped.set(row.scenario_id, list)

    const resolved = resolveBlueprintForScenario(row.scenario_id, row)
    if (resolved.blueprint) {
      byPathId.set(row.id, resolved.blueprint)
      if (resolved.source === 'fallback') anyFallback = true
    }
  }

  const byScenario = new Map<string, BlueprintData>()
  const pathsMap = new Map<string, PathListItem[]>()

  for (const scenarioId of orderedScenarioIds) {
    const scenarioPaths = grouped.get(scenarioId) ?? []
    if (scenarioPaths.length > 0) {
      pathsMap.set(
        scenarioId,
        mergePathsWithFallback(
          scenarioId,
          scenarioPaths.map((path) => ({
            id: path.id,
            name: path.name,
            summary: path.summary ?? null,
            note: path.note ?? null,
            path_type: path.path_type,
          })),
        ),
      )
    } else {
      const fallbackPaths = getFallbackPathsForScenario(scenarioId)
      if (fallbackPaths.length > 0) {
        pathsMap.set(scenarioId, fallbackPaths)
      }
    }

    const chosen = pickPathForScenario(scenarioPaths)
    const resolved = resolveBlueprintForScenario(scenarioId, chosen)
    if (resolved.blueprint) {
      byScenario.set(scenarioId, resolved.blueprint)
      if (resolved.source === 'fallback') anyFallback = true
    } else {
      const fallback = getBlueprintFallback(scenarioId)
      if (fallback) {
        byScenario.set(scenarioId, fallback)
        anyFallback = true
      }
    }
  }

  if (
    byScenario.size === 0 &&
    staticFallbacks.blueprintsByScenario.size > 0
  ) {
    return { ...staticFallbacks, usingFallback: true }
  }

  return {
    blueprintsByScenario: byScenario,
    pathsByScenario:
      pathsMap.size > 0 ? pathsMap : staticFallbacks.pathsByScenario,
    blueprintsByPathId:
      byPathId.size > 0 ? byPathId : staticFallbacks.blueprintsByPathId,
    usingFallback:
      anyFallback ||
      (byScenario.size === 0 &&
        staticFallbacks.blueprintsByScenario.size > 0),
  }
}

const SCENARIO_KEY_PREFIX = 'canvas-blueprints:scenario:'

/**
 * Invalidate exactly the scenarios a write touched — one refetch, not a
 * board-wide storm (todo 029). Membership changes (create/delete/duplicate
 * scenario) still go through `invalidateStructure()`'s bare
 * 'canvas-blueprints' prefix, which these keys also match.
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
 * key; the rest stay warm — todo 029), and a lost request degrades only
 * its own scenario to the static fallback instead of the whole board
 * (todo 030). Keys live under the `canvas-blueprints:` prefix the
 * mutation contract invalidates.
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
      queryFn: async (): Promise<CanvasRawPath[]> => {
        const outcome = await raceSupabaseQuery(
          (async () => {
            const { data, error } = await client!
              .from('paths')
              .select(PATH_BLUEPRINT_SELECT)
              .eq('scenario_id', scenarioId)
            if (error) throw new Error(error.message)
            return (data ?? []) as CanvasRawPath[]
          })(),
        )
        if (outcome === 'timeout') throw new Error('The request timed out')
        return outcome
      },
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
    // Per-scenario degradation (todo 030): a failed scenario contributes no
    // rows, and deriveFromRows already falls back to the bundled fixture
    // for a scenario with nothing — the other scenarios keep their fetched
    // data instead of the whole board swapping to statics.
    const rows = results.flatMap((result) => result.data ?? [])
    return deriveFromRows(rows, orderedScenarioIds, staticFallbacks)
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
    usingFallback: derived.usingFallback || anyError,
    /** Real network progress: settled chunks over total chunks. A no-DB
     *  session has nothing on the wire — it reports complete, so the bar
     *  never parks below full while nothing is loading. */
    progress: noDb
      ? { loaded: results.length, total: results.length }
      : { loaded: loadedCount, total: results.length },
  }
}
