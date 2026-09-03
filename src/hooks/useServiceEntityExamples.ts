import { useCallback } from 'react'
import { useSupabaseQuery, type QueryResult } from '@/hooks/useSupabaseQuery'
import { SAMPLE_ENTITY_EXAMPLES } from '@/data/sampleBlueprint'
import type { EntityExamples } from '@/lib/panelTerms'

/**
 * The service's six per-kind examples, read once for the whole board.
 *
 * The examples live in one jsonb map on the service row (`entity_examples`),
 * so this is a single-row read keyed constantly: there is one active service
 * per page, the query is cached, and every definition popover shares the one
 * answer through `EntityExamplesContext` rather than each fetching its own.
 *
 * No database configured falls back to the bundled sample service's examples,
 * so a definition popover grounds itself even with no backend. A service row
 * that has authored nothing reads back `{}` — the column defaults to `{}` and
 * is never null, so the cast is safe — and renders no example.
 */
export function useServiceEntityExamples(): QueryResult<EntityExamples> {
  const fallback = useCallback(
    (): EntityExamples => SAMPLE_ENTITY_EXAMPLES as EntityExamples,
    [],
  )

  return useSupabaseQuery<EntityExamples>(
    'service-entity-examples:first',
    async (client) => {
      const { data, error } = await client
        .from('services')
        .select('id, entity_examples')
        .order('created_at', { ascending: true })
        .limit(1)
      if (error) throw new Error(error.message)
      const row = data?.[0]
      return (row?.entity_examples as EntityExamples | null) ?? {}
    },
    fallback,
  )
}
