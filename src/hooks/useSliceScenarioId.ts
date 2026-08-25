import { useCallback } from 'react'
import { useSupabaseQuery, type QueryResult } from '@/hooks/useSupabaseQuery'
import { findFallbackScenarioForCells } from '@/lib/sliceCells'

/**
 * Scenario owning a slice's cells (v1 slices are single-scenario). Pass
 * `null` while the slice detail is still loading — the query is gated (no
 * fetch, no transient error) until the real cell ids exist.
 */
export function useSliceScenarioId(
  cellIds: readonly string[] | null,
): QueryResult<string> {
  const fallback = useCallback(
    () => (cellIds ? findFallbackScenarioForCells(cellIds) : null),
    [cellIds],
  )

  return useSupabaseQuery<string>(
    cellIds === null ? null : `slice-scenario:${cellIds.join('|')}`,
    async (client) => {
      if (!cellIds || cellIds.length === 0) {
        throw new Error('The slice has no cells')
      }

      const { data, error } = await client
        .from('cells')
        .select('id, paths(scenario_id)')
        .in('id', [...cellIds])
      if (error) throw new Error(error.message)

      const scenarioId = (data ?? []).find((row) => row.paths !== null)?.paths
        ?.scenario_id
      if (scenarioId) return scenarioId

      // Cells may live only in the local fallback content.
      const fallbackScenarioId = findFallbackScenarioForCells(cellIds)
      if (fallbackScenarioId) return fallbackScenarioId

      throw new Error('The slice cells are no longer in the blueprint')
    },
    fallback,
  )
}
