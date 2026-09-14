import { describe, expect, it } from 'vitest'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database'
import { readTier } from './identity'

/**
 * What tier is this session in, and who decides.
 *
 * The answer used to be computed from the JWT: a signed-in session with no
 * `role` claim was an editor here and a viewer in a deployment built on this
 * template, from the same line of code, because each side had guessed which
 * database it was talking to. Nothing asserted either guess — rewriting one
 * rule into the other moved no test at all.
 *
 * So these cases pin the rule that replaced them: the database is asked, and
 * its answer is the answer. The last case is the one that says so out loud —
 * a session carrying `role: 'service'` is still a viewer when the database
 * says no.
 */

type Ask = { calls: number }

function clientFor(
  session: unknown,
  seamAnswer: boolean | null,
  ask: Ask = { calls: 0 },
): SupabaseClient<Database> {
  return {
    auth: {
      getSession: async () => ({ data: { session } }),
    },
    rpc: async () => {
      ask.calls += 1
      return seamAnswer === null
        ? { data: null, error: { message: 'unreachable' } }
        : { data: seamAnswer, error: null }
    },
  } as unknown as SupabaseClient<Database>
}

/** A signed-in session, with whatever the recipe did or did not stamp on it. */
function signedIn(role?: string) {
  return {
    access_token: 'token',
    user: { id: 'user-1', app_metadata: role === undefined ? {} : { role } },
  }
}

describe('the tier a session is in, as the database answers it', () => {
  it('answers anon for a visitor with no session, without asking', async () => {
    const ask: Ask = { calls: 0 }
    // The seam's permissive default answers `true` to anyone who calls it,
    // anon included, so asking here would hand a deployed visitor the tier.
    const client = clientFor(null, true, ask)

    expect(await readTier(client)).toBe('anon')
    expect(ask.calls).toBe(0)
  })

  it('answers anon for a signed-in session the database refuses', async () => {
    // The strict posture: the optional tier recipe is applied and this
    // account was never stamped. It reads and chats; it writes nothing.
    expect(await readTier(clientFor(signedIn(), false))).toBe('anon')
  })

  it('answers service for a signed-in session the database allows', async () => {
    // The permissive posture, where the same role-less account edits: the
    // recipe was skipped or deleted, and the seam is still `select true`.
    expect(await readTier(clientFor(signedIn(), true))).toBe('service')
  })

  it('reads the database rather than the role claim', async () => {
    // A stamped account against a database that says no — a revoked editor
    // holding a token minted before the revocation, or a claim an adopter
    // set by hand on a deployment whose seam reads something else. The claim
    // is not consulted, so the answer follows the wall that refuses the write.
    expect(await readTier(clientFor(signedIn('service'), false))).toBe('anon')

    // And the converse: no claim at all, and the database says yes.
    expect(await readTier(clientFor(signedIn(), true))).toBe('service')
  })

  it('answers anon when the ask fails', async () => {
    expect(await readTier(clientFor(signedIn('service'), null))).toBe('anon')
  })
})
