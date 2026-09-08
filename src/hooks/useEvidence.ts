import { useCallback } from 'react'
import {
  invalidateQueries,
  useSupabaseQuery,
  type QueryResult,
} from '@/hooks/useSupabaseQuery'
import type { Evidence } from '@/types/database'

/**
 * Drop the cached evidence for one cell and refetch mounted readers. Call
 * after inserting or deleting a source. (This replaced a component-local
 * reload token baked into the key: the token reset to 0 on remount, so with
 * staleTime Infinity a reopened panel served the pre-insert list forever,
 * and every dead token generation stayed cached.)
 */
export function invalidateEvidence(cellId: string): void {
  invalidateQueries(`evidence:${cellId}`)
}

/**
 * Evidence rows for one cell, newest first. Evidence is deliberately
 * public-readable (decision 2026-08-06, access-model plan): the research
 * behind a published blueprint ships with it, and anon SELECT is granted by
 * policy. Mount with the Evidence tab open; call `invalidateEvidence` after
 * a write.
 */
export function useEvidence(cellId: string): QueryResult<Evidence[]> {
  const fallback = useCallback(() => null, [])

  return useSupabaseQuery<Evidence[]>(
    `evidence:${cellId}`,
    async (client, signal) => {
      const { data, error } = await client
        .from('evidence')
        .select('*')
        .eq('cell_id', cellId)
        .order('created_at', { ascending: false })
        .abortSignal(signal)
      if (error) throw new Error(error.message)
      return data ?? []
    },
    fallback,
  )
}
