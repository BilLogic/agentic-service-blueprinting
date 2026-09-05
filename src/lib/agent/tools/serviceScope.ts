import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database'
import { getActiveServiceSlug } from '@/contexts/activeServiceStore'
import { resolveServiceBySlug, type ServiceIdentity } from '@/lib/serviceSlug'
import { findActiveServiceId, resolveFirstServiceId } from '@/lib/service'
import type { AgentServiceScopeMode } from '@/lib/agent/settings'

type Client = SupabaseClient<Database>

/**
 * Which service(s) an agent read covers — the scope that replaced the old
 * global single-service cache.
 *
 * `all` means no scoping (every service, the whole deployment); `service` names
 * exactly one. A deployment with one service ALWAYS resolves to `all`, because
 * with one service every scope is the same set — see `resolveServiceScope`.
 */
export type ServiceScope =
  | { kind: 'all' }
  | { kind: 'service'; serviceId: string; serviceName: string }

/** The whole-deployment scope — a shared constant so callers read as one. */
export const SCOPE_ALL: ServiceScope = { kind: 'all' }

type ServiceRow = ServiceIdentity & { id: string; name: string; created_at?: string | null }

/**
 * Resolve which service(s) a read covers, from the tool's optional `service`
 * argument and the creator's configured default.
 *
 * The rules, in order:
 * - A deployment with **≤1 service** always resolves to `all`. With one service
 *   every scope names the same rows, so single-service behaviour is
 *   byte-for-byte today's unscoped read — and the whole join/post-filter
 *   machinery below is skipped, paying no extra query on the common case.
 * - `service: "all"` widens to every service (the deliberate cross-service read).
 * - `service: "<slug or name>"` narrows to that one service; an unknown name
 *   throws with the real ones listed, rather than silently searching everything.
 * - No `service`: the creator's default — `active` (the service the URL slug
 *   names, the one on screen) or `all`.
 */
export async function resolveServiceScope(
  client: Client,
  options: { serviceArg?: string; defaultMode: AgentServiceScopeMode },
): Promise<ServiceScope> {
  const { data, error } = await client
    .from('services')
    .select('id, name, slug, created_at')
  if (error) throw new Error(error.message)
  const services = [...((data ?? []) as ServiceRow[])].sort((a, b) =>
    (a.created_at ?? '').localeCompare(b.created_at ?? ''),
  )

  // One service (the common case): every scope is the same single set. Return
  // `all` so no read scopes, filters or joins — identical to pre-multi-service.
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

  if (options.defaultMode === 'all') return SCOPE_ALL

  // Default: the active service (the one the URL slug names), falling back to
  // the first by created_at at the bare root — the same resolution the app's
  // journey reads use, computed here over the list already in hand.
  const slug = getActiveServiceSlug()
  const active = (slug ? resolveServiceBySlug(services, slug) : null) ?? services[0]
  return { kind: 'service', serviceId: active.id, serviceName: active.name }
}

/**
 * A throwing active-service id for the WRITE path — a phase, slice, finding or
 * piece of evidence the agent creates belongs to the service on screen, not a
 * cached "first" one. Reuses `findActiveServiceId` and falls back to the first
 * service when no slug resolves.
 */
export async function resolveActiveServiceId(client: Client): Promise<string> {
  return (await findActiveServiceId(client)) ?? (await resolveFirstServiceId(client))
}

/**
 * The (lowercased) phase names in a service's journey.
 *
 * A blueprint-wide search returns rows with no service column of their own. The
 * journey is a HARD per-service boundary, so a service's rows are exactly those
 * under its phases, and a search that reports each row's phase name as its
 * breadcrumb can be post-filtered by this set. Name, not id, is the only
 * per-service key such a breadcrumb surfaces — a limitation that only bites the
 * (unusual) case of two services sharing a phase name.
 */
export async function servicePhaseNames(
  client: Client,
  serviceId: string,
): Promise<Set<string>> {
  const { data, error } = await client
    .from('phases')
    .select('name')
    .eq('service_id', serviceId)
  if (error) throw new Error(error.message)
  return new Set((data ?? []).map((row) => (row.name ?? '').toLowerCase()))
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
 * membership (ADR 0003), derived by JOIN because the shared catalog carries no
 * `service_id`. A stakeholder belongs to a service exactly when one of that
 * service's lanes picks it, so this walks the journey the hard boundary defines:
 * phases → scenarios → paths → `lanes.stakeholder_id`. There is deliberately no
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
