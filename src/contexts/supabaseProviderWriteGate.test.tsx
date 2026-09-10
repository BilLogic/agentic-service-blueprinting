// @vitest-environment jsdom
import { cleanup, render, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { SupabaseProvider, useSupabase } from '@/contexts/SupabaseProvider'

/**
 * The write gate follows the database, not the token's claim.
 *
 * `canWrite` is what every editing surface reads, and it used to be
 * `app_metadata.role === 'service'` — a guess at what `is_service_account()`
 * would answer. The two can disagree: a role stamped after this token was
 * minted, or a database whose function reads something other than the claim.
 * When they do, the gate says one thing and the database does another.
 *
 * So the provider asks. These pin what each kind of session gets back, and
 * that a visitor with no session costs no round trip at all.
 */

let seamAnswer = false
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
  canAgent: boolean
  isLoading: boolean
}

async function settled(): Promise<Snapshot> {
  let latest: Snapshot | null = null
  function Probe() {
    const value = useSupabase()
    latest = {
      canWrite: value.canWrite,
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

describe('the write gate', () => {
  it('gives a visitor with no session no gate, and asks nothing', async () => {
    const value = await settled()
    expect(value.canWrite).toBe(false)
    expect(value.canAgent).toBe(false)
    expect(rpcCalls).toBe(0)
  })

  it('opens for an account the database calls a service account', async () => {
    currentSession = signedIn('service')
    seamAnswer = true
    const value = await settled()
    expect(value.canWrite).toBe(true)
  })

  it('stays shut for a signed-in account the database does not', async () => {
    currentSession = signedIn()
    seamAnswer = false
    const value = await settled()
    expect(value.canWrite).toBe(false)
    // The board and the agent are still theirs, read-only.
    expect(value.canAgent).toBe(true)
  })

  it('takes the database over a role claim that disagrees with it', async () => {
    // The claim says service; the database does not. The old gate believed
    // the claim and offered saves the database would refuse.
    currentSession = signedIn('service')
    seamAnswer = false
    const value = await settled()
    expect(value.canWrite).toBe(false)
  })

  it('opens for a role-less account when the database says so', async () => {
    // The mirror case, and the one a claim can never reach: a deployment
    // whose seam grants on something other than the role claim.
    currentSession = signedIn()
    seamAnswer = true
    const value = await settled()
    expect(value.canWrite).toBe(true)
  })

  it('writes with a local authoring key without asking anyone', async () => {
    devAuthoringKey = true
    const value = await settled()
    expect(value.canWrite).toBe(true)
    expect(rpcCalls).toBe(0)
  })
})
