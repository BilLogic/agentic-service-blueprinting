import { afterEach, describe, expect, it } from 'vitest'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database'
import type { TranscriptEvent } from '@/lib/agent/loop'
import { attachAgentPersistence } from '@/lib/agent/persistenceReadiness'
import { getSession } from '@/lib/agent/tools/read'

/**
 * WHAT AN AGENT READING A PAST SESSION IS OWED: the words, not the fact that
 * words existed. `get_session` renders one line per transcript event, and a
 * kind nobody spelled out used to fall through to a bare `kind:` — a record
 * saying a thing occurred and not what it said, which is the grievance the
 * declined row was added to close and which `status` still had.
 *
 * These tests read the transcript through the real persistence seam so they
 * exercise the rendering an agent actually gets, not a private formatter.
 */

const SESSION_ID = 'session-under-test'

/** `agent_messages` for one session: the rows, in seq order, and nothing else. */
function serve(events: readonly TranscriptEvent[]): void {
  const client = {
    from: () => ({
      select: () => ({
        eq: () => ({
          order: () =>
            Promise.resolve({
              data: events.map((payload) => ({ payload })),
              error: null,
            }),
        }),
      }),
    }),
  }
  attachAgentPersistence(client as unknown as SupabaseClient<Database>)
}

afterEach(() => attachAgentPersistence(null))

/**
 * One event per kind the transcript has, as a TOTAL map.
 *
 * The totality is the pin. `Record<TranscriptEvent['kind'], …>` cannot be
 * satisfied with a kind missing, so a sixth kind added to the union fails to
 * compile here before it can quietly reach a reader as a bare word — which
 * is exactly how `status` got lost.
 */
const ONE_OF_EACH: Record<TranscriptEvent['kind'], TranscriptEvent> = {
  user: { kind: 'user', text: 'reconcile the intake lane' },
  assistant: { kind: 'assistant', text: 'four cells moved' },
  tool: {
    kind: 'tool',
    name: 'get_blueprint',
    summary: '3 paths',
    isError: false,
  },
  status: { kind: 'status', text: 'paused for your confirmation' },
  declined: {
    kind: 'declined',
    misses: [{ token: 'audit', label: '/sb:audit' }],
  },
}

/**
 * The words each kind is expected to carry through. Written out beside the
 * fixture rather than derived from it, so a rendering that drops a field
 * fails instead of agreeing with itself.
 */
const WORDS_EXPECTED: Record<TranscriptEvent['kind'], string> = {
  user: 'reconcile the intake lane',
  assistant: 'four cells moved',
  tool: '3 paths',
  status: 'paused for your confirmation',
  declined: '/sb:audit',
}

describe('get_session hands an agent the words, not the kind', () => {
  it('shows a status event its text', async () => {
    serve([ONE_OF_EACH.status])
    const read = await getSession(SESSION_ID)
    expect(read).toContain('status: paused for your confirmation')
  })

  const kinds = Object.keys(ONE_OF_EACH) as TranscriptEvent['kind'][]
  kinds.forEach((kind) => {
    it(`shows a ${kind} event its words`, async () => {
      serve([ONE_OF_EACH[kind]])
      const read = await getSession(SESSION_ID)
      expect(read).toContain(WORDS_EXPECTED[kind])
    })
  })

  it('renders no line as the bare kind', async () => {
    serve(kinds.map((kind) => ONE_OF_EACH[kind]))
    const read = await getSession(SESSION_ID)
    const lines = read.split('\n').slice(1)
    expect(lines).toHaveLength(kinds.length)
    kinds.forEach((kind) => {
      expect(lines).not.toContain(`${kind}:`)
    })
  })
})
