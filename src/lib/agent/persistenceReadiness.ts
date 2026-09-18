import { useCallback, useSyncExternalStore } from 'react'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database'

type Client = SupabaseClient<Database>

/**
 * CAN WE READ YET, TELL ME WHEN, AND HERE IS THE READ.
 *
 * One answer, in one place, for the question every persisted agent read has
 * to ask before it asks anything else. The client that carries agent rows is
 * attached by the panel from an effect; a chat already on screen when the page
 * reloads runs ITS effect first, because child effects run before the parent's.
 * So the first hydrate of the tab arrives before there is anything to read
 * from — and a hydrate that answers "nothing persisted" to that is the
 * reopened session that comes back a skeleton, permanently, because the read
 * is once per session per page load and it has been spent.
 *
 * The fix is not for each caller to test a flag and invent its own retry: that
 * is the same race written out once per caller, and the one that forgets is
 * the one that loses a transcript. Work is handed HERE instead, against a
 * handle, and this module decides whether it runs now or on the attach signal.
 * Parked work runs once, in the order it was parked, and never twice — a
 * handle that has been claimed stays claimed until it is explicitly forgotten.
 *
 * A caller that can already reach the client has no reason to ask the
 * question, so the client does not leave this module: `throughAgentPersistence`
 * is the only way to a query, and it carries the detached case itself. Two
 * ways to find out whether persistence is readable — park-and-wait here, a
 * raw client handed out over there — is how a second, contradictory answer
 * gets written.
 *
 * This is a module store because the answer has to survive a mount point
 * changing. The chat has two postures — docked in the sidebar, floating over
 * the canvas — rendered from two places, and a drag unmounts one panel and
 * mounts the other mid-gesture. Held in component state, which handle had
 * been claimed and which had settled would die in that gap: the conversation
 * would re-ask a read it has already spent and render its skeleton again on
 * the far side of the drag. Bare functions with no hooks available do park
 * work here — the loop, the persistence writer — but the outstanding answer
 * itself is only ever read through the hook below, so that is not the
 * condition this store is here for.
 *
 * A deployment with no database never attaches anything, and that is a
 * supported posture rather than a failure: the work simply never runs, the
 * pending answer below stays true, and callers gate that on their own
 * identity and tier so a signed-out panel does not wait forever.
 */

/**
 * What a piece of parked work IS: a kind, and the thing of that kind it is
 * for.
 *
 * Not a bare id. Two different kinds of work can be about one session — the
 * transcript read and, one day, its attachments or its change list — and a
 * bare session id makes them the same handle, so the second one asked for is
 * silently dropped by the once-per-handle rule: it never runs, and the
 * pending answer reads settled for a read that never happened. The kind is
 * what keeps them apart. (This is not a query key; nothing here caches a
 * read.)
 */
export type AgentPersistenceWork = {
  kind: 'transcript' | 'session-list'
  id: string
}

/**
 * The flight a piece of work is running as — handed to the work itself, so it
 * can ask the one question an async read cannot answer for itself: is the
 * database I started against still the one behind this handle?
 *
 * WHY THE WORK HAS TO ASK RATHER THAN BE CANCELLED FROM HERE. A read already
 * on the wire cannot be recalled, and the damage is never the read — it is
 * what the work does with what it read. The session-list merge reads one
 * table and then writes two places, the list on screen and the rows the table
 * it read was missing; run to completion after an account switch, it publishes
 * the signed-out account's sessions over the sessions of the person now signed
 * in and upserts that account's rows into the new table. So the identity
 * travels with the flight and the write is the thing that is abandoned.
 *
 * It is the era rather than the client because the client does not leave this
 * module — that is the rule that keeps a second, contradictory answer to "can
 * we read yet" from being written — and because the era is already the fact
 * that means "the ask that was here has been replaced".
 */
export type AgentPersistenceFlight = {
  /** Has this handle been forgotten and re-armed since this flight started? */
  superseded: () => boolean
}

/** Work as this module runs it: a flight, and whatever the caller does with it. */
type ParkedWork = (flight: AgentPersistenceFlight) => void | Promise<void>

function handleOf(work: AgentPersistenceWork): string {
  return `${work.kind}:${work.id}`
}

let attached: Client | null = null

/**
 * The parked work, insertion-ordered because a `Map` is and because order is
 * the part a caller can observe: two sessions parked in sequence hydrate in
 * that sequence, not in whatever order a `Set` of promises happens to settle.
 *
 * UNBOUNDED ON PURPOSE. This map only grows in the one posture where nothing
 * ever attaches, and there it holds one closure over a session id per surface
 * opened in the life of the tab — a handful, and nothing that retains a row,
 * a component or a listener. A cap here would have to evict something, and
 * every entry is an ask a mounted surface is waiting on: dropping one leaves
 * that surface outstanding forever, which is a skeleton bubbling in an open
 * conversation. A bounded map that eats a live read is worse than an
 * unbounded map of closures.
 */
const parked = new Map<string, ParkedWork>()

/** Handles whose work has been claimed — started, and so never started again. */
const claimed = new Set<string>()

/** Handles whose work has finished, however it finished. */
const settled = new Set<string>()

/**
 * How many times a handle has been forgotten, so a flight from before the
 * forget can neither settle the ask that replaced it nor write.
 *
 * Forgetting re-arms a handle while its first flight may still be on the
 * wire. Without this, that first flight's completion marks the handle
 * settled, and the surface drops its skeleton for a conversation whose real
 * read has not come back yet. The same count is what a flight compares
 * itself against through `superseded` before it writes anything, which is
 * how one account's rows stop crossing into another's.
 */
