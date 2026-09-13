import { useCallback } from 'react'
import { useSupabaseQuery, type QueryResult } from '@/hooks/useSupabaseQuery'
import { SAMPLE_ENTITY_EXAMPLES } from '@/data/sampleBlueprint'
import type { EntityExamples } from '@/lib/panelTerms'
import { queryKeys } from '@/lib/queryKeys'

/**
 * One service's six per-kind examples, read once for the whole board.
 *
 * The examples live in one jsonb map on the service row (`entity_examples`),
 * so this is a single-row read keyed by the service: the query is cached, and
 * every definition popover shares the one answer through
 * `EntityExamplesContext` rather than each fetching its own.
 *
 * The row is the one the caller names — the active service, from the store.
 * Taking the first row by `created_at` instead grounded every definition with
 * another service's examples as soon as a second service existed.
 *
 * No database configured falls back to the bundled sample service's examples,
 * so a definition popover grounds itself even with no backend. A service row
 * that has authored nothing reads back `{}` — the column defaults to `{}` and
 * is never null, so the cast is safe — and renders no example.
 */
export function useServiceEntityExamples(serviceId: string | null): QueryResult<EntityExamples> {
  const fallback = useCallback(
    (): EntityExamples => SAMPLE_ENTITY_EXAMPLES as EntityExamples,
    [],
  )

  return useSupabaseQuery<EntityExamples>(
    serviceId ? queryKeys.serviceEntityExamples.of(serviceId) : null,
    async (client, signal) => {
      // Unreachable — the key is null without a service — but a type-level fact.
      if (!serviceId) return {}
      const { data, error } = await client
        .from('services')
        .select('entity_examples')
        .eq('id', serviceId)
        .abortSignal(signal)
        .maybeSingle()
      if (error) throw new Error(error.message)
      return (data?.entity_examples as EntityExamples | null) ?? {}
    },
    fallback,
  )
}
