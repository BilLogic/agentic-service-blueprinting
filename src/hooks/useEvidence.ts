import { useCallback } from 'react'
import {
  invalidateQueries,
  useSupabaseQuery,
  type QueryResult,
} from '@/hooks/useSupabaseQuery'
import type { Evidence } from '@/types/database'

/**
 * Drop the cached evidence for one cell and refetch mounted readers. Call
 * after a write lands (the template's read surface never writes, but agent
 * or import pipelines can).
 */
export function invalidateEvidence(cellId: string): void {
  invalidateQueries(`evidence:${cellId}`)
}

/**
 * Evidence rows for one cell, newest first. Evidence is public-readable by
 * policy — the research behind a published blueprint ships with it. No-DB
 * sessions resolve to `error`/null fallback, which the tab renders as an
 * offline note.
 */
export function useEvidence(cellId: string): QueryResult<Evidence[]> {
  const fallback = useCallback(() => null, [])

  return useSupabaseQuery<Evidence[]>(
    `evidence:${cellId}`,
    async (client) => {
      const { data, error } = await client
        .from('evidence')
        .select('*')
        .eq('cell_id', cellId)
        .order('created_at', { ascending: false })
      if (error) throw new Error(error.message)
      return data ?? []
    },
    fallback,
  )
}
