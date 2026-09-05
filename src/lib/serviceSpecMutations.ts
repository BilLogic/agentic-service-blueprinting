import type { SupabaseClient } from '@supabase/supabase-js'
import { recordChange } from '@/lib/authoringSession'
import { toAuthoringError } from '@/lib/authoringErrors'
import { requireRowsWritten } from '@/lib/optimisticConcurrency'
import { ENTITY_KIND_ORDER, type EntityExamples } from '@/lib/panelTerms'
import type { Database } from '@/types/database'

type Client = SupabaseClient<Database>

export type ServiceSummaryUpdate = { summary: string }

/**
 * The six example inputs as the panel holds them — one string per kind, blanks
 * included. The write normalises this into the stored map; the form does not.
 */
export type EntityExamplesUpdate = EntityExamples

/**
 * The map the column stores: trimmed, and with the blanks dropped.
 *
 * An emptied input CLEARS its key rather than storing a blank string, the same
 * rule `normalizePlacementDetail` follows and for the same reason — the read
 * treats an absent key and a written one differently (a blank renders nothing;
 * an absent key is simply not there), and an empty string is neither. Only the
 * six known kinds survive, in their canonical order, so a stray key a caller
 * never meant to write cannot ride into the jsonb.
 */
export function normalizeEntityExamples(
  update: EntityExamplesUpdate,
): EntityExamples {
  const examples: EntityExamples = {}
  for (const kind of ENTITY_KIND_ORDER) {
    const trimmed = update[kind]?.trim()
    if (trimmed) examples[kind] = trimmed
  }
  return examples
}

export type BusinessModelUpdate = {
  funding: string
  pricing: string
  deliveryCost: string
  revenueModel: string
  partners: string
}

/**
 * The service's own sentence.
 *
 * `name` is not writable from here for the same reason a scenario's is not:
 * renaming the root is structure, and structure goes through an RPC.
 */
export async function updateServiceSummary(
  client: Client,
  serviceId: string,
  summary: string,
  previous?: string,
  options: { record?: boolean } = {},
): Promise<void> {
  const { data, error } = await client
    .from('services')
    .update({ summary: summary.trim() || null })
    .eq('id', serviceId)
    .select('id')
  if (error) throw toAuthoringError(error)
  requireRowsWritten(data, 'service')

  if (options.record !== false) {
    recordChange(
      'update_service_summary',
      { service_id: serviceId },
      previous === undefined
        ? undefined
        : {
            fn: 'update_service_summary',
            args: { service_id: serviceId, summary: previous },
          },
    )
  }
}

/**
 * How the service is funded, priced and delivered.
 *
 * Five columns on one row, written together: they are one answer, and a
 * partial save would leave the panel describing a business model nobody
 * chose. The row is guaranteed to exist — the migration that renamed this
 * table also seeded it — so this is always an update, never an upsert.
 */
export async function updateBusinessModel(
  client: Client,
  serviceId: string,
  update: BusinessModelUpdate,
  previous?: BusinessModelUpdate,
  options: { record?: boolean } = {},
): Promise<void> {
  const { data, error } = await client
    .from('business_models')
    .update({
      funding: update.funding.trim() || null,
      pricing: update.pricing.trim() || null,
      delivery_cost: update.deliveryCost.trim() || null,
      revenue_model: update.revenueModel.trim() || null,
      partners: update.partners.trim() || null,
    })
    .eq('service_id', serviceId)
    .select('service_id')
  if (error) throw toAuthoringError(error)
  requireRowsWritten(data, 'business model')

  if (options.record !== false) {
    recordChange(
      'update_business_model',
      { service_id: serviceId },
      previous === undefined
        ? undefined
        : {
            // Nested under `update`, like update_cell_content and
            // update_lane_spec — executeRevert hands this straight back to
            // this function, so the payload must be the shape the parameter
            // takes. Spreading the camelCase fields flat produced args no
            // caller on either side could consume.
            fn: 'update_business_model',
            args: { service_id: serviceId, update: previous },
          },
    )
  }
}

/**
 * The six per-kind examples, written together as one jsonb object (#302).
 *
 * One column, one write, like `updateServiceSummary` beside it: the set is a
 * single value the app owns the shape of, so a partial save has no meaning —
 * the panel authors all six in one section and Save carries them as one map.
 * `entity_examples` is `not null default '{}'`, so this always REPLACES the
 * whole object rather than merging; the normaliser is what decides which keys
 * survive, and an emptied input drops its key.
 *
 * Self-inverse on the undo ledger, like `update_service_summary`: both are
 * direct table updates rather than RPCs, so `executeRevert` hands the previous
 * map straight back here (record off) rather than calling a Postgres function
 * that does not exist. The inverse is nested under `update`, the shape this
 * parameter takes.
 */
export async function updateServiceEntityExamples(
  client: Client,
  serviceId: string,
  update: EntityExamplesUpdate,
  previous?: EntityExamplesUpdate,
  options: { record?: boolean } = {},
): Promise<void> {
  const { data, error } = await client
    .from('services')
    .update({ entity_examples: normalizeEntityExamples(update) })
    .eq('id', serviceId)
    .select('id')
  if (error) throw toAuthoringError(error)
  requireRowsWritten(data, 'service')

  if (options.record !== false) {
    recordChange(
      'update_service_entity_examples',
      { service_id: serviceId },
      previous === undefined
        ? undefined
        : {
            fn: 'update_service_entity_examples',
            args: { service_id: serviceId, update: previous },
          },
    )
  }
}
