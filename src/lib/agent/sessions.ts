import { useSyncExternalStore } from 'react'
import {
  deletePersistedSession,
  loadPersistedSessions,
  persistSession,
} from '@/lib/agent/persistence'
import {
  whenAgentPersistenceReady,
  type AgentPersistenceWork,
} from '@/lib/agent/persistenceReadiness'
import { storageKey } from '@/lib/storageNamespace'

/**
 * THE AGENT SESSION — the list, which one is open, what you were typing in
 * it, and what is waiting to go with the next message.
 *
 * Four facts, one module, because they are four facts about ONE thing and
 * every rule worth having spans them. They were three modules until it became
 * clear what that cost: deleting the open session left the panel pointing at
 * an id the list no longer held, and the only thing that noticed was a
 * `?? null` in a component. A rule about the open session cannot live in the
 * component that renders it — it has to live where the session is deleted.
 *
 * The panel and its views read this and nothing else about a session.
 *
 * WHY IT IS A MODULE STORE AT ALL — cross-surface state is a module store,
 * and this is the case that decision was written from. The chat has two
 * postures — docked in the sidebar, floating over the canvas — rendered by
 * two mount points, so dragging between them unmounts one `AgentPanel` and
 * mounts another. Anything held in component state dies in that gap, which
 * meant a drag threw you back to the session list and ate a half-typed
 * message.
 * Placement promises "same conversation either way"; the transcript already
 * lived in a module store (`loop.ts`), so this is the rest of that promise.
 *
 * PERSISTENCE. localStorage is the always-there layer; when the session is
 * authenticated (local dev), every mutation also writes through to
 * agent_sessions and `hydrateAgentSessions` merges the DB list in on boot —
 * so sessions survive reloads and browsers, and read-only visitors lose
 * nothing they ever had. The open session, the drafts and the attachment are
 * deliberately NOT persisted: they are where you are, not what you have.
 */

export type AgentSession = {
  id: string
  title: string
  createdAt: string
  updatedAt: string
  /** Ledger entries stamped with this session — wired when tool loop lands. */
  changeCount: number
}

/**
 * The hand-off shelf between the canvas and the composer. Capturing
 * annotations (or anything else later) parks ONE pending attachment here;
 * the composer shows it as a removable attachment and folds `payload` into
 * the next message. Structure, not a screenshot — everything that travels can
 * be listed to the person sending it (see annotationCapture.ts).
 */
export type AgentAttachment = {
  kind: 'annotations'
  /** Attachment label, e.g. "3 marks on Intake Call". */
  label: string
  /** Human-readable lines shown in the attachment's tooltip / transcript. */
  lines: string[]
  /** The structured text the model receives. */
  payload: string
}

/**
 * Per-session composer state — switching sessions keeps each draft.
 *
 * TEXT AND NOTHING ELSE. The draft used to carry the skill a reader had
 * picked, in a field beside the text, and that field was a second record of
 * something the text already said: the skills a message runs are the tokens
 * in it, parsed at send. Two records disagree, and this pair did — a picked
 * skill outlived the token that made it, and a token typed in a sentence sat
 * there with nothing recording it.
 */
type AgentDraft = { text: string }

const STORAGE_KEY = storageKey('agent-sessions')
const EMPTY_DRAFT: AgentDraft = { text: '' }

/** A stored entry that carries the three fields nothing can substitute for. */
type StoredSession = Record<string, unknown> & {
  id: string
  title: string
  createdAt: string
}

/**
 * Is this entry a session at all, or JSON some other release left behind?
 *
 * The three fields checked are the three NOTHING CAN SUBSTITUTE FOR: `id`
 * addresses the session, `title` is the only name it has, and `createdAt` is
 * what the DB merge sorts on. An entry missing one of them is not a session
 * this build can show, so it is dropped.
 *
 * The rest are normalised rather than checked here — see `asSession`.
 */
function isSession(entry: unknown): entry is StoredSession {
  if (entry === null || typeof entry !== 'object') return false
  const record = entry as Record<string, unknown>
  return (
    typeof record.id === 'string' &&
    typeof record.title === 'string' &&
    typeof record.createdAt === 'string'
  )
}

/**
 * A stored entry as this build's type: the fields it must have, and a stand-in
 * for each field it can do without.
 *
 * NORMALISING BEATS DROPPING wherever a field has an honest substitute, and
 * `updatedAt` has one. It is dereferenced — `listSessions`, the agent's
 * `list_sessions` tool, sorts on `updatedAt.localeCompare` and prints
 * `updatedAt.slice(0, 10)` over this very snapshot — so an entry that lost it
 * is as fatal there as a lost `title` is in the session filter. But the
 * session is still a session a person can open, and `createdAt` is a true
 * statement about it: the oldest moment it can honestly claim. Dropping it
 * would take a conversation away to protect a date.
 *
 * `changeCount` is only ever compared with `>`, so it was never a crash — but
 * it is typed `number`, and this function is where the type is made true
 * rather than asserted, so it gets its zero here beside the rest.
 */
function asSession(entry: StoredSession): AgentSession {
  return {
    id: entry.id,
    title: entry.title,
    createdAt: entry.createdAt,
    updatedAt:
      typeof entry.updatedAt === 'string' ? entry.updatedAt : entry.createdAt,
    changeCount: typeof entry.changeCount === 'number' ? entry.changeCount : 0,
  }
}

