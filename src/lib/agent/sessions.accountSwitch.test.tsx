// @vitest-environment jsdom
/**
 * SWITCHING ACCOUNT MID-MERGE MUST NOT MOVE ONE ACCOUNT'S SESSIONS INTO THE
 * OTHER'S.
 *
 * The session-list merge reads one database and writes two places: the list
 * the reader sees, and — for rows the database it read did not have — the
 * database it can reach when it gets there. Those are not the same database
 * if the account changed while the read was on the wire, and the failure that
 * makes is the worst one this module can make. The previous account's
 * sessions land over the sessions of the person now signed in, and the rows
 * the previous account had are upserted into the new account's table, where
 * they stay.
 *
 * The era counter in the readiness module never covered this: it suppressed
 * the settled bookkeeping of a superseded flight, so the surface kept its
 * skeleton honestly, while the flight itself ran to completion and wrote.
 *
 * TWO SEAMS, AND BOTH ARE LOAD-BEARING. The cases are split by what they can
 * see, because a case at one seam is blind to the other's defect:
 *
 *  - The MODULE cases call the readiness seam directly — detach, forget,
 *    attach the next client, re-ask — with the first database's read still
 *    unanswered. They prove that a superseded flight abandons both of its
 *    writes. They cannot prove that anything ever supersedes it in the
 *    running app, because they bump the era by hand.
 *  - The PANEL case makes nothing happen by hand. It renders the real
 *    `AgentPanel` and changes only which account is signed in, leaving the
 *    client object identical — which is the shape the product actually has,
 *    the client being one module singleton per page whose token changes
 *    underneath it. What it proves is that the panel's own effect notices,
 *    and so that the era is bumped at all.
 *
 * A NON-NULL TO NON-NULL CHANGE IS THE CASE THIS FILE EXISTS FOR. It is not
 * hypothetical: a magic link is sent with `emailRedirectTo` pointing at the
 * origin, so somebody signed in as one account can follow a link mailed for
 * another and land back on the page already signed in as the second, with no
 * signed-out moment in between. `signInWithPassword` has the same shape.
 */
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { act, cleanup, render, waitFor } from '@testing-library/react'
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
  type AgentSession,
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
 * says otherwise, and every row upserted into it while it is the one the
 * attached client resolves to.
 */
type FakeAccountTable = {
  /** This table as a client of its own, for the module-seam cases. */
  client: Client
  /** This table behind somebody else's client, for the panel case. */
  from: () => unknown
  upserted: PersistedRow[]
  answerRead: () => void
}

function fakeAccountTable(rows: PersistedRow[]): FakeAccountTable {
  const upserted: PersistedRow[] = []
  let answerRead = (): void => undefined
  const read = new Promise<{ data: PersistedRow[]; error: null }>((resolve) => {
    answerRead = () => resolve({ data: rows, error: null })
  })
  const from = () => ({
    select: () => ({ order: () => read }),
    upsert: (row: PersistedRow) => {
      upserted.push(row)
      return Promise.resolve({ data: null, error: null })
    },
  })
  return { client: { from } as unknown as Client, from, upserted, answerRead }
}

/**
 * Who is signed in, and which table their token reaches. The panel case moves
 * both at once and moves nothing else — that is the whole of an account
 * switch as this application performs one.
 */
const signedIn = vi.hoisted(() => ({
  userId: null as string | null,
  table: null as { from: () => unknown } | null,
}))

/**
 * ONE CLIENT PER PAGE, exactly as `SupabaseProvider` holds it: a module
 * singleton whose identity never changes, whose token does. Every read and
 * write reaches whichever account is signed in at the moment it resolves,
 * which is why a client handle cannot tell one account's work from another's.
 */
const oneClientPerPage = vi.hoisted(() => ({
  from: () => signedIn.table!.from(),
}))

vi.mock('@/contexts/SupabaseProvider', () => ({
  useSupabase: () => ({
    client: oneClientPerPage,
    configured: true,
    // A fresh object per render, as the real provider hands out on every
    // token refresh. Nothing may key on its identity.
    session: signedIn.userId ? { user: { id: signedIn.userId } } : null,
    isLoading: false,
    canWrite: false,
    canAgent: true,
    canAgentWrite: false,
    isSampleTrial: false,
  }),
}))

import { AgentPanel } from '@/components/editor/AgentPanel'

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

