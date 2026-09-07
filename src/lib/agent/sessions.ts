import { useSyncExternalStore } from 'react'
import {
  deletePersistedSession,
  loadPersistedSessions,
  persistSession,
} from '@/lib/agent/persistence'
import { storageKey } from '@/lib/storageNamespace'

/**
 * Agent sessions. localStorage is the always-there lane; when the session
 * is authenticated (local dev), every mutation also writes through to
 * agent_sessions and `hydrateAgentSessions` merges the DB list in on boot —
 * so sessions survive reloads and browsers, and read-only visitors lose
 * nothing they ever had.
 */

export type AgentSession = {
  id: string
  title: string
  createdAt: string
  updatedAt: string
  /** Ledger entries stamped with this session — wired when tool loop lands. */
  changeCount: number
}

const STORAGE_KEY = storageKey('agent-sessions')

function read(): AgentSession[] {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? (parsed as AgentSession[]) : []
  } catch {
    return []
  }
}

let snapshot: AgentSession[] = typeof window === 'undefined' ? [] : read()
const listeners = new Set<() => void>()

function write(next: AgentSession[]) {
  snapshot = next
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
  } catch {
    // Session-only fallback is fine for a prototype store.
  }
  listeners.forEach((listener) => listener())
}

/**
 * The session list as it stands, for callers outside React — the agent's
 * `list_sessions` tool reads THIS rather than querying `agent_sessions`
 * directly, and that is a scoping decision, not a convenience one.
 *
 * It was once a security one as well. A deployment of this code ran for a
 * while with no owner column on the table and a blanket "authenticated
 * manage agent sessions" policy, and a direct query there would have handed
 * the agent every user's chat history. An owner column and per-user RLS
 * close that from the other side now — and the store read stays anyway,
 * because the two things it buys are not things a row-level gate does.
 *
 * It is NARROWER than the gate: reading the store the session switcher reads
 * means the agent sees exactly what the USER sees, and no more (localStorage
 * sessions the database never received, and no sessions from another browser
 * the user has not hydrated). And it needs no database at all, which is why
 * the tool works unchanged with none behind it — there is no query to fail.
 */
export function agentSessionsSnapshot(): AgentSession[] {
  return snapshot
}

export function useAgentSessions(): AgentSession[] {
  return useSyncExternalStore(
    (listener) => {
      listeners.add(listener)
      return () => listeners.delete(listener)
    },
    () => snapshot,
  )
}

// Hydration state, so the sessions list can show skeleton rows (the same
// loading/empty distinction the sidebar's lists make) instead of flashing
// "no sessions". Two facts, because the gap they cover differs:
// `hydrating` is the DB merge on the wire; `hydratedOnce` covers the
// window BEFORE the merge even starts (auth/client still resolving), which
// is where the "still no skeleton" report came from — the panel mounted,
// hydrate had not been called yet, and the flag read false.
let hydrating = false
let hydratedOnce = false
const hydrationListeners = new Set<() => void>()

function setHydrating(next: boolean) {
  if (hydrating === next) return
  hydrating = next
  hydrationListeners.forEach((listener) => listener())
}

/**
 * True until the first DB merge has COMPLETED — callers gate it on their
 * own "persistence is possible" fact (canAgent), else a signed-out panel
 * would show skeletons forever.
 */
export function useAgentSessionsHydrating(): boolean {
  return useSyncExternalStore(
    (listener) => {
      hydrationListeners.add(listener)
      return () => hydrationListeners.delete(listener)
    },
    () => hydrating || !hydratedOnce,
    () => false,
  )
}

export function createAgentSession(title = 'New session'): AgentSession {
  const now = new Date().toISOString()
  const session: AgentSession = {
    id: crypto.randomUUID(),
    title,
    createdAt: now,
    updatedAt: now,
    changeCount: 0,
  }
  // Newest first — the list renders in store order.
  write([session, ...snapshot])
  persistSession(session)
  return session
}

/**
 * Merge the DB's sessions in (DB wins on shared ids, local-only rows stay).
 * Called once persistence attaches; a no-op when the DB is unreachable.
 */
export async function hydrateAgentSessions(): Promise<void> {
  setHydrating(true)
  try {
    const persisted = await loadPersistedSessions()
    if (!persisted) return
    const byId = new Map(persisted.map((session) => [session.id, session]))
    const localOnly = snapshot.filter((session) => !byId.has(session.id))
    // Local-only sessions predate persistence — push them up so the merge
    // converges instead of forking per browser.
    localOnly.forEach(persistSession)
    const merged = [...persisted, ...localOnly].sort((a, b) =>
      b.createdAt.localeCompare(a.createdAt),
    )
    write(merged)
  } finally {
    hydratedOnce = true
    setHydrating(false)
  }
}

/**
 * Derive a title from the first message, but only while the session still
 * wears the default name — a deliberate rename is never overwritten.
 */
export function autoNameSession(id: string, firstMessage: string) {
  const session = snapshot.find((entry) => entry.id === id)
  if (!session || session.title !== 'New session') return
  const condensed = firstMessage.replace(/\s+/g, ' ').trim()
  if (!condensed) return
  const title =
    condensed.length > 44 ? `${condensed.slice(0, 43).trimEnd()}…` : condensed
  renameAgentSession(id, title)
}

export function renameAgentSession(id: string, title: string) {
  write(
    snapshot.map((session) =>
      session.id === id
        ? { ...session, title, updatedAt: new Date().toISOString() }
        : session,
    ),
  )
  const renamed = snapshot.find((session) => session.id === id)
  if (renamed) persistSession(renamed)
}

export function deleteAgentSession(id: string) {
  write(snapshot.filter((session) => session.id !== id))
  deletePersistedSession(id)
}
