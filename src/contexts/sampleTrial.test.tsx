// @vitest-environment jsdom
import { cleanup, render } from '@testing-library/react'
import { act } from 'react'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { AgentTrialBanner } from '@/components/editor/AgentTrialBanner'
import { SupabaseProvider, useSupabase } from '@/contexts/SupabaseProvider'
import { saveAgentSettings } from '@/lib/agent/settings'

/**
 * The no-database trial, pinned.
 *
 * With nothing configured the canvas already renders the bundled sample
 * blueprint, so the only thing standing between a visitor and a working agent
 * is a key. Saving one opens the agent READ-ONLY against that sample — there
 * is no database for it to write to, and `canAgentWrite` has to say so no
 * matter what else is true of the session.
 *
 * These tests run with NO Supabase env, which IS the trial's condition, so
 * the provider is used unmocked: `configured` is false because it genuinely
 * is. The two provider suites beside this one mock `@/lib/supabase` to pin
 * the configured postures instead.
 *
 * This lived in the developer portal's suite while the portal was part of
 * shared source, because the portal's tests already ran in exactly this
 * condition. The portal has left; this is the application's contract and
 * stays with the application.
 */

type Snapshot = Record<string, unknown>

function Probe({ onRender }: { onRender: (value: Snapshot) => void }) {
  onRender(useSupabase() as unknown as Snapshot)
  return null
}

function readContext(): Snapshot {
  let latest: Snapshot = {}
  render(
    <SupabaseProvider>
      <Probe
        onRender={(value) => {
          latest = value
        }}
      />
    </SupabaseProvider>,
  )
  return latest
}

beforeEach(() => {
  window.localStorage.clear()
  act(() => {
    saveAgentSettings({ provider: 'google', keys: { google: '' } })
  })
})

afterEach(cleanup)

describe('the no-database agent trial', () => {
  it('stays closed with no key, and opens read-only once a key is saved', () => {
    const before = readContext()
    expect(before.isSampleTrial).toBe(false)
    expect(before.canAgent).toBe(false)
    cleanup()

    act(() => {
      saveAgentSettings({ keys: { google: 'test-key-not-a-real-one' } })
    })
    const after = readContext()
    expect(after.isSampleTrial).toBe(true)
    expect(after.canAgent).toBe(true)
    // The agent opens; it does NOT gain write tools. There is no database.
    expect(after.canAgentWrite).toBe(false)
  })
})

describe('the trial banner', () => {
  it('says sample, read-only, and what would change it, in one line', () => {
    render(<AgentTrialBanner />)
    const banner = document.querySelector('[data-agent-trial-banner]')
    expect(banner).not.toBeNull()
    expect(banner?.textContent).toContain('Sample data, read-only.')
    expect(banner?.textContent).toContain('Connect a database to author.')
    // One line: the paragraph that used to explain the trial is now the ⓘ.
    expect(banner?.textContent).not.toContain('bundled sample blueprint')
  })
})
