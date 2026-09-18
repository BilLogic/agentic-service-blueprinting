// @vitest-environment jsdom
/**
 * NOTHING ATTACHED IS A SUPPORTED POSTURE, NOT A FAILURE.
 *
 * A deployment stood up without a database is the anonymous visitor's case
 * and the adopter's first afternoon: the agent surface runs off localStorage
 * and no call in this module may throw, reject, or empty a list on the way
 * past. The guard used to be written five times, once at the head of each
 * call; it is written once now, which is precisely why the promise wants a
 * test of its own rather than a reader counting `if`s.
 *
 * The reopen half is here too, without a React harness: a session created and
 * renamed with no client behind it is still there to reopen after the merge
 * that had nothing to merge, and the transcript read parks instead of
 * answering "nothing persisted" to a question it could not ask.
 */
import { beforeEach, expect, it } from 'vitest'
import {
  deletePersistedSession,
  loadPersistedEvents,
  loadPersistedSessions,
  persistEvent,
  persistSession,
} from '@/lib/agent/persistence'
import {
  agentPersistenceWorkPending,
  attachAgentPersistence,
} from '@/lib/agent/persistenceReadiness'
import {
  agentSessionsSnapshot,
  createAgentSession,
  deleteAgentSession,
  hydrateAgentSessions,
  renameAgentSession,
} from '@/lib/agent/sessions'
import { forgetAgentRun, hydrateAgentTranscript } from '@/lib/agent/loop'

beforeEach(() => {
  attachAgentPersistence(null)
  agentSessionsSnapshot().forEach((session) => deleteAgentSession(session.id))
})

it('answers every read with null and swallows every write', async () => {
  const session = createAgentSession('No database behind it')
  // The writes: each one returns, and returning is the whole assertion.
  persistSession(session)
  persistEvent(session.id, 0, { kind: 'user', text: 'hello', skills: [] })
  deletePersistedSession(session.id)
  // The reads: null, the same answer a query that came back empty gives, so
  // no caller needs a second branch for the no-database case.
  expect(await loadPersistedSessions()).toBeNull()
  expect(await loadPersistedEvents(session.id)).toBeNull()
})

it('leaves the localStorage list intact through a merge with nothing to merge', async () => {
  createAgentSession('Kept locally')
  const kept = agentSessionsSnapshot()[0]!
  renameAgentSession(kept.id, 'Renamed locally')

  await hydrateAgentSessions()

  expect(agentSessionsSnapshot().map((session) => session.title)).toEqual([
    'Renamed locally',
  ])
})

it('parks the transcript read rather than spending it on a question it cannot ask', () => {
  const session = createAgentSession('Reopened with nothing attached')
  forgetAgentRun(session.id)

  hydrateAgentTranscript(session.id)

  // The ask is still outstanding: nothing was read, and nothing was marked
  // read either, so the client that lands a moment later still gets to
  // answer. Spending it here is the reopened session that comes back a
  // skeleton for the rest of the page's life.
  expect(agentPersistenceWorkPending(session.id)).toBe(true)
})
