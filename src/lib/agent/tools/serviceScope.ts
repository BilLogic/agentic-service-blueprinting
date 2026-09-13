import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database'
import { resolveServiceBySlug, type ServiceIdentity } from '@/lib/serviceSlug'
import type { ActiveServiceRef } from '@/contexts/activeService'

type Client = SupabaseClient<Database>

/**
 * Which service(s) an agent call covers — the scope a session is handed in
 * `ctx.scope`, and what a read's optional `service` argument moves.
 *
 * `service` names exactly one — the active service, the one the board draws,
 * is the DEFAULT, the same default the interface has; `all` is every service
 * in the deployment, and only a call that asks for it gets it — see
 * `resolveServiceScope`. A write that creates under the service lands on the
 * `service` scope's id and refuses `all`.
 */
export type ServiceScope =
  | { kind: 'all' }
  | { kind: 'service'; serviceId: string; serviceName: string }

/** The whole-deployment scope — a shared constant so callers read as one. */
export const SCOPE_ALL: ServiceScope = { kind: 'all' }

/**
 * The scope a session runs under: the resolved active service, or `null`
 * when none is active — a slug no service carries, a bare script. Not the
 * whole deployment: that is a scope a call asks for by name, never one it
 * falls into.
 */
export function scopeOf(active: ActiveServiceRef | null): ServiceScope | null {
  return active ? { kind: 'service', serviceId: active.id, serviceName: active.name } : null
}

type ServiceRow = ServiceIdentity & { id: string; name: string; created_at?: string | null }

/**
 * Resolve which service(s) a read covers, from the tool's optional `service`
 * argument and the scope the session was handed.
 *
 * The rules, in order:
 * - One service in the deployment: `all`, whatever was asked — every scope is
 *   the same set, and the shared catalog is shown whole rather than narrowed
 *   by a join to the actors that service's lanes happen to pick.
 * - `service: "all"` widens to every service (the deliberate cross-service read).
 * - `service: "<slug or name>"` narrows to that one service; an unknown name
 *   throws with the real ones listed, rather than silently searching everything.
 * - No `service`: **the session's scope** — the active service, the one the
 *   board draws, which is the interface's default too. A question that names
 *   no service is about the service on screen; a reader who wants the whole
 *   deployment says "all". The URL scopes the canvas AND the agent's reach.
 *   With no service active there is nothing to default to, and the call is
 *   refused with the sentence that says so.
 */
export async function resolveServiceScope(
  client: Client,
  options: { serviceArg?: string; active?: ServiceScope | null } = {},
): Promise<ServiceScope> {
  const { data, error } = await client
    .from('services')
    .select('id, name, slug, created_at')
  if (error) throw new Error(error.message)
  const services = [...((data ?? []) as ServiceRow[])].sort((a, b) =>
    (a.created_at ?? '').localeCompare(b.created_at ?? ''),
  )

  // One service: every scope is the same set, so the machinery is skipped —
  // and the shared catalog stays whole, where a `service` scope would pay a
  // join per read to narrow it to the actors that service's lanes pick,
  // hiding catalog rows no lane uses yet.
  if (services.length <= 1) return SCOPE_ALL

  const arg = options.serviceArg?.trim()
  if (arg && arg.toLowerCase() === 'all') return SCOPE_ALL
  if (arg) {
    const match =
      resolveServiceBySlug(services, arg) ??
      services.find((service) => service.name.toLowerCase() === arg.toLowerCase()) ??
      null
    if (!match) {
      throw new Error(
        `No service named "${arg}". This deployment has: ${services
          .map((service) => service.name)
          .join(', ')}. Pass service:"all" to search across every service.`,
      )
    }
    return { kind: 'service', serviceId: match.id, serviceName: match.name }
  }

  if (options.active) return options.active
  throw new Error(
    'No service is active — name one, or pass service:"all" for the whole deployment.',
  )
}

async function selectIds(
  query: PromiseLike<{ data: Array<{ id: string }> | null; error: { message: string } | null }>,
): Promise<string[]> {
  const { data, error } = await query
  if (error) throw new Error(error.message)
  return (data ?? []).map((row) => row.id)
}

/**
 * The stakeholder ids a service's journey references — the catalog's IMPLICIT
 * membership under the decision that a service owns its journey and shares the
 * catalog, derived by JOIN because the shared catalog carries no `service_id`.
 * A stakeholder belongs to a service exactly when one of that service's lanes
 * picks it, so this walks the journey the hard boundary defines: phases →
 * scenarios → paths → `lanes.stakeholder_id`. There is deliberately no
 * `stakeholders.service_id` to filter on — the catalog is the deployment's.
 */
export async function serviceStakeholderIds(
  client: Client,
  serviceId: string,
): Promise<Set<string>> {
  const phaseIds = await selectIds(
    client.from('phases').select('id').eq('service_id', serviceId),
  )
  if (phaseIds.length === 0) return new Set()
  const scenarioIds = await selectIds(
    client.from('scenarios').select('id').in('phase_id', phaseIds),
  )
  if (scenarioIds.length === 0) return new Set()
  const pathIds = await selectIds(
    client.from('paths').select('id').in('scenario_id', scenarioIds),
  )
  if (pathIds.length === 0) return new Set()
  const { data, error } = await client
    .from('lanes')
    .select('stakeholder_id')
    .in('path_id', pathIds)
    .not('stakeholder_id', 'is', null)
  if (error) throw new Error(error.message)
  return new Set(
    (data ?? [])
      .map((row) => row.stakeholder_id)
      .filter((id): id is string => typeof id === 'string'),
  )
}
