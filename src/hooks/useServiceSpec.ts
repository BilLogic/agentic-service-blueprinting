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
  /** How the service is funded, priced and delivered. One row, always present. */
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
 * Two round-trips rather than one — the counts cannot be taken from the same
 * row — so this panel paints its placeholder like the other three.
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
        .select(
          'id, name, summary, entity_examples, business_models(funding, pricing, delivery_cost, revenue_model, partners)',
        )
        .eq('id', serviceId)
        .maybeSingle()
      if (error) throw new Error(error.message)
      if (!service) return null

      const model = (Array.isArray(service.business_models)
        ? service.business_models[0]
        : service.business_models) as
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
