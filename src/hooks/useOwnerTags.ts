import { useCallback } from 'react'
import { useSupabaseQuery, type QueryResult } from '@/hooks/useSupabaseQuery'

/**
 * The owner vocabulary: every distinct value currently used by any cell's
 * `owner` or `perceived_owner`.
 *
 * One list for both fields on purpose — "Field Ops" is the same team whether
 * it is accountable or merely perceived, and two vocabularies would drift
 * into `Field Ops` / `FieldOps` / `field ops`, which is exactly the mess the
 * dropdown exists to prevent.
 */
export function useOwnerTags(): QueryResult<string[]> {
  const fallback = useCallback(() => [], [])

  return useSupabaseQuery<string[]>(
    'owner-tags',
    async (client) => {
      const { data, error } = await client
        .from('cells')
        .select('owner, perceived_owner')
        .or('owner.not.is.null,perceived_owner.not.is.null')
      if (error) throw new Error(error.message)

      const tags = new Set<string>()
      for (const row of data ?? []) {
        const owner = row.owner?.trim()
        const perceived = row.perceived_owner?.trim()
        if (owner) tags.add(owner)
        if (perceived) tags.add(perceived)
      }
      return [...tags].sort((a, b) => a.localeCompare(b))
    },
    fallback,
  )
}
