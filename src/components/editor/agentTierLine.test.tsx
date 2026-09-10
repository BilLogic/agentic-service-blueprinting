// @vitest-environment jsdom
/**
 * The line the editing tier draws around the agent, from both sides.
 *
 * A regular creator and an admin see the SAME settings popover — the same
 * provider, model and API-key rows. That is a decision, not an oversight:
 * the agent is a reading tool, someone who cannot edit a blueprint still
 * needs to ask questions of it, and the key is the creator's own, pasted
 * into their own browser and spending their own quota. Tier gates writing,
 * not asking.
 *
 * Which is why both halves are asserted here rather than in two files. The
 * surface is identity-gated (`canAgent`) and the agent's write tools are
 * tier-gated (`canAgentWrite`), and reading either one alone makes the other
 * look like the bug. A tier check added to the settings surface fails the
 * first half of this with the ruling in the message; a write tool handed to
 * a regular creator fails the second.
 *
 * This renders the real provider over a fake client, so the gate under test
 * is the shipped derivation and not a stub of it.
 */
import { cleanup, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { AgentSettingsFields } from '@/components/editor/AgentSettingsFields'
import { SupabaseProvider, useSupabase } from '@/contexts/SupabaseProvider'

const KEEPS_THE_AGENT =
  'A regular creator keeps the agent settings — the agent is a reading tool ' +
  'and the key is theirs. Tier gates writing, not asking. Changing this is ' +
  'changing that decision, not fixing a missed gate.'

const KEEPS_NO_WRITE_TOOLS =
  'Tier gates writing: a regular creator may configure the agent and ask it ' +
  'anything, and the agent that answers holds read tools only.'

/** What `is_service_account()` answers for the session under test. */
let seamAnswer = false
let currentSession: unknown = null

vi.mock('@/lib/supabase', () => ({
  isSupabaseConfigured: () => true,
  hasDevAuthoringKey: () => false,
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
    rpc: async () => ({ data: seamAnswer, error: null }),
  }),
}))

/** The agent half of the settings column, in the order it renders. */
const AGENT_SETTINGS_ROWS = ['Provider', 'Model', 'API key']

type Flags = { canAgent: boolean; canAgentWrite: boolean; isLoading: boolean }

/** Sign in as a creator of `tier` and open the settings surface. */
async function settingsFor(tier: 'regular' | 'admin'): Promise<Flags> {
  seamAnswer = tier === 'admin'
  currentSession = {
    access_token: 'token',
    user: { id: 'user-1', app_metadata: {} },
  }
  let latest: Flags | null = null
  function ReadFlags() {
    const value = useSupabase()
    latest = {
      canAgent: value.canAgent,
      canAgentWrite: value.canAgentWrite,
      isLoading: value.isLoading,
    }
    return null
  }
  render(
    <SupabaseProvider>
      <ReadFlags />
      <AgentSettingsFields />
    </SupabaseProvider>,
  )
  // The tier is asked over the wire; nothing is settled until it answers.
  await waitFor(() => {
    expect(latest?.isLoading).toBe(false)
  })
  return latest as unknown as Flags
}

/** Which of the agent rows are on screen, in render order. */
function renderedRows(): string[] {
  return AGENT_SETTINGS_ROWS.filter((row) => screen.queryByText(row) !== null)
}

beforeEach(() => {
  seamAnswer = false
  currentSession = null
  window.localStorage.clear()
})

afterEach(cleanup)

describe('a regular creator and the agent', () => {
  it('configures it and asks it, and gets no write tools for doing so', async () => {
    const flags = await settingsFor('regular')

    expect(flags.canAgent, KEEPS_THE_AGENT).toBe(true)
    expect(renderedRows(), KEEPS_THE_AGENT).toEqual(AGENT_SETTINGS_ROWS)
    expect(flags.canAgentWrite, KEEPS_NO_WRITE_TOOLS).toBe(false)
  })

  it('sees what an admin sees, and the write tools are the whole difference', async () => {
    const flags = await settingsFor('admin')

    expect(renderedRows(), KEEPS_THE_AGENT).toEqual(AGENT_SETTINGS_ROWS)
    expect(flags.canAgentWrite).toBe(true)
  })
})
