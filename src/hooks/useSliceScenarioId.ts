import { useCallback } from 'react'
import { useOfflineBoard } from '@/contexts/DeploymentConfigContext'
import { useSupabaseQuery, type QueryResult } from '@/hooks/useSupabaseQuery'
import { findFallbackScenarioForCells } from '@/lib/sliceCells'
import { queryKeys } from '@/lib/queryKeys'

/**
 * Scenario owning a slice's cells (v1 slices are single-scenario). Pass
 * `null` while the slice detail is still loading — the query is gated (no
 * fetch, no transient error) until the real cell ids exist.
 *
 * The key is the cell ids and NOT the offline board those ids may resolve
 * against, which assumes one board per query client. `App` mounts one
 * provider, so that holds everywhere this ships; a tree that deliberately
 * stands two providers over one client — the provider's own test does — would
 * serve the first board's answer to the second, and this is the line that says
 * so rather than the cache that discovers it.
 */
export function useSliceScenarioId(
  cellIds: readonly string[] | null,
): QueryResult<string> {
  const board = useOfflineBoard()
  const fallback = useCallback(
    () => (cellIds ? findFallbackScenarioForCells(board, cellIds) : null),
    [board, cellIds],
  )

  return useSupabaseQuery<string>(
    cellIds === null ? null : queryKeys.sliceScenario.of(cellIds),
    async (client, signal) => {
      if (!cellIds || cellIds.length === 0) {
        throw new Error('The slice has no cells')
      }

      const { data, error } = await client
        .from('cells')
        .select('id, paths(scenario_id)')
        .in('id', [...cellIds])
        .abortSignal(signal)
      if (error) throw new Error(error.message)

      const scenarioId = (data ?? []).find((row) => row.paths !== null)?.paths
        ?.scenario_id
      if (scenarioId) return scenarioId

      // Cells may live only in the local fallback content.
      const fallbackScenarioId = findFallbackScenarioForCells(board, cellIds)
      if (fallbackScenarioId) return fallbackScenarioId

      throw new Error('The slice cells are no longer in the blueprint')
    },
    fallback,
  )
}
