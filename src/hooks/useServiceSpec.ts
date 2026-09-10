import { useCallback } from 'react'
import { useSupabase } from '@/contexts/SupabaseProvider'
import { useSupabaseQuery, type QueryResult } from '@/hooks/useSupabaseQuery'
import { awaitOrAbort, resolveFirstServiceId } from '@/lib/service'
import type { EntityExamples } from '@/lib/panelTerms'

// Re-exported from its canonical home in `panelTerms`, beside the kinds it is
// keyed by, so a caller that already reads the service spec need not learn a
// second import path for the shape it carries.
export type { EntityExamples }

export type ServiceSpec = {
  id: string
  name: string
  summary: string
  /**
   * How the service is funded, priced and delivered.
   *
   * Restricted: `business_models` is readable by `authenticated` only. A
   * signed-out reader gets `businessModelVisible: false` and five empty
   * strings, and the panel leaves the section out entirely rather than showing
   * five blanks that look like an unauthored service.
   */
  businessModelVisible: boolean
  funding: string
  pricing: string
  deliveryCost: string
  revenueModel: string
  partners: string
  /** The six per-kind examples, `{}` until a deployer authors any. */
  entityExamples: EntityExamples
  /** What the panel says under the title: how much board there is. */
  phaseCount: number
  scenarioCount: number
}

/**
 * The service, and its business model.
 *
 * Three round-trips rather than one. The counts cannot be taken from the same
 * row, so this panel paints its placeholder like the other three — and the
 * business model has to be its OWN request rather than an embed, because it is
 * the one restricted table in the set.
 *
 * The migration that hardened the derived layer's grants revoked
 * `business_models` from `anon`, and its select policy names `authenticated`.
 * Embedded in the `services` select, a signed-out reader's request is refused
 * WHOLE — PostgREST returns 42501 for the join, not a null column — so the
 * panel showed "permission denied for table business_models" and lost the
 * summary and the examples, which anon may read perfectly well. Split out,
 * the refusal costs exactly the thing that was restricted:
 * `businessModelVisible` goes false and the rest still renders.
 *
 * Split out AND asked only when the reader may have it. `canReadPrivate` is
 * the provider's answer to "would the database let this client read a table
 * outside the public surface". Sent regardless, the request is refused for
 * every signed-out visitor on every load, and the hook has to treat a 42501 as
 * ordinary to stay harmless — which means a genuine outage on that table looks
 * exactly like the signed-out case and nothing says so.
 *
 * The key carries the answer for the same reason. `staleTime` is infinite, so
 * one key would serve an author the result their signed-out first paint cached
 * and the business model would stay missing until a mutation or a reload. Both
 * keys begin `service-spec:first`, which is the prefix `ServicePanel`
 * invalidates.
 */
export function useServiceSpec(): QueryResult<ServiceSpec | null> {
  const { canReadPrivate } = useSupabase()
  const fallback = useCallback(() => null, [])

  return useSupabaseQuery<ServiceSpec | null>(
    canReadPrivate ? 'service-spec:first:private' : 'service-spec:first',
    async (client, signal) => {
      // The same first-service lookup every other read uses — the settled id
      // is cached module-level, so the panel does not add a `services` query
      // of its own to the ones the canvas already made.
      const serviceId = await awaitOrAbort(resolveFirstServiceId(client), signal)

      const { data: service, error } = await client
        .from('services')
        .select('id, name, summary, entity_examples')
        .eq('id', serviceId)
        .abortSignal(signal)
        .maybeSingle()
      if (error) throw new Error(error.message)
      if (!service) return null

      // Its own request, and only when it can succeed. A reader who may not
      // have this table never sends it, so `businessModelVisible` goes false
      // without a refusal to interpret. A refusal that DOES arrive is still
      // tolerated — the grant can change under a live session — but it is no
      // longer the every-load case, so it is worth reading in a log.
      const { data: modelRow } = canReadPrivate
        ? await client
            .from('business_models')
            .select('funding, pricing, delivery_cost, revenue_model, partners')
            .eq('service_id', service.id)
            .abortSignal(signal)
            .maybeSingle()
        : { data: null }
      const model = modelRow as
        | {
            funding: string | null
            pricing: string | null
            delivery_cost: string | null
            revenue_model: string | null
            partners: string | null
          }
        | null
        | undefined

      const { data: phases, error: phaseError } = await client
        .from('phases')
        .select('id, scenarios(id)')
        .eq('service_id', service.id)
        .abortSignal(signal)
      if (phaseError) throw new Error(phaseError.message)

      const rows = phases ?? []
      return {
        id: service.id as string,
        name: service.name as string,
        summary: (service.summary as string | null) ?? '',
        businessModelVisible: Boolean(model),
        funding: model?.funding ?? '',
        pricing: model?.pricing ?? '',
        deliveryCost: model?.delivery_cost ?? '',
        revenueModel: model?.revenue_model ?? '',
        partners: model?.partners ?? '',
        // A jsonb object the app owns the shape of; `{}` when nothing is
        // authored, and never null (the column defaults to `{}`).
        entityExamples: (service.entity_examples as EntityExamples | null) ?? {},
        phaseCount: rows.length,
        scenarioCount: rows.reduce(
          (total, row) =>
            total + ((row.scenarios as unknown[] | null)?.length ?? 0),
          0,
        ),
      }
    },
    fallback,
  )
}
