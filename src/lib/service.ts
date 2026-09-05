import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database'
import { getActiveServiceSlug } from '@/contexts/activeServiceStore'
import { resolveServiceBySlug } from '@/lib/serviceSlug'

type Client = SupabaseClient<Database>

/**
 * Shared first-service lookup — the settled result is cached module-level
 * and concurrent callers share one in-flight query, so the `useSlices` /
 * `useServicePhases` / evidence-insert chains do not each hit
 * `services`. Errors are not cached; the next caller retries.
 */
let firstServiceId: Promise<string | null> | null = null

/** First service by `created_at`, or null when the database has none. */
export function findFirstServiceId(client: Client): Promise<string | null> {
  if (!firstServiceId) {
    firstServiceId = (async () => {
      const { data, error } = await client
        .from('services')
        .select('id')
        .order('created_at', { ascending: true })
        .limit(1)
      if (error) throw new Error(error.message)
      return data?.[0]?.id ?? null
    })().catch((error: unknown) => {
      firstServiceId = null
      throw error
    })
  }
  return firstServiceId
}

/** First service by `created_at`; throws when the database has none. */
export async function resolveFirstServiceId(client: Client): Promise<string> {
  const id = await findFirstServiceId(client)
  if (!id) throw new Error('No service service exists in the database')
  return id
}

/**
 * The active service's id — one lookup per slug, shared in flight.
 *
 * Errors are not cached; the next caller retries. Deliberately signal-less for
 * the same reason as `findFirstServiceId`. Reset only exists for tests.
 */
const activeServiceIdBySlug = new Map<string, Promise<string | null>>()

/** Evict one slug's cached lookup so the next caller retries. */
function forgetActiveServiceId(slug: string): void {
  activeServiceIdBySlug.delete(slug)
}

/** Test-only: clear the per-slug cache between cases. */
export function __resetActiveServiceIdCache(): void {
  activeServiceIdBySlug.clear()
}

/**
 * The id of the service the app is looking at, honoring the slug in the URL.
 *
 * With no slug — the bare-root, single-service case — this is exactly
 * `findFirstServiceId`, so single-service resolution is byte-for-byte today's.
 * When a slug names a service, its id is resolved by matching the service's
 * `slug` column (with a name-derived fallback for a null column — see
 * `serviceSlug`), cached per slug and sharing one in-flight query.
 */
export function findActiveServiceId(client: Client): Promise<string | null> {
  const slug = getActiveServiceSlug()
  if (!slug) return findFirstServiceId(client)

  let pending = activeServiceIdBySlug.get(slug)
  if (!pending) {
    pending = (async () => {
      const { data, error } = await client.from('services').select('id, name, slug')
      if (error) throw new Error(error.message)
      return resolveServiceBySlug(data ?? [], slug)?.id ?? null
    })().catch((error: unknown) => {
      forgetActiveServiceId(slug)
      throw error
    })
    activeServiceIdBySlug.set(slug, pending)
  }
  return pending
}
