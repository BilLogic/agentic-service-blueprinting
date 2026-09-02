import { useCallback } from 'react'
import { getFallbackCell } from '@/data/blueprintFallbacks'
import { useSupabaseQuery, type QueryResult } from '@/hooks/useSupabaseQuery'
import type { CellResource } from '@/types/blueprint'
import { cellResources, cellResourcesFromRows } from '@/lib/cellResources'

export type CellContent = {
  content: string
  summary: string | null
  owner: string | null
  perceived_owner: string | null
  resources: CellResource[]
}

const CELL_CONTENT_SELECT = `
  content,
  summary,
  owner,
  perceived_owner,
  resources!resources_cell_id_fkey (
    id,
    position,
    kind,
    name,
    url,
    cell_touchpoint_id,
    featured
  )
`

/**
 * The cell's own editable text, read on demand.
 *
 * Separate from the grid query on purpose. The grid carries `content` and
 * the resources because it renders them, but not the owner pair — pulling those into
 * the canvas read would add two columns across every cell in the service to
 * serve a panel that shows one cell at a time.
 *
 * With no database the sample content answers instead: the generated fallback
 * carries the same cell spec the seed writes, so a keyless clone still shows
 * the owner pair where the sample sets one. `null` means the cell is not in the
 * fallback registry either — there is nothing stored to show or edit.
 */
export function useCellContent(
  cellId: string | null,
): QueryResult<CellContent | null> {
  const fallback = useCallback((): CellContent | null => {
    const cell = getFallbackCell(cellId)
    if (!cell) return null
    return {
      content: cell.content,
      summary: cell.summary,
      owner: cell.owner ?? null,
      perceived_owner: cell.perceived_owner ?? null,
      resources: cellResources(cell),
    }
  }, [cellId])

  return useSupabaseQuery<CellContent | null>(
    `cell-content:${cellId ?? 'none'}`,
    async (client) => {
      if (!cellId) return null
      const { data, error } = await client
        .from('cells')
        .select(CELL_CONTENT_SELECT)
        .eq('id', cellId)
        .maybeSingle()
      if (error) throw new Error(error.message)
      if (!data) return null
      return {
        content: data.content ?? '',
        summary: data.summary ?? null,
        owner: data.owner ?? null,
        perceived_owner: data.perceived_owner ?? null,
        resources: cellResourcesFromRows(data.resources),
      }
    },
    fallback,
  )
}
