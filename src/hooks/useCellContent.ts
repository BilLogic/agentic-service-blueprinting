import { useCallback } from 'react'
import { useSupabaseQuery, type QueryResult } from '@/hooks/useSupabaseQuery'
import type { CellLink } from '@/types/blueprint'

export type CellContent = {
  content: string
  description: string | null
  owner: string | null
  perceived_owner: string | null
  links: CellLink[]
}

const CELL_CONTENT_SELECT = 'content, description, owner, perceived_owner, links'

/**
 * The cell's own editable text, read on demand.
 *
 * Separate from the grid query on purpose. The grid carries `content` and
 * `links` because it renders them, but not the owner pair — pulling those into
 * the canvas read would add two columns across every cell in the lifecycle to
 * serve a panel that shows one cell at a time.
 *
 * `null` means the cell exists only in local fallback content: there is
 * nothing stored to edit, and the editor stays hidden.
 */
export function useCellContent(
  cellId: string | null,
): QueryResult<CellContent | null> {
  const fallback = useCallback(() => null, [])

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
        description: data.description ?? null,
        owner: data.owner ?? null,
        perceived_owner: data.perceived_owner ?? null,
        links: (data.links ?? []) as unknown as CellLink[],
      }
    },
    fallback,
  )
}
