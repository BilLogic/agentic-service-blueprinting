import { useCallback } from 'react'
import { useSupabaseQuery, type QueryResult } from '@/hooks/useSupabaseQuery'
import type { Cell } from '@/types/database'

/** The spec columns the panel actually renders (see CellOverviewSpec). */
export type CellSpec = Pick<Cell, 'function' | 'form' | 'value_props'>

const CELL_SPEC_SELECT = 'function, form, value_props'

/**
 * Spec fields for one cell (panel Overview tab). The grid query deliberately
 * omits these columns; the panel fetches them on open. `null` data = the
 * cell only exists in local fallback content — spec sections stay hidden.
 */
export function useCellSpec(cellId: string | null): QueryResult<CellSpec | null> {
  const fallback = useCallback(() => null, [])

  return useSupabaseQuery<CellSpec | null>(
    `cell-spec:${cellId ?? 'none'}`,
    async (client) => {
      if (!cellId) return null
      const { data, error } = await client
        .from('cells')
        .select(CELL_SPEC_SELECT)
        .eq('id', cellId)
        .maybeSingle()
      if (error) throw new Error(error.message)
      return data ?? null
    },
    fallback,
  )
}
