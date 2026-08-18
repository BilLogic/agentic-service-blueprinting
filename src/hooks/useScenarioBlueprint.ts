import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  getBlueprintFallback,
  getFallbackPathsForScenario,
  mergePathsWithFallback,
} from '@/data/blueprintFallbacks'
import { useSupabase } from '@/contexts/SupabaseProvider'
import { usePathSelection } from '@/hooks/usePathSelection'
import {
  fetchScenarioBlueprintRows,
  scenarioBlueprintQueryKey,
  type CanvasRawPath,
} from '@/hooks/useCanvasBlueprints'
import { resolveBlueprintForScenario, type BlueprintSource } from '@/lib/resolveBlueprint'
import { mergeIntegratedBlueprint } from '@/lib/mergeIntegratedBlueprint'
import type { PathListItem } from '@/lib/pathSelection'
import { itemsInSelectionOrder } from '@/lib/pathSelection'
import type { BlueprintData } from '@/types/blueprint'

function loadFallbackBlueprints(
  serviceScenarioId: string,
  paths: PathListItem[],
): Record<string, BlueprintData> {
  const next: Record<string, BlueprintData> = {}
  for (const path of paths) {
    const fallback = getBlueprintFallback(
      serviceScenarioId,
      path.id,
      path.path_type,
    )
    if (fallback) next[path.id] = fallback
  }
  return next
}

type ScenarioBlueprintState = {
  paths: PathListItem[]
  blueprintsByPathId: Record<string, BlueprintData>
  source: BlueprintSource
}

const EMPTY_STATE: ScenarioBlueprintState = {
  paths: [],
  blueprintsByPathId: {},
  source: null,
}

/**
 * Paths + blueprints of one scenario, read through the SAME per-scenario
 * query `useCanvasBlueprints` uses (`canvas-blueprints:scenario:<id>`): the
 * overview canvas and the scenario detail share one cache entry, and one
 * `invalidateCanvasBlueprintsForScenario`/`ForPath` call refreshes both.
 * With no database configured the state resolves synchronously from the
 * bundled fallback module — same interface, no second code path in
 * components. A failed or timed-out read degrades this scenario to the
 * bundled fallback.
 */
export function useScenarioBlueprint(serviceScenarioId: string | undefined) {
  const { client, configured } = useSupabase()
  const noDb = !configured || !client

  const fallbackPaths = useMemo(
    () => getFallbackPathsForScenario(serviceScenarioId),
    [serviceScenarioId],
  )

  const query = useQuery<CanvasRawPath[]>({
    queryKey: scenarioBlueprintQueryKey(serviceScenarioId ?? 'none'),
    enabled: serviceScenarioId !== undefined && !noDb,
    queryFn: () => fetchScenarioBlueprintRows(client!, serviceScenarioId!),
  })

  const rows = query.data
  const queryError = query.error
  const errored = queryError !== null

  const derived = useMemo<ScenarioBlueprintState>(() => {
    if (!serviceScenarioId) return EMPTY_STATE

    const fromFallback = (): ScenarioBlueprintState => ({
      paths: fallbackPaths,
      blueprintsByPathId:
        fallbackPaths.length > 0
          ? loadFallbackBlueprints(serviceScenarioId, fallbackPaths)
          : {},
      source: fallbackPaths.length > 0 ? 'fallback' : null,
    })

    if (noDb || errored) return fromFallback()
    if (rows === undefined) return EMPTY_STATE // still on the wire

    const list = mergePathsWithFallback(
      serviceScenarioId,
      rows.map((row) => ({
        id: row.id,
        name: row.name,
        description: row.description ?? null,
        note: row.note ?? null,
        path_type: row.path_type,
      })),
    )
    if (list.length === 0) return fromFallback()

    const rowById = new Map(rows.map((row) => [row.id, row]))
    const blueprintsByPathId: Record<string, BlueprintData> = {}
    let anyFallback = false

    for (const path of list) {
      const row = rowById.get(path.id)
      if (row) {
        const resolved = resolveBlueprintForScenario(serviceScenarioId, row)
        if (resolved.blueprint) {
          blueprintsByPathId[path.id] = resolved.blueprint
          if (resolved.source === 'fallback') anyFallback = true
        }
      } else {
        // A fallback-merged path with no database row resolves from the
        // bundled fallback module directly.
        const fallback = getBlueprintFallback(
          serviceScenarioId,
          path.id,
          path.path_type,
        )
        if (fallback) {
          blueprintsByPathId[path.id] = fallback
          anyFallback = true
        }
      }
    }

    return {
      paths: list,
      blueprintsByPathId,
      source: anyFallback
        ? 'fallback'
        : Object.keys(blueprintsByPathId).length > 0
          ? 'database'
          : null,
    }
  }, [serviceScenarioId, noDb, errored, rows, fallbackPaths])

  const { paths, blueprintsByPathId, source } = derived
  const { selectedPathIds, setSelectedPathIds, togglePathSelection } =
    usePathSelection(paths)

  const loading =
    serviceScenarioId !== undefined && !noDb && query.isPending

  const error = errored
    ? queryError instanceof Error
      ? queryError.message
      : String(queryError)
    : null

  const allBlueprints = useMemo(
    () =>
      paths
        .map((path) => blueprintsByPathId[path.id])
        .filter((blueprint): blueprint is BlueprintData => blueprint !== undefined),
    [paths, blueprintsByPathId],
  )

  const blueprints = useMemo(
    () =>
      itemsInSelectionOrder(selectedPathIds, (id) => blueprintsByPathId[id]),
    [selectedPathIds, blueprintsByPathId],
  )

  const integratedBlueprint = useMemo(
    () => mergeIntegratedBlueprint(allBlueprints, selectedPathIds),
    [allBlueprints, selectedPathIds],
  )

  const blueprint = blueprints[0] ?? null

  const selectedPath = useMemo(
    () => paths.find((p) => p.id === selectedPathIds[0]) ?? null,
    [paths, selectedPathIds],
  )

  return {
    paths,
    selectedPathIds,
    setSelectedPathIds,
    togglePathSelection,
    selectedPath,
    blueprint,
    blueprints,
    allBlueprints,
    integratedBlueprint,
    source,
    loading,
    error,
    configured,
  }
}
