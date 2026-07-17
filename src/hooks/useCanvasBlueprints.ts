import { useEffect, useMemo, useState } from 'react'
import {
  getBlueprintFallback,
  getFallbackPathsForScenario,
  mergePathsWithFallback,
} from '@/data/blueprintFallbacks'
import { useSupabase } from '@/contexts/SupabaseProvider'
import { resolveBlueprintForScenario } from '@/lib/resolveBlueprint'
import type { RawPath } from '@/lib/normalizeBlueprint'
import type { PathListItem } from '@/lib/pathSelection'
import { raceSupabaseQuery } from '@/lib/supabaseFetchTimeout'
import { PATH_BLUEPRINT_SELECT } from '@/lib/workflowQueries'
import type { BlueprintData } from '@/types/blueprint'

type CanvasRawPath = RawPath & {
  service_scenario_id: string
}

function pickPathForScenario(paths: CanvasRawPath[]): CanvasRawPath | null {
  if (paths.length === 0) return null
  return paths.find((p) => p.path_type === 'happy') ?? paths[0]
}

function buildFallbackMaps(scenarioIds: string[]) {
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

  return { blueprintsByScenario, pathsByScenario, blueprintsByPathId }
}

export function useCanvasBlueprints(scenarioIds: string[]) {
  const { client, configured } = useSupabase()
  const [blueprintsByScenario, setBlueprintsByScenario] = useState<
    Map<string, BlueprintData>
  >(new Map())
  const [pathsByScenario, setPathsByScenario] = useState<
    Map<string, PathListItem[]>
  >(new Map())
  const [blueprintsByPathId, setBlueprintsByPathId] = useState<
    Map<string, BlueprintData>
  >(new Map())
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [usingFallback, setUsingFallback] = useState(false)

  const idsKey = scenarioIds.slice().sort().join(',')
  const orderedScenarioIds = useMemo(
    () => (idsKey ? idsKey.split(',') : []),
    [idsKey],
  )
  const staticFallbacks = useMemo(
    () => buildFallbackMaps(orderedScenarioIds),
    [idsKey, orderedScenarioIds],
  )

  useEffect(() => {
    if (orderedScenarioIds.length === 0) {
      setBlueprintsByScenario(new Map())
      setPathsByScenario(new Map())
      setBlueprintsByPathId(new Map())
      setLoading(false)
      setError(null)
      setUsingFallback(false)
      return
    }

    if (!configured || !client) {
      setBlueprintsByScenario(staticFallbacks.blueprintsByScenario)
      setPathsByScenario(staticFallbacks.pathsByScenario)
      setBlueprintsByPathId(staticFallbacks.blueprintsByPathId)
      setUsingFallback(staticFallbacks.blueprintsByScenario.size > 0)
      setLoading(false)
      setError(null)
      return
    }

    let cancelled = false
    setLoading(true)
    setError(null)

    const query = client
      .from('paths')
      .select(PATH_BLUEPRINT_SELECT)
      .in('service_scenario_id', orderedScenarioIds)

    void raceSupabaseQuery(query).then((result) => {
        if (cancelled) return

        if (result === 'timeout') {
          setBlueprintsByScenario(staticFallbacks.blueprintsByScenario)
          setPathsByScenario(staticFallbacks.pathsByScenario)
          setBlueprintsByPathId(staticFallbacks.blueprintsByPathId)
          setUsingFallback(staticFallbacks.blueprintsByScenario.size > 0)
          setError(null)
          setLoading(false)
          return
        }

        const { data, error: err } = result
        if (err) {
          setError(err.message)
          setBlueprintsByScenario(staticFallbacks.blueprintsByScenario)
          setPathsByScenario(staticFallbacks.pathsByScenario)
          setBlueprintsByPathId(staticFallbacks.blueprintsByPathId)
          setUsingFallback(staticFallbacks.blueprintsByScenario.size > 0)
          setLoading(false)
          return
        }

        const grouped = new Map<string, CanvasRawPath[]>()
        const byPathId = new Map<string, BlueprintData>()
        let anyFallback = false

        for (const row of (data ?? []) as CanvasRawPath[]) {
          const list = grouped.get(row.service_scenario_id) ?? []
          list.push(row)
          grouped.set(row.service_scenario_id, list)

          const resolved = resolveBlueprintForScenario(
            row.service_scenario_id,
            row,
          )
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
                  description: path.description ?? null,
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

        if (byScenario.size === 0 && staticFallbacks.blueprintsByScenario.size > 0) {
          setBlueprintsByScenario(staticFallbacks.blueprintsByScenario)
          setPathsByScenario(staticFallbacks.pathsByScenario)
          setBlueprintsByPathId(staticFallbacks.blueprintsByPathId)
          setUsingFallback(true)
        } else {
          setBlueprintsByScenario(byScenario)
          setPathsByScenario(
            pathsMap.size > 0 ? pathsMap : staticFallbacks.pathsByScenario,
          )
          setBlueprintsByPathId(
            byPathId.size > 0 ? byPathId : staticFallbacks.blueprintsByPathId,
          )
          setUsingFallback(
            anyFallback ||
              (byScenario.size === 0 &&
                staticFallbacks.blueprintsByScenario.size > 0),
          )
        }

        setError(null)
        setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [client, configured, idsKey, staticFallbacks])

  return {
    blueprintsByScenario,
    pathsByScenario,
    blueprintsByPathId,
    loading,
    error,
    configured,
    usingFallback,
  }
}
