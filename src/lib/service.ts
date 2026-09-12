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
 *
 * Deliberately takes no abort signal: the promise is shared, so one caller
 * leaving its view would cancel the lookup every other caller is awaiting.
 */
let firstServiceId: Promise<string | null> | null = null

/**
 * First service by `created_at`, or null when the database has none.
 *
 * NOT exported. Its one legitimate caller is `findActiveServiceId`'s no-slug
 * branch below — the bare root, where nothing claims a service and "first" is
 * what active MEANS. That is a different thing from the retired fallback,
 * which fired when a slug named no service and sent the write to a sibling.
 *
 * It was exported, and three write paths reached for it: a new slice, and the
 * two "new phase" resolvers. Each of them wanted the service on screen and got
 * the first one instead. Keeping it module-private is what stops the fourth —
 * a surface that wants a service id can only reach `findActiveServiceId` (a
 * read, nullable) or `resolveActiveServiceId` (a write, throwing), and both
 * honour the URL.
 */
function findFirstServiceId(client: Client): Promise<string | null> {
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
 *
 * Signal-less on purpose (see `findFirstServiceId`); wrap the wait in
 * `awaitOrAbort` so a caller leaving its view stops waiting without cancelling
 * the shared lookup.
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

/**
 * A throwing active-service id for the WRITE path — the row a person or an
 * agent creates belongs to the service on screen, not to whichever one is
 * first by `created_at`.
 *
 * This is `findActiveServiceId` with its `null` turned into the error a caller
 * can show. The `null` has two causes and they deserve different sentences:
 * an empty database, and a slug no service answers to. The second used to fall
 * back to the first service, which is the wrong-service write this exists to
 * prevent — a board that draws nothing must not quietly file the author's work
 * against a service they are not looking at.
 */
export async function resolveActiveServiceId(client: Client): Promise<string> {
  const id = await findActiveServiceId(client)
  if (id) return id
  const slug = getActiveServiceSlug()
  if (slug) throw new Error(`No service matches "${slug}" in the database`)
  throw new Error('No service exists in the database')
}

/**
 * Await a shared lookup without inheriting its uncancellability.
 *
 * `findFirstServiceId` deliberately takes no signal — the promise is shared,
 * so one caller leaving its view would cancel the lookup every other caller is
 * awaiting. That is right for the *lookup* and wrong for the *wait*: inside
 * `withSupabaseTimeout` the deadline aborts a controller the shared request
 * never sees, so the read that was supposed to be bounded sat in `loading`
 * until the network answered.
 *
 * This settles the caller's wait when the signal fires and leaves the shared
 * request running for whoever else is waiting on it.
 */
export function awaitOrAbort<T>(promise: Promise<T>, signal: AbortSignal): Promise<T> {
  if (signal.aborted) return Promise.reject(signal.reason ?? new Error('aborted'))
  return new Promise<T>((resolve, reject) => {
    const onAbort = () => reject(signal.reason ?? new Error('aborted'))
    signal.addEventListener('abort', onAbort, { once: true })
    promise.then(
      (value) => {
        signal.removeEventListener('abort', onAbort)
        resolve(value)
      },
      (error: unknown) => {
        signal.removeEventListener('abort', onAbort)
        reject(error as Error)
      },
    )
  })
}
