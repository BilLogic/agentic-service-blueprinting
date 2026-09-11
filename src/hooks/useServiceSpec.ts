import { useCallback } from 'react'
import { useSupabase } from '@/contexts/SupabaseProvider'
import { useSupabaseQuery, type QueryResult } from '@/hooks/useSupabaseQuery'
import { awaitOrAbort, findActiveServiceId } from '@/lib/service'
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
 * The ACTIVE service, and its business model.
 *
 * Active is the board's word: the service the URL slug names, or the first by
 * `created_at` at the bare root. It is resolved through `findActiveServiceId`,
 * the lookup the board's own reads make, because this read used to take the
 * first row unconditionally — and with a second service in the database the
 * header described one service while the canvas drew another. One resolver is
 * what makes them agree. Its settled id is cached and shared in flight, so the
 * lookup adds no `services` query to the ones the canvas already made.
 *
 * Then one round-trip, not three in a row. The service row, its counts and its
 * business model each need only the id and none needs another, so they go out
 * together. The counts cannot be taken from the same row, so this panel paints
 * its placeholder like the other three — and the business model has to be its
 * OWN request rather than an embed, because it is the one restricted table in
 * the set.
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
 *
 * And there is no key at all until the session is known. `canReadPrivate` is
 * false while the session is still loading, so a read keyed then is the
 * anonymous one, and an author paid for it and then for the signed-in one.
 * `getSession()` resolves from storage; the wait is not a network wait.
 */
export function useServiceSpec(): QueryResult<ServiceSpec | null> {
  const { canReadPrivate, isLoading: sessionLoading } = useSupabase()
  const fallback = useCallback(() => null, [])

  return useSupabaseQuery<ServiceSpec | null>(
    sessionLoading
      ? null
      : canReadPrivate
        ? 'service-spec:first:private'
        : 'service-spec:first',
    async (client, signal) => {
      const serviceId = await awaitOrAbort(findActiveServiceId(client), signal)
      if (!serviceId) return null

      const [serviceResponse, phaseResponse, modelResponse] = await Promise.all([
        client
          .from('services')
          .select('id, name, summary, entity_examples')
          .eq('id', serviceId)
          .abortSignal(signal)
          .maybeSingle(),
        client
          .from('phases')
          .select('id, scenarios(id)')
          .eq('service_id', serviceId)
          .abortSignal(signal),
        // Its own request, and only when it can succeed. A reader who may not
        // have this table never sends it, so `businessModelVisible` goes false
        // without a refusal to interpret. A refusal that DOES arrive is still
        // tolerated — the grant can change under a live session — but it is
        // no longer the every-load case, so it is worth reading in a log.
        canReadPrivate
          ? client
              .from('business_models')
              .select('funding, pricing, delivery_cost, revenue_model, partners')
              .eq('service_id', serviceId)
              .abortSignal(signal)
              .maybeSingle()
          : null,
      ])

      if (serviceResponse.error) throw new Error(serviceResponse.error.message)
      const service = serviceResponse.data
      if (!service) return null
      if (phaseResponse.error) throw new Error(phaseResponse.error.message)

      const model = modelResponse?.data ?? null
      const rows = phaseResponse.data ?? []
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
