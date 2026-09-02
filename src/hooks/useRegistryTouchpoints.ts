import { useCallback } from 'react'
import { useSupabaseQuery, type QueryResult } from '@/hooks/useSupabaseQuery'

export type RegistryTouchpoint = { id: string; name: string; kind: string }

/**
 * The registry a cell's service keeps: every touchpoint it could be linked
 * to (#112).
 *
 * Keyed by the cell because that is what the panel has. The service is
 * reached through the cell's path, scenario and phase — two reads, one key —
 * rather than threaded through six components that never needed it before.
 */
export function useRegistryTouchpoints(
  cellId: string | null,
): QueryResult<RegistryTouchpoint[]> {
  const fallback = useCallback(() => [], [])
  return useSupabaseQuery<RegistryTouchpoint[]>(
    cellId ? `registry-touchpoints:${cellId}` : null,
    async (client) => {
      const { data: cell, error: cellError } = await client
        .from('cells')
        .select('paths ( scenarios ( phases ( service_id ) ) )')
        .eq('id', cellId!)
        .maybeSingle()
      if (cellError) throw cellError
      const serviceId = (
        cell as { paths?: { scenarios?: { phases?: { service_id?: string | null } | null } | null } | null } | null
      )?.paths?.scenarios?.phases?.service_id
      if (!serviceId) return []
      const { data, error } = await client
        .from('touchpoints')
        .select('id, name, kind')
        .eq('service_id', serviceId)
        .order('name')
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
    async (client) => {
      const { data, error } = await client
        .from('cell_touchpoints')
        .select('id, name')
        .eq('cell_id', cellId!)
        .is('touchpoint_id', null)
        .order('position')
      if (error) throw error
      return (data ?? []).flatMap((row) =>
        row.name ? [{ id: row.id, name: row.name }] : [],
      )
    },
    fallback,
  )
}
