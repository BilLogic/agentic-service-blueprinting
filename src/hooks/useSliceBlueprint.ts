import { useMemo } from 'react'
import { useCanvasBlueprints } from '@/hooks/useCanvasBlueprints'
import { useSlice, type SliceDetail } from '@/hooks/useSlice'
import { useSliceScenarioId } from '@/hooks/useSliceScenarioId'
import type { QueryResult } from '@/hooks/useSupabaseQuery'
import { pickBlueprintForCells } from '@/lib/sliceCells'
import type { BlueprintData } from '@/types/blueprint'
import type { SliceItem } from '@/types/database'

export type SliceBlueprint = {
  /** Raw slice query result, for loading / error branches. */
  result: QueryResult<SliceDetail>
  /** Loaded detail (error branches fall back); null while unavailable. */
  detail: SliceDetail | null
  /** The slice's frames sorted by position. */
  items: SliceItem[]
  /** Cell ids across all frames, in frame order then in-frame order. */
  cellIds: string[]
  /** Scenario resolution result (gated until `detail` exists). */
  scenarioResult: QueryResult<string>
  /** Scenario owning the slice's cells; undefined while unresolved. */
  scenarioId: string | undefined
  /** The scenario blueprint containing the most of the slice's cells. */
  blueprint: BlueprintData | null
  /** True while the scenario's blueprints are still in flight. */
  blueprintsLoading: boolean
}

/**
 * Shared resolution preamble for the slice tabs (focus view and
 * presentation): slice detail → position-sorted frames → ordered cell ids →
 * owning scenario → best-matching blueprint. Every step reads the shared
 * query cache, so the focus and present tab of one slice resolve from the
 * same fetches.
 */
export function useSliceBlueprint(sliceId: string): SliceBlueprint {
  const result = useSlice(sliceId)
  const detail: SliceDetail | null =
    result.status === 'ready'
      ? result.data
      : result.status === 'error'
        ? result.fallback
        : null

  const items = useMemo(
    () => [...(detail?.items ?? [])].sort((a, b) => a.position - b.position),
    [detail],
  )
  // `items` is already position-sorted — flatMap keeps frame order without
  // a second sort.
  const cellIds = useMemo(
    () => items.flatMap((item) => item.cell_ids),
    [items],
  )

  const scenarioResult = useSliceScenarioId(detail ? cellIds : null)
  const scenarioId =
    scenarioResult.status === 'ready'
      ? scenarioResult.data
      : scenarioResult.status === 'error'
        ? (scenarioResult.fallback ?? undefined)
        : undefined

  // Same cached query key as the embedded canvas (ServiceOverviewView) —
  // membership resolution never refetches what the canvas already loaded.
  const { blueprintsByPathId, loading: blueprintsLoading } =
    useCanvasBlueprints(scenarioId ? [scenarioId] : [])
  const blueprint = useMemo(
    () => pickBlueprintForCells([...blueprintsByPathId.values()], cellIds),
    [blueprintsByPathId, cellIds],
  )

  return {
    result,
    detail,
    items,
    cellIds,
    scenarioResult,
    scenarioId,
    blueprint,
    blueprintsLoading,
  }
}
