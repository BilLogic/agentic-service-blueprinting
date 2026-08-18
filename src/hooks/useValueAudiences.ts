import { useCallback } from 'react'
import { useSupabaseQuery, type QueryResult } from '@/hooks/useSupabaseQuery'
import { parseValueProps } from '@/lib/valueProps'
import type { Json } from '@/types/database'

/**
 * Every audience name already used in a value prop's "for" — the vocabulary
 * the Value editor suggests from, for the same reason owners became tags:
 * "Resident", "Residents" and "resident" are one audience, not three.
 */
export function useValueAudiences(): QueryResult<string[]> {
  const fallback = useCallback(() => [], [])

  return useSupabaseQuery<string[]>(
    'value-audiences',
    async (client) => {
      const { data, error } = await client
        .from('cells')
        .select('value_props')
        .not('value_props', 'is', null)
      if (error) throw new Error(error.message)

      const audiences = new Set<string>()
      for (const row of data ?? []) {
        for (const entry of parseValueProps(row.value_props as Json)) {
          const name = entry.for.trim()
          if (name) audiences.add(name)
        }
      }
      return [...audiences].sort((a, b) => a.localeCompare(b))
    },
    fallback,
  )
}
