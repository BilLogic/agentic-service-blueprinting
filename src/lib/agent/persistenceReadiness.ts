import { useSyncExternalStore } from 'react'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database'

type Client = SupabaseClient<Database>

/**
 * CAN WE READ YET, AND TELL ME WHEN.
 *
 * One answer, in one place, for the question every persisted read has to ask
 * before it asks anything else. The client that carries agent rows is
 * attached by the panel from an effect; a chat already on screen when the page
 * reloads runs ITS effect first, because child effects run before the parent's.
 * So the first hydrate of the tab arrives before there is anything to read
 * from — and a hydrate that answers "nothing persisted" to that is the
 * reopened session that comes back a skeleton, permanently, because the read
 * is once per session per page load and it has been spent.
 *
 * The fix is not for each caller to test a flag and invent its own retry: that
 * is the same race written out once per caller, and the one that forgets is
 * the one that loses a transcript. Work is handed HERE instead, against a key,
 * and this module decides whether it runs now or on the attach signal. Parked
 * work runs once, in the order it was parked, and never twice — a key that has
 * been claimed stays claimed until it is explicitly forgotten.
 *
 * A deployment with no database never attaches anything, and that is a
 * supported posture rather than a failure: the work simply never runs, the
 * pending answer below stays true, and callers that gate on their own "a
 * database is possible" fact keep reading from localStorage exactly as they
 * always have.
 */

let attached: Client | null = null

/**
 * The parked work, insertion-ordered because a `Map` is and because order is
 * the part a caller can observe: two sessions parked in sequence hydrate in
 * that sequence, not in whatever order a `Set` of promises happens to settle.
 */
const parked = new Map<string, () => void | Promise<void>>()

/** Keys whose work has been claimed — started, and so never started again. */
const claimed = new Set<string>()

/** Keys whose work has finished, however it finished. */
const settled = new Set<string>()

const pendingListeners = new Set<() => void>()

function notifyPending() {
  pendingListeners.forEach((listener) => listener())
}

/**
 * Attach (or detach) the client the persisted agent reads and writes ride.
 *
 * Detaching does not forget what has already run: a tab that loses its client
 * has not un-read the transcript it read, and re-attaching must not replay a
 * hydrate over a live conversation.
 */
export function attachAgentPersistence(client: Client | null): void {
  const cameOnline = attached === null && client !== null
  attached = client
  if (!cameOnline) return
  const waiting = [...parked.entries()]
  parked.clear()
  waiting.forEach(([key, work]) => run(key, work))
}

/**
 * The attached client, for the module that spells out the reads and writes.
 * `null` is the everyday answer on a deployment with no database, and every
 * caller of it is expected to degrade rather than throw.
 */
export function attachedAgentClient(): Client | null {
  return attached
}

function run(key: string, work: () => void | Promise<void>): void {
  claimed.add(key)
  notifyPending()
  let finished: void | Promise<void>
  try {
    finished = work()
  } catch {
    finished = undefined
  }
  void Promise.resolve(finished)
    .catch(() => undefined)
    .then(() => {
      settled.add(key)
      notifyPending()
    })
}

/**
 * Run `work` once persistence can be read — immediately if a client is already
 * attached, on the attach signal otherwise.
 *
 * Keyed, and once per key: the caller is free to ask again on every render or
 * every reopen without spending the one read it gets. `forgetAgentPersistenceWork`
 * is the only way back.
 */
export function whenAgentPersistenceReady(
  key: string,
  work: () => void | Promise<void>,
): void {
  if (claimed.has(key) || parked.has(key)) return
  if (!attached) {
    parked.set(key, work)
    notifyPending()
    return
  }
  run(key, work)
}

/**
 * Whether this key's work is still outstanding — parked, in flight, or never
 * asked for at all.
 *
 * Never-asked-for reads as pending on purpose. The window a surface has to
 * cover is the one BEFORE its own effect has run, where the panel is mounted
 * and the read has not been requested yet; an answer of "done" there is the
 * empty state flashing in place of a conversation that is about to arrive.
 * Callers gate this on their own "a database is possible" fact, or a signed-out
 * panel waits forever.
 */
export function agentPersistenceWorkPending(key: string): boolean {
  return !settled.has(key)
}

export function useAgentPersistenceWorkPending(key: string): boolean {
  return useSyncExternalStore(
    (listener) => {
      pendingListeners.add(listener)
      return () => pendingListeners.delete(listener)
    },
    () => agentPersistenceWorkPending(key),
    () => false,
  )
}

/**
 * Forget a key entirely, parked work included, so the next ask runs again.
 *
 * This is the seam that lets a test prove a read rather than a memory: drop
 * what the tab already knows, and the next open is where another browser
 * starts from.
 */
export function forgetAgentPersistenceWork(key: string): void {
  parked.delete(key)
  claimed.delete(key)
  settled.delete(key)
  notifyPending()
}
