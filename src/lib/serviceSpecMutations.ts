import { ENTITY_KIND_ORDER, type EntityExamples } from '@/lib/panelTerms'
import { specWriter, type SpecLevel } from '@/lib/specWrite'
import { invalidateQueries } from '@/lib/queryClient'
import { queryKeys } from '@/lib/queryKeys'

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
 * Everything on the service panel refetches the same pair: the service's own
 * spec, and the examples in the row beside it.
 */
const invalidateServicePanel = () => {
  invalidateQueries(queryKeys.serviceSpec.prefix)
  invalidateQueries(queryKeys.serviceEntityExamples.prefix)
}

/**
 * The service's own sentence.
 *
 * `name` is not writable from here for the same reason a scenario's is not:
 * renaming the root is structure, and structure goes through an RPC.
 */
const SERVICE_SUMMARY: SpecLevel<string, string> = {
  table: 'services',
  addressedBy: 'id',
  subject: 'service',
  columns: (summary) => ({ summary: summary.trim() || null }),
  invalidate: invalidateServicePanel,
  fn: 'update_service_summary',
  targetArg: 'service_id',
  previousAs: 'summary',
}

/** Write the service's summary. */
export const updateServiceSummary = specWriter(SERVICE_SUMMARY)

/**
 * How the service is funded, priced and delivered.
 *
 * Five columns on one row, written together: they are one answer, and a
 * partial save would leave the panel describing a business model nobody
 * chose. The row is guaranteed to exist — the migration that renamed this
 * table also seeded it — so this is always an update, never an upsert, and it
 * is the one level addressed by a column that is not `id`.
 */
const BUSINESS_MODEL: SpecLevel<string, BusinessModelUpdate> = {
  table: 'business_models',
  addressedBy: 'service_id',
  subject: 'business model',
  columns: (update) => ({
    funding: update.funding.trim() || null,
    pricing: update.pricing.trim() || null,
    delivery_cost: update.deliveryCost.trim() || null,
    revenue_model: update.revenueModel.trim() || null,
    partners: update.partners.trim() || null,
  }),
  invalidate: invalidateServicePanel,
  fn: 'update_business_model',
  targetArg: 'service_id',
  previousAs: 'update',
}

/** Write the service's business model. */
export const updateBusinessModel = specWriter(BUSINESS_MODEL)

/**
 * The six per-kind examples, written together as one jsonb object.
 *
 * One column, one write, like the summary above it: the set is a single value
 * the app owns the shape of, so a partial save has no meaning — the panel
 * authors all six in one section and Save carries them as one map.
 * `entity_examples` is `not null default '{}'`, so this always REPLACES the
 * whole object rather than merging; the normaliser is what decides which keys
 * survive, and an emptied input drops its key.
 */
const ENTITY_EXAMPLES: SpecLevel<string, EntityExamplesUpdate> = {
  table: 'services',
  addressedBy: 'id',
  subject: 'service',
  columns: (update) => ({ entity_examples: normalizeEntityExamples(update) }),
  invalidate: invalidateServicePanel,
  fn: 'update_service_entity_examples',
  targetArg: 'service_id',
  previousAs: 'update',
}

/** Write the service's per-kind examples. */
export const updateServiceEntityExamples = specWriter(ENTITY_EXAMPLES)
