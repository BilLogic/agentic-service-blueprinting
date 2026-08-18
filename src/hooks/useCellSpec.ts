import { useCallback } from 'react'
import { getFallbackCell } from '@/data/blueprintFallbacks'
import { useSupabaseQuery, type QueryResult } from '@/hooks/useSupabaseQuery'
import type { Cell } from '@/types/database'

/** The spec columns the panel actually renders (see CellOverviewSpec). */
export type CellSpec = Pick<Cell, 'function' | 'form' | 'value_props'>

const CELL_SPEC_SELECT = 'function, form, value_props'

/**
 * Spec fields for one cell (panel Overview tab). The grid query deliberately
 * omits these columns; the panel fetches them on open. With no database the
 * generated sample content answers instead — it carries the same spec the seed
 * writes — so the FUNCTION / FORM / VALUE block is not a database-only
 * feature. `null` data = the cell is in neither, and the block stays hidden.
 */
export function useCellSpec(cellId: string | null): QueryResult<CellSpec | null> {
  const fallback = useCallback((): CellSpec | null => {
    const cell = getFallbackCell(cellId)
    if (!cell) return null
    return {
      function: cell.function ?? null,
      form: cell.form ?? null,
      value_props: (cell.value_props ?? []) as CellSpec['value_props'],
    }
  }, [cellId])

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
