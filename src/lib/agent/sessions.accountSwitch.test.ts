// @vitest-environment jsdom
/**
 * SWITCHING ACCOUNT MID-MERGE MUST NOT MOVE ONE ACCOUNT'S SESSIONS INTO THE
 * OTHER'S.
 *
 * The session-list merge reads one database and writes two places: the list
 * the reader sees, and — for rows the database it read did not have — the
 * database it can reach when it gets there. Those are not the same database
 * if the client changed while the read was on the wire, and the failure that
 * makes is the worst one this module can make. The previous account's
 * sessions land over the sessions of the person now signed in, and the rows
 * the previous account had are upserted into the new account's table, where
 * they stay.
 *
 * The era counter in the readiness module never covered this: it suppressed
 * the settled bookkeeping of a superseded flight, so the surface kept its
 * skeleton honestly, while the flight itself ran to completion and wrote.
 *
 * So each case here drives the real switch — the panel's detach, forget,
 * attach of the next client, and re-ask — with the first database's read
 * still unanswered, and then answers it. Both halves are pinned: nothing from
 * the superseded flight reaches the store OR the table, and the replacement's
 * own merge is the one that publishes.
 */
import { beforeEach, expect, it } from 'vitest'
import { waitFor } from '@testing-library/react'
import {
  attachAgentPersistence,
  forgetAgentPersistenceWork,
} from '@/lib/agent/persistenceReadiness'
import {
  AGENT_SESSION_LIST_WORK,
  agentSessionsSnapshot,
  createAgentSession,
  deleteAgentSession,
  hydrateAgentSessions,
} from '@/lib/agent/sessions'
import { storageKey } from '@/lib/storageNamespace'

type Client = Parameters<typeof attachAgentPersistence>[0]
type PersistedRow = {
  id: string
  title: string
  created_at: string
  updated_at: string
}

/**
 * One account's table: the rows its read answers, held open until the case
 * says otherwise, and every row upserted into it while it is the attached
 * one.
 */
type FakeAccountTable = {
  client: Client
  upserted: PersistedRow[]
  answerRead: () => void
}

function fakeAccountTable(rows: PersistedRow[]): FakeAccountTable {
  const upserted: PersistedRow[] = []
  let answerRead = (): void => undefined
  const read = new Promise<{ data: PersistedRow[]; error: null }>((resolve) => {
    answerRead = () => resolve({ data: rows, error: null })
  })
  const client = {
    from: () => ({
      select: () => ({ order: () => read }),
      upsert: (row: PersistedRow) => {
        upserted.push(row)
        return Promise.resolve({ data: null, error: null })
      },
    }),
  }
  return { client: client as unknown as Client, upserted, answerRead }
}

/**
 * Give every promise chain still in the air its chance to finish. Drained
 * AFTER the assertion's positive signal has arrived, and only so that a
 * negative pin cannot pass by asking too early: an abandoned flight that was
 * going to write has had every tick it needs by the time this returns.
 */
async function drainFlights(): Promise<void> {
  for (let tick = 0; tick < 20; tick += 1) await Promise.resolve()
}

function titles(): string[] {
  return agentSessionsSnapshot().map((session) => session.title)
}

/** The list as the next boot would read it, out of localStorage. */
function storedTitles(): string[] {
  const raw = window.localStorage.getItem(storageKey('agent-sessions'))
  const stored = raw ? (JSON.parse(raw) as { title: string }[]) : []
  return stored.map((session) => session.title)
}

beforeEach(() => {
  attachAgentPersistence(null)
  forgetAgentPersistenceWork(AGENT_SESSION_LIST_WORK)
  agentSessionsSnapshot().forEach((session) => deleteAgentSession(session.id))
})

it('abandons a merge whose account was replaced while its read was on the wire', async () => {
  // A session made before any client attached, so the merge has something
  // local to converge upward — this is the row that rides a superseded
  // flight's write into whatever table is attached by then.
  const local = createAgentSession('Made here before signing in')
  const localRow: PersistedRow = {
    id: local.id,
    title: local.title,
    created_at: local.createdAt,
    updated_at: local.updatedAt,
  }
  const firstAccount = fakeAccountTable([
    {
      id: 'first-account-session',
      title: 'Belongs to the account that signed out',
      created_at: '2026-05-01T00:00:00.000Z',
      updated_at: '2026-05-01T00:00:00.000Z',
    },
  ])
  // The second account's table ALREADY has the local row, so its own merge
  // has nothing to push up: any upsert this table sees came from the flight
  // that started against the first account.
  const secondAccount = fakeAccountTable([
    {
      id: 'second-account-session',
      title: 'Belongs to the account that signed in',
      created_at: '2026-06-01T00:00:00.000Z',
      updated_at: '2026-06-01T00:00:00.000Z',
    },
    localRow,
  ])

  attachAgentPersistence(firstAccount.client)
  hydrateAgentSessions()

  // The switch, exactly as the panel performs it, with the first read still
  // unanswered.
  attachAgentPersistence(null)
  forgetAgentPersistenceWork(AGENT_SESSION_LIST_WORK)
  attachAgentPersistence(secondAccount.client)
  hydrateAgentSessions()

  firstAccount.answerRead()
  secondAccount.answerRead()
  await waitFor(() =>
    expect(titles()).toContain('Belongs to the account that signed in'),
  )
  await drainFlights()

  // The store half: not one row of the signed-out account's list is on screen
  // or in the storage the next boot reads.
  expect(titles()).not.toContain('Belongs to the account that signed out')
  expect(storedTitles()).not.toContain('Belongs to the account that signed out')
  // The table half: the superseded flight's `persistSession` calls resolve
  // whichever client is attached when they run, which is the new one.
  expect(secondAccount.upserted).toEqual([])
  // And the replacement's merge is the one that published: the second
  // account's list, with the local session it already held.
  expect(titles()).toEqual([
    'Made here before signing in',
    'Belongs to the account that signed in',
  ])
})

it('still converges local-only rows upward when the account does not change', async () => {
  const local = createAgentSession('Made here before signing in')
  const account = fakeAccountTable([
    {
      id: 'account-session',
      title: 'Already persisted',
      created_at: '2026-06-01T00:00:00.000Z',
      updated_at: '2026-06-01T00:00:00.000Z',
    },
  ])

  attachAgentPersistence(account.client)
  hydrateAgentSessions()
  account.answerRead()
  await waitFor(() => expect(titles()).toContain('Already persisted'))
  await drainFlights()

  expect(titles()).toEqual(['Made here before signing in', 'Already persisted'])
  expect(account.upserted.map((row) => row.id)).toEqual([local.id])
})