/**
 * The stored list, as this build can read it.
 *
 * A cast stood here, and a cast is a promise about JSON another release wrote
 * — the one claim in this module no compiler is in a position to keep. An
 * entry whose `title` was renamed or dropped survived it and reached the
 * session filter, which lowercases that title: a TypeError into the editor
 * boundary on the first character typed, on every attempt, until the reader
 * cleared their site data. So the shape is settled HERE, where there is still
 * a list to hand back, rather than believed and met later by a surface that
 * can only fail.
 */
function read(): AgentSession[] {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed: unknown = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed.filter(isSession).map(asSession) : []
  } catch {
    return []
  }
}

// The four facts are four variables rather than one object on purpose: each
// hook below returns one of them, and `useSyncExternalStore` re-renders on a
// changed REFERENCE. Rebuilding a single state object per keystroke would
// re-render the session list on every character typed into the composer.
let snapshot: AgentSession[] = typeof window === 'undefined' ? [] : read()
let openSessionId: string | null = null
let drafts: Record<string, AgentDraft> = {}
let pendingAttachment: AgentAttachment | null = null

const listeners = new Set<() => void>()

function emit(): void {
  listeners.forEach((listener) => listener())
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

function write(next: AgentSession[]) {
  snapshot = next
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
  } catch {
    // Session-only fallback is fine for a prototype store.
  }
  emit()
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
  return useSyncExternalStore(subscribe, () => snapshot)
}

/**
 * The merge of the persisted list into this one, as a piece of work the
 * readiness module schedules and answers for.
 *
 * The list used to keep its own pair of flags for the same question the
 * transcript keeps one for — one for the merge on the wire, one for the
 * window before it even starts — which is two spellings of a single fact and
 * two chances to get the empty-versus-loading distinction wrong. There is one
 * spelling now, and the sessions list subscribes to it the way the chat view
 * does. The id is fixed because there is one list.
 */
export const AGENT_SESSION_LIST_WORK: AgentPersistenceWork = {
  kind: 'session-list',
  id: 'all',
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
 * Ask for the persisted list to be merged in, once persistence can be read.
 *
 * Safe to call before a client has attached, and that is the ordinary case on
 * a reload: the merge is parked and runs when one lands. Asking twice does
 * not merge twice.
 */
export function hydrateAgentSessions(): void {
  whenAgentPersistenceReady(AGENT_SESSION_LIST_WORK, mergePersistedSessions)
}

/** Merge the DB's sessions in (DB wins on shared ids, local-only rows stay). */
async function mergePersistedSessions(): Promise<void> {
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

/**
 * Delete a session — and, if it was the open one, close it.
 *
 * That second clause is the reason this module is one module. The delete
 * runs from a dialog the sessions list owns and from nothing the chat view
 * can see, so the panel used to be left holding an id no session answered to
 * and fell back through a `?? null` to the list. Here it is a rule: the open
 * session is a session, and a session that no longer exists is not open. Its
 * draft goes with it for the same reason — an id minted by `randomUUID` never
 * comes back, so a draft kept under it is unreachable by construction.
 */
export function deleteAgentSession(id: string) {
  if (openSessionId === id) openSessionId = null
  if (drafts[id]) {
    const rest = { ...drafts }
    delete rest[id]
    drafts = rest
  }
  write(snapshot.filter((session) => session.id !== id))
  deletePersistedSession(id)
}

export function openAgentSession(id: string): void {
  if (openSessionId === id) return
  openSessionId = id
  emit()
}

export function closeAgentSession(): void {
  if (openSessionId === null) return
  openSessionId = null
  emit()
}

/**
 * Which session is open, by id — for a reader asking about the id and not
 * about the session. There is one, and it is the test that holds the deletion
 * rule: a rule that CLEARS the id cannot be read through the hook below,
 * which resolves it against the list and answers null either way.
 */
export function openAgentSessionId(): string | null {
  return openSessionId
}

/**
 * The open session itself, not its id — resolving the one against the other
 * is this module's business, and a caller handed an id has no way to know
 * whether the list still holds it.
 */
export function useOpenAgentSession(): AgentSession | null {
  return useSyncExternalStore(
    subscribe,
    openSessionSnapshot,
    openSessionSnapshot,
  )
}

/**
 * Referentially stable between writes, which `useSyncExternalStore` requires:
 * `find` hands back the element the list already holds, and the list is only
 * rebuilt when it actually changes.
 */
function openSessionSnapshot(): AgentSession | null {
  if (openSessionId === null) return null
  return snapshot.find((session) => session.id === openSessionId) ?? null
}

export function setAgentDraft(sessionId: string, draft: AgentDraft): void {
  const current = drafts[sessionId] ?? EMPTY_DRAFT
  // Reference equality is what `useSyncExternalStore` re-renders on, so a
  // write that changes nothing has to be dropped here.
  if (current.text === draft.text) return
  drafts = { ...drafts, [sessionId]: draft }
  emit()
}

export function clearAgentDraft(sessionId: string): void {
  if (!drafts[sessionId]) return
  const rest = { ...drafts }
  delete rest[sessionId]
  drafts = rest
  emit()
}

export function useAgentDraft(sessionId: string): AgentDraft {
  return useSyncExternalStore(
    subscribe,
    () => drafts[sessionId] ?? EMPTY_DRAFT,
    () => EMPTY_DRAFT,
  )
}

export function setPendingAgentAttachment(next: AgentAttachment | null) {
  pendingAttachment = next
  emit()
}

export function takePendingAgentAttachment(): AgentAttachment | null {
  const taken = pendingAttachment
  pendingAttachment = null
  if (taken) emit()
  return taken
}

export function usePendingAgentAttachment(): AgentAttachment | null {
  return useSyncExternalStore(subscribe, () => pendingAttachment)
}
