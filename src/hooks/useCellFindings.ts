import { useCallback } from 'react'
import { useSupabaseQuery, type QueryResult } from '@/hooks/useSupabaseQuery'
import type { Finding } from '@/types/database'

/**
 * OPEN findings touching one cell (`cell_ids` array containment), newest
 * first. Read-only surface: triage (resolve/dismiss) belongs to the agent
 * tier, not the viewer. No-DB sessions resolve to `error`/null fallback and
 * the panel hides the section.
 */
export function useCellFindings(cellId: string): QueryResult<Finding[]> {
  const fallback = useCallback(() => null, [])

  return useSupabaseQuery<Finding[]>(
    `cell-findings:${cellId}`,
    async (client) => {
      const { data, error } = await client
        .from('findings')
        .select('*')
        .contains('cell_ids', [cellId])
        .eq('status', 'open')
        .order('created_at', { ascending: false })
      if (error) throw new Error(error.message)
      return data ?? []
    },
    fallback,
  )
}
