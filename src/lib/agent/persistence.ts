import type { Json } from '@/types/database'
import type { AgentSession } from '@/lib/agent/sessions'
import type { TranscriptEvent } from '@/lib/agent/loop'
import { attachedAgentClient } from '@/lib/agent/persistenceReadiness'

type Client = NonNullable<ReturnType<typeof attachedAgentClient>>

/**
 * Best-effort DB persistence for agent sessions and transcripts.
 *
 * Local dev runs authenticated (the dev authoring user), so everything here
 * lands in agent_sessions / agent_messages and survives reloads. The
 * deployed read-only site runs as anon, which has NO policies on these
 * tables — every call fails quietly and the panel keeps working from its
 * in-memory/localStorage stores. That degradation is deliberate: the agent
 * surface never exists without write access anyway.
 *
 * Whether there is a client to read through, and when there will be, is not
 * asked here — `persistenceReadiness.ts` owns that answer and the parking of
 * work until it is yes. What is left is the spelling of the rows, which is
 * why the non-fatal case is stated ONCE, in `withClient`, rather than as a
 * guard at the head of every call: repeating it was five chances to write
 * the fifth one differently.
 */

/**
 * Run `query` against the attached client, or answer `null`.
 *
 * `null` is the everyday answer on a deployment with no database and the
 * one every caller already treats as "nothing persisted", so a detached tab
 * takes the same path as a query that came back empty — no throw, no branch
 * at the call site.
 */
function withClient<T>(
  query: (client: Client) => PromiseLike<T>,
): Promise<T | null> {
  const client = attachedAgentClient()
  if (!client) return Promise.resolve(null)
  return Promise.resolve(query(client)).catch(() => null)
}

export function persistSession(session: AgentSession): void {
  void withClient((client) =>
    client.from('agent_sessions').upsert({
      id: session.id,
      title: session.title,
      created_at: session.createdAt,
      updated_at: session.updatedAt,
    }),
  )
}

export function deletePersistedSession(id: string): void {
  void withClient((client) =>
    client.from('agent_sessions').delete().eq('id', id),
  )
}

export async function loadPersistedSessions(): Promise<AgentSession[] | null> {
  const result = await withClient((client) =>
    client
      .from('agent_sessions')
      .select('id, title, created_at, updated_at')
      .order('created_at', { ascending: false }),
  )
  if (!result || result.error || !result.data) return null
  return result.data.map((row) => ({
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
  void withClient((client) =>
    client.from('agent_messages').upsert(
      {
        session_id: sessionId,
        seq,
        kind: event.kind,
        payload: event as unknown as NonNullable<Json>,
      },
      { onConflict: 'session_id,seq' },
    ),
  )
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
  const result = await withClient((client) =>
    client
      .from('agent_messages')
      .select('payload')
      .eq('session_id', sessionId)
      .order('seq', { ascending: true }),
  )
  if (!result || result.error || !result.data) return null
  return result.data
    .map((row) => row.payload as unknown as StoredEvent)
    .filter((event) => event && typeof event.kind === 'string')
    .map(asTranscriptEvent)
}
