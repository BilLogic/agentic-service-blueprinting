import { useCallback } from 'react'
import { useSupabaseQuery, type QueryResult } from '@/hooks/useSupabaseQuery'
import type { Evidence } from '@/types/database'
import { queryKeys } from '@/lib/queryKeys'

/**
 * Evidence rows for one cell, newest first. Evidence is deliberately
 * public-readable (decision 2026-08-06, access-model plan): the research
 * behind a published blueprint ships with it, and anon SELECT is granted by
 * policy. Mount with the Evidence tab open; the evidence writes refetch it
 * for the cell they touched.
 */
export function useEvidence(cellId: string): QueryResult<Evidence[]> {
  const fallback = useCallback(() => null, [])

  return useSupabaseQuery<Evidence[]>(
    queryKeys.evidence.of(cellId),
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
