import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database, Json } from '@/types/database'
import type { AgentSession } from '@/lib/agent/sessions'
import type { TranscriptEvent } from '@/lib/agent/loop'

type Client = SupabaseClient<Database>

/**
 * Best-effort DB persistence for agent sessions and transcripts.
 *
 * Local dev runs authenticated (the dev authoring user), so everything here
 * lands in agent_sessions / agent_messages and survives reloads. The
 * deployed read-only site runs as anon, which has NO policies on these
 * tables — every call fails quietly and the panel keeps working from its
 * in-memory/localStorage stores. That degradation is deliberate: the agent
 * surface never exists without write access anyway.
 */

let attached: Client | null = null
const attachListeners = new Set<() => void>()

export function attachAgentPersistence(client: Client | null) {
  const cameOnline = attached === null && client !== null
  attached = client
  // Child effects run before the parent effect that attaches, so hydrators
  // that fired too early wait on this signal instead of a client they will
  // never see change.
  if (cameOnline) attachListeners.forEach((listener) => listener())
}

/** Fires whenever persistence goes from detached to attached. */
export function onAgentPersistenceAttached(listener: () => void): () => void {
  attachListeners.add(listener)
  return () => attachListeners.delete(listener)
}

export function persistSession(session: AgentSession): void {
  if (!attached) return
  void attached
    .from('agent_sessions')
    .upsert({
      id: session.id,
      title: session.title,
      created_at: session.createdAt,
      updated_at: session.updatedAt,
    })
    .then(() => undefined)
}

export function deletePersistedSession(id: string): void {
  if (!attached) return
  void attached
    .from('agent_sessions')
    .delete()
    .eq('id', id)
    .then(() => undefined)
}

export async function loadPersistedSessions(): Promise<AgentSession[] | null> {
  if (!attached) return null
  const { data, error } = await attached
    .from('agent_sessions')
    .select('id, title, created_at, updated_at')
    .order('created_at', { ascending: false })
  if (error || !data) return null
  return data.map((row) => ({
    id: row.id,
    title: row.title,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    changeCount: 0,
  }))
}

export function persistEvent(
  sessionId: string,
  seq: number,
  event: TranscriptEvent,
): void {
  if (!attached) return
  void attached
    .from('agent_messages')
    .upsert(
      {
        session_id: sessionId,
        seq,
        kind: event.kind,
        payload: event as unknown as NonNullable<Json>,
      },
      { onConflict: 'session_id,seq' },
    )
    .then(() => undefined)
}

/** Whether a client is attached — hydrators check this BEFORE burning
 *  their once-per-page-load attempt on a load that cannot succeed. */
export function isAgentPersistenceAttached(): boolean {
  return attached !== null
}

/**
 * A stored user turn as an earlier release wrote it: ONE skill id, because a
 * message could only carry one. Rows in that shape are still in the table.
 */
type StoredEvent = TranscriptEvent & { skill?: string }

/**
 * A stored event as this build's transcript.
 *
 * The one-skill spelling is settled HERE, at the read, where there is still a
 * list to hand back — the same reason the session list normalises its rows in
 * `sessions.ts` rather than letting a surface meet the shape later. A
 * transcript row can only render what it is given, so a fallback living there
 * is a promise about JSON another release wrote, made in the one place that
 * cannot do anything about it being wrong.
 */
function asTranscriptEvent(stored: StoredEvent): TranscriptEvent {
  if (stored.kind !== 'user' || !stored.skill) return stored
  const { skill, ...event } = stored
  return { ...event, skills: event.skills ?? [skill] }
}

export async function loadPersistedEvents(
  sessionId: string,
): Promise<TranscriptEvent[] | null> {
  if (!attached) return null
  const { data, error } = await attached
    .from('agent_messages')
    .select('payload')
    .eq('session_id', sessionId)
    .order('seq', { ascending: true })
  if (error || !data) return null
  return data
    .map((row) => row.payload as unknown as StoredEvent)
    .filter((event) => event && typeof event.kind === 'string')
    .map(asTranscriptEvent)
}
