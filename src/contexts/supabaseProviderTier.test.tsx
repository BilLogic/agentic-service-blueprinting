// @vitest-environment jsdom
import { cleanup, render, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { SupabaseProvider, useSupabase } from '@/contexts/SupabaseProvider'

/**
 * What each kind of session sees, through the provider that decides it.
 *
 * The identity adapter's own suite pins the rule; this one pins that the
 * provider is wired to it — that `canWrite`, the flag 62 call sites read as
 * the app's write gate, follows the database's answer and not the token's
 * claim. The two postures are the whole point: the same account, the same
 * bundle, and two databases that disagree about it.
 */

/** What `is_service_account()` answers in the posture under test. */
let seamAnswer = false
/** Sessions the fake client hands back, and whether a service key is held. */
let currentSession: unknown = null
let devAuthoringKey = false
let rpcCalls = 0

vi.mock('@/lib/supabase', () => ({
  isSupabaseConfigured: () => true,
  hasDevAuthoringKey: () => devAuthoringKey,
  hasDevAuthoringUi: () => false,
  devLoginCredentials: () => null,
  createSupabaseClient: () => ({
    auth: {
      getSession: async () => ({ data: { session: currentSession } }),
      refreshSession: async () => ({ data: { session: currentSession } }),
      onAuthStateChange: () => ({
        data: { subscription: { unsubscribe: () => {} } },
      }),
    },
    rpc: async () => {
      rpcCalls += 1
      return { data: seamAnswer, error: null }
    },
  }),
}))

function signedIn(role?: string) {
  return {
    access_token: 'token',
    user: { id: 'user-1', app_metadata: role === undefined ? {} : { role } },
  }
}

type Snapshot = {
  canWrite: boolean
  isServiceAccount: boolean
  canAgent: boolean
  isLoading: boolean
}

async function settled(): Promise<Snapshot> {
  let latest: Snapshot | null = null
  function Probe() {
    const value = useSupabase()
    latest = {
      canWrite: value.canWrite,
      isServiceAccount: value.isServiceAccount,
      canAgent: value.canAgent,
      isLoading: value.isLoading,
    }
    return null
  }
  render(
    <SupabaseProvider>
      <Probe />
    </SupabaseProvider>,
  )
  await waitFor(() => {
    expect(latest?.isLoading).toBe(false)
  })
  return latest as unknown as Snapshot
}

beforeEach(() => {
  seamAnswer = false
  currentSession = null
  devAuthoringKey = false
  rpcCalls = 0
})

afterEach(() => {
  cleanup()
})

describe('the editing tier, with the optional recipe applied', () => {
  // The strict database: the seam reads the role claim server-side, so it
  // answers `true` only for an account somebody stamped.
  it('gives an anonymous visitor no write gate, and asks nothing', async () => {
    const value = await settled()

    expect(value.canWrite).toBe(false)
    expect(value.isServiceAccount).toBe(false)
    expect(value.canAgent).toBe(false)
    expect(rpcCalls).toBe(0)
  })

  it('gives a stamped account the write gate', async () => {
    currentSession = signedIn('service')
    seamAnswer = true

    const value = await settled()

    expect(value.canWrite).toBe(true)
    expect(value.isServiceAccount).toBe(true)
  })

  it('gives a role-less account the board and the agent, and no write gate', async () => {
    // Reading the missing claim as consent is what used to hand this session
    // the whole editing UI over a database that refuses every save.
    currentSession = signedIn()
    seamAnswer = false

    const value = await settled()

    expect(value.canWrite).toBe(false)
    expect(value.isServiceAccount).toBe(false)
    expect(value.canAgent).toBe(true)
  })

  it('takes the database over a role claim that disagrees with it', async () => {
    // A stamped account holding a token minted before somebody un-stamped
    // it, or a claim set by hand on a deployment whose seam reads something
    // else. Postgres refuses the save either way, so the button goes.
    currentSession = signedIn('service')
    seamAnswer = false

    const value = await settled()

    expect(value.canWrite).toBe(false)
    expect(value.isServiceAccount).toBe(false)
  })
})

describe('the editing tier, with the recipe skipped or deleted', () => {
  // The permissive database: the seam is still `select true`, so every
  // signed-in session edits — the template default, kept.
  it('gives a role-less account the write gate', async () => {
    currentSession = signedIn()
    seamAnswer = true

    const value = await settled()

    expect(value.canWrite).toBe(true)
    expect(value.isServiceAccount).toBe(true)
  })

  it('still gives an anonymous visitor nothing', async () => {
    // The seam would answer `true` here — it is granted to anon and returns
    // a constant. A visitor is settled without asking it.
    seamAnswer = true

    const value = await settled()

    expect(value.canWrite).toBe(false)
    expect(rpcCalls).toBe(0)
  })
})

describe('the service-role key', () => {
  it('writes without a session, and without the database saying so', async () => {
    // Its JWT carries no app_metadata at all, so the strict seam answers
    // `false` for it. The key bypasses RLS, which is why this arm is held
    // apart from the tier the database reports.
    devAuthoringKey = true
    seamAnswer = false

    const value = await settled()

    expect(value.canWrite).toBe(true)
    expect(value.isServiceAccount).toBe(true)
    expect(rpcCalls).toBe(0)
  })
})
