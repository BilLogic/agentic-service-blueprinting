import { useCallback } from 'react'
import { useSupabaseQuery, type QueryResult } from '@/hooks/useSupabaseQuery'

export type RegistryTouchpoint = { id: string; name: string; kind: string }

/**
 * The registry a placement can link to: every touchpoint in the deployment.
 *
 * The registry is the deployment's, not the service's, and under the decision
 * that a service owns its journey and shares the catalog the unscoped read is
 * CORRECT rather than a latent bug — a touchpoint minted for one service is
 * reachable from any of them, which is the whole point of a shared pool. It
 * resolved a cell's owning service through its path, scenario and phase while
 * a touchpoint still carried a `service_id`; the join went with the column.
 *
 * Still keyed by the cell, because that is what the panel has and the key
 * keeps each panel's query cached separately.
 */
export function useRegistryTouchpoints(
  cellId: string | null,
): QueryResult<RegistryTouchpoint[]> {
  const fallback = useCallback(() => [], [])
  return useSupabaseQuery<RegistryTouchpoint[]>(
    cellId ? `registry-touchpoints:${cellId}` : null,
    async (client, signal) => {
      const { data, error } = await client
        .from('touchpoints')
        .select('id, name, kind')
        .order('name')
        .abortSignal(signal)
      if (error) throw error
      return (data ?? []).map((row) => ({ id: row.id, name: row.name, kind: row.kind }))
    },
    fallback,
  )
}

/** A cell's name-only placements — the rows a "Link to registry" acts on. */
export type NameOnlyPlacement = { id: string; name: string }

export function useNameOnlyPlacements(
  cellId: string | null,
): QueryResult<NameOnlyPlacement[]> {
  const fallback = useCallback(() => [], [])
  return useSupabaseQuery<NameOnlyPlacement[]>(
    cellId ? `name-only-placements:${cellId}` : null,
    async (client, signal) => {
      const { data, error } = await client
        .from('cell_touchpoints')
        .select('id, name')
        .eq('cell_id', cellId!)
        .is('touchpoint_id', null)
        .order('position')
        .abortSignal(signal)
      if (error) throw error
      return (data ?? []).flatMap((row) =>
        row.name ? [{ id: row.id, name: row.name }] : [],
      )
    },
    fallback,
  )
}