const eras = new Map<string, number>()

const pendingListeners = new Map<string, Set<() => void>>()

/**
 * Per handle, not one global set: every mounted transcript subscribes to this
 * fact, and a shared set re-renders every open chat in the tab each time any
 * session's read starts or finishes.
 */
function notifyPending(handle: string) {
  pendingListeners.get(handle)?.forEach((listener) => listener())
}

function eraOf(handle: string): number {
  return eras.get(handle) ?? 0
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
  waiting.forEach(([handle, work]) => start(handle, work))
}

function start(handle: string, work: ParkedWork): void {
  claimed.add(handle)
  const era = eraOf(handle)
  // The era is captured once, here, and closed over: read at write time
  // instead, every flight would compare the current era with itself and no
  // flight would ever find itself superseded.
  const flight: AgentPersistenceFlight = {
    superseded: () => eraOf(handle) !== era,
  }
  notifyPending(handle)
  let finished: void | Promise<void>
  try {
    finished = work(flight)
  } catch {
    finished = undefined
  }
  void Promise.resolve(finished)
    .catch(() => undefined)
    .then(() => {
      if (eraOf(handle) !== era) return
      settled.add(handle)
      notifyPending(handle)
    })
}

/**
 * Run `read` once persistence can be read — immediately if a client is already
 * attached, on the attach signal otherwise.
 *
 * Once per handle: the caller is free to ask again on every render or every
 * reopen without spending the one read it gets. `forgetAgentPersistenceWork`
 * is the only way back.
 *
 * `read` is handed the flight it runs as. Work that writes anywhere after an
 * await has to consult it — see `AgentPersistenceFlight`.
 */
export function whenAgentPersistenceReady(
  work: AgentPersistenceWork,
  read: ParkedWork,
): void {
  const handle = handleOf(work)
  if (claimed.has(handle) || parked.has(handle)) return
  if (!attached) {
    parked.set(handle, read)
    notifyPending(handle)
    return
  }
  start(handle, read)
}

/**
 * Whether this work is still outstanding — parked, in flight, or never asked
 * for at all.
 *
 * Never-asked-for reads as pending on purpose. The window a surface has to
 * cover is the one BEFORE its own effect has run, where the panel is mounted
 * and the read has not been requested yet; an answer of "done" there is the
 * empty state flashing in place of a conversation that is about to arrive.
 * Callers gate this on their own identity and tier, or a signed-out panel
 * waits forever.
 */
export function useAgentPersistenceWorkPending(
  work: AgentPersistenceWork,
): boolean {
  const handle = handleOf(work)
  const subscribe = useCallback(
    (listener: () => void) => {
      const listeners = pendingListeners.get(handle) ?? new Set<() => void>()
      listeners.add(listener)
      pendingListeners.set(handle, listeners)
      return () => {
        listeners.delete(listener)
        if (listeners.size === 0) pendingListeners.delete(handle)
      }
    },
    [handle],
  )
  const pending = useCallback(() => !settled.has(handle), [handle])
  return useSyncExternalStore(subscribe, pending, () => false)
}

/**
 * Forget this work entirely, parked work included, so the next ask runs again.
 *
 * Two callers need it. A client change is a different database's answer, so
 * the ask has to be re-armed: the next client gets its own read, and a flight
 * still on the wire from the previous one cannot settle it. Bumping the era
 * is also what makes that flight abandon its writes rather than merely lose
 * its bookkeeping — a flight reads its own `superseded` before it touches a
 * store or a table, so nothing a re-armed handle's predecessor computed can
 * land. And it is the seam that lets a test prove a read rather than a
 * memory: drop what the tab already knows, and the next open is where another
 * browser starts from.
 */
export function forgetAgentPersistenceWork(work: AgentPersistenceWork): void {
  const handle = handleOf(work)
  eras.set(handle, eraOf(handle) + 1)
  parked.delete(handle)
  claimed.delete(handle)
  settled.delete(handle)
  notifyPending(handle)
}

/** What a Supabase query hands back, whether it read rows or wrote them. */
type QueryOutcome<Row> = { data: Row | null; error: unknown }

/**
 * Run `query` against the attached client and answer its rows, or `null`.
 *
 * `null` for a detached tab, `null` for a query that failed, `null` for a
 * query that came back with nothing — one answer, because no caller does
 * anything different with the three. A read hands back what a never-persisted
 * session hands back, and a write simply returns. If a caller ever does need
 * to tell "no database" from "the query errored", this is the seam that knows
 * both and the place to widen; a branch invented at a call site would be the
 * second answer this module exists to prevent.
 *
 * `query` is called INSIDE the chain so that a builder which throws on the
 * spot — a table name typed wrong, a column the generated types no longer
 * carry — rejects like any other failure instead of escaping past the caller's
 * `void` and reaching the window as an unhandled error.
 */
export function throughAgentPersistence<Row>(
  query: (client: Client) => PromiseLike<QueryOutcome<Row>>,
): Promise<Row | null> {
  const client = attached
  if (!client) return Promise.resolve(null)
  return Promise.resolve()
    .then(() => query(client))
    .then((outcome) => (outcome.error ? null : outcome.data))
    .catch(() => null)
}
