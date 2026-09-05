import { useCallback } from 'react'
import { useSupabaseQuery, type QueryResult } from '@/hooks/useSupabaseQuery'
import { resolveFirstServiceId } from '@/lib/service'
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
 * `business_models` is revoked from `anon` (20260730090000) and its select
 * policy names `authenticated`. Embedded in the `services` select, a signed-out
 * reader's request is refused WHOLE — PostgREST returns 42501 for the join, not
 * a null column — so the panel showed "permission denied for table
 * business_models" and lost the summary and the examples, which anon may read
 * perfectly well. Split out, the refusal costs exactly the thing that was
 * restricted: `businessModelVisible` goes false and the rest still renders.
 */
export function useServiceSpec(): QueryResult<ServiceSpec | null> {
  const fallback = useCallback(() => null, [])

  return useSupabaseQuery<ServiceSpec | null>(
    // The key stays constant: a deployment maps one service, and `ServicePanel`
    // invalidates this literal key.
    'service-spec:first',
    async (client) => {
      // The same first-service lookup every other read uses — the settled id
      // is cached module-level, so the panel does not add a `services` query
      // of its own to the ones the canvas already made.
      const serviceId = await resolveFirstServiceId(client)

      const { data: service, error } = await client
        .from('services')
        .select('id, name, summary, entity_examples')
        .eq('id', serviceId)
        .maybeSingle()
      if (error) throw new Error(error.message)
      if (!service) return null

      // Its own request, and its own failure. A refusal here is the ordinary
      // signed-out case rather than an error worth surfacing — the row exists,
      // this reader may not see it — so it resolves to null and the panel
      // renders everything else. A genuine outage takes the same branch, which
      // is the right trade: an author who cannot read the model also cannot
      // write it, and the save is what tells them so.
      const { data: modelRow } = await client
        .from('business_models')
        .select('funding, pricing, delivery_cost, revenue_model, partners')
        .eq('service_id', service.id)
        .maybeSingle()
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
