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
import { renderHook, waitFor } from '@testing-library/react'
import {
  deletePersistedSession,
  loadPersistedEvents,
  loadPersistedSessions,
  persistEvent,
  persistSession,
} from '@/lib/agent/persistence'
import {
  attachAgentPersistence,
  forgetAgentPersistenceWork,
  useAgentPersistenceWorkPending,
} from '@/lib/agent/persistenceReadiness'
import {
  AGENT_SESSION_LIST_WORK,
  agentSessionsSnapshot,
  createAgentSession,
  deleteAgentSession,
  hydrateAgentSessions,
  renameAgentSession,
} from '@/lib/agent/sessions'
import { forgetAgentRun, hydrateAgentTranscript } from '@/lib/agent/loop'

beforeEach(() => {
  attachAgentPersistence(null)
  forgetAgentPersistenceWork(AGENT_SESSION_LIST_WORK)
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
  // A client that cannot answer anything: the merge is scheduled, the read
  // it makes fails on the spot, and the list the person can see must not be
  // emptied or reordered by that.
  attachAgentPersistence({} as Parameters<typeof attachAgentPersistence>[0])

  // Wait for the merge itself, not for a guessed number of microtask ticks.
  // The chain is four deep — the readiness helper's own promise, the query,
  // the outcome, the merge — and a tick count that is one short asserts
  // against a list nothing has touched yet, which passes whatever the merge
  // would have done. The outstanding answer flips exactly when the parked
  // work settles, so subscribing to it is waiting for the real thing.
  const { result } = renderHook(() =>
    useAgentPersistenceWorkPending(AGENT_SESSION_LIST_WORK),
  )
  hydrateAgentSessions()
  await waitFor(() => expect(result.current).toBe(false))

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
  const { result } = renderHook(() =>
    useAgentPersistenceWorkPending({ kind: 'transcript', id: session.id }),
  )
  expect(result.current).toBe(true)
})
