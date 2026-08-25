import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database'

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
