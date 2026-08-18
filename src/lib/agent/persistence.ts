import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database, Json } from '@/types/database'
import type { AgentSession } from '@/lib/agent/sessions'
import type { TranscriptEvent } from '@/lib/agent/loop'

type Client = SupabaseClient<Database>

/**
 * Best-effort DB persistence for agent sessions and transcripts.
 *
 * A signed-in session lands everything in agent_sessions / agent_messages
 * so conversations survive reloads and browsers. Anonymous / zero-config
 * deployments have NO policies on these tables — every call fails or
 * no-ops quietly and the panel keeps working from its in-memory /
 * localStorage stores. That degradation is deliberate: the agent surface
 * is additive, never a boot dependency.
 *
 * The attach SIGNAL matters as much as the client: a transcript hydrate
 * that fires before persistence attaches must park and replay when the
 * client arrives (loop.ts pendingHydrates), not burn its one attempt —
 * that ordering gap is exactly where "opened a persisted session, saw
 * Ready instead of the transcript" came from.
 */

let attached: Client | null = null
const attachListeners = new Set<() => void>()

export function attachAgentPersistence(client: Client | null) {
  attached = client
  if (client) attachListeners.forEach((listener) => listener())
}

export function isAgentPersistenceAttached(): boolean {
  return attached !== null
}

/** Fired every time a client attaches — parked hydrates replay on it. */
export function onAgentPersistenceAttach(listener: () => void): () => void {
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
        payload: event as unknown as Json,
      },
      { onConflict: 'session_id,seq' },
    )
    .then(() => undefined)
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
    .map((row) => row.payload as unknown as TranscriptEvent)
    .filter((event) => event && typeof event.kind === 'string')
}
