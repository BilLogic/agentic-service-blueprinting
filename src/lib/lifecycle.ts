import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database'

type Client = SupabaseClient<Database>

/**
 * Shared first-lifecycle lookup — the settled result is cached module-level
 * and concurrent callers share one in-flight query, so the `useSlices` /
 * `useLifecyclePhases` / evidence-insert chains do not each hit
 * `service_lifecycles`. Errors are not cached; the next caller retries.
 */
let firstLifecycleId: Promise<string | null> | null = null

/** First lifecycle by `created_at`, or null when the database has none. */
export function findFirstLifecycleId(client: Client): Promise<string | null> {
  if (!firstLifecycleId) {
    firstLifecycleId = (async () => {
      const { data, error } = await client
        .from('service_lifecycles')
        .select('id')
        .order('created_at', { ascending: true })
        .limit(1)
      if (error) throw new Error(error.message)
      return data?.[0]?.id ?? null
    })().catch((error: unknown) => {
      firstLifecycleId = null
      throw error
    })
  }
  return firstLifecycleId
}

/** First lifecycle by `created_at`; throws when the database has none. */
export async function resolveFirstLifecycleId(client: Client): Promise<string> {
  const id = await findFirstLifecycleId(client)
  if (!id) throw new Error('No service lifecycle exists in the database')
  return id
}