/**
 * The list as the next boot would read it, out of localStorage. Not a second
 * guard — `write` sets the snapshot and the storage with nothing between
 * them, so anything that reaches one reaches the other. It is here so the
 * assertions say what the durable half of "published" is.
 */
function storedTitles(): string[] {
  const raw = window.localStorage.getItem(storageKey('agent-sessions'))
  const stored = raw ? (JSON.parse(raw) as { title: string }[]) : []
  return stored.map((session) => session.title)
}

const SIGNED_OUT_ACCOUNTS_SESSION: PersistedRow = {
  id: 'first-account-session',
  title: 'Belongs to the account that signed out',
  created_at: '2026-05-01T00:00:00.000Z',
  updated_at: '2026-05-01T00:00:00.000Z',
}

const SIGNED_IN_ACCOUNTS_SESSION: PersistedRow = {
  id: 'second-account-session',
  title: 'Belongs to the account that signed in',
  created_at: '2026-06-01T00:00:00.000Z',
  updated_at: '2026-06-01T00:00:00.000Z',
}

function rowFor(session: AgentSession): PersistedRow {
  return {
    id: session.id,
    title: session.title,
    created_at: session.createdAt,
    updated_at: session.updatedAt,
  }
}

beforeEach(() => {
  attachAgentPersistence(null)
  forgetAgentPersistenceWork(AGENT_SESSION_LIST_WORK)
  agentSessionsSnapshot().forEach((session) => deleteAgentSession(session.id))
  signedIn.userId = null
  signedIn.table = null
})

afterEach(cleanup)

it('abandons a merge whose account was replaced while its read was on the wire', async () => {
  // A session made before any client attached, so the merge has something
  // local to converge upward — this is the row that rides a superseded
  // flight's write into whatever table is attached by then.
  const local = createAgentSession('Made here before signing in')
  const firstAccount = fakeAccountTable([SIGNED_OUT_ACCOUNTS_SESSION])
  // The second account's table ALREADY has the local row, so its own merge
  // has nothing to push up: any upsert this table sees came from the flight
  // that started against the first account.
  const secondAccount = fakeAccountTable([
    SIGNED_IN_ACCOUNTS_SESSION,
    rowFor(local),
  ])

  attachAgentPersistence(firstAccount.client)
  hydrateAgentSessions()

  // The readiness calls the panel's effect makes on a client change, made
  // here directly, with the first read still unanswered. Whether the panel's
  // effect actually re-runs on an account switch is the next case's business
  // — this one bumps the era by hand and so cannot see that.
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

  // The store half: not one row of the signed-out account's list is
  // published, in memory or in the storage the next boot reads.
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

it('re-arms the merge when the panel is handed a new account on the same client', async () => {
  // The cross-account case, driven the way the product reaches it: no
  // signed-out moment, no new client object, only a different person behind
  // the same singleton. Nothing here calls the readiness module — if the
  // panel's own effect does not notice, nothing supersedes the first flight
  // and both halves of this assertion fail.
  const local = createAgentSession('Made here before signing in')
  const firstAccount = fakeAccountTable([SIGNED_OUT_ACCOUNTS_SESSION])
  const secondAccount = fakeAccountTable([
    SIGNED_IN_ACCOUNTS_SESSION,
    rowFor(local),
  ])

  signedIn.userId = 'account-a'
  signedIn.table = firstAccount
  const { rerender } = render(<AgentPanel />)
  // The first account's read has to actually be ON THE WIRE before the
  // switch. `throughAgentPersistence` defers its query by a microtask, so a
  // switch made in the same tick would hand the FIRST flight the second
  // account's table and the case would pass without proving anything.
  await act(drainFlights)

  // The magic link for the other account, followed while this one is live:
  // one non-null session replaced by another, the client untouched.
  await act(async () => {
    signedIn.userId = 'account-b'
    signedIn.table = secondAccount
    rerender(<AgentPanel />)
  })

  await act(async () => {
    firstAccount.answerRead()
    secondAccount.answerRead()
  })
  await waitFor(() =>
    expect(titles()).toContain('Belongs to the account that signed in'),
  )
  await drainFlights()

  expect(titles()).not.toContain('Belongs to the account that signed out')
  expect(storedTitles()).not.toContain('Belongs to the account that signed out')
  expect(secondAccount.upserted).toEqual([])
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
