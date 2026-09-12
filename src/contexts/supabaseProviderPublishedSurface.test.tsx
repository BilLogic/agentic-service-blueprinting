// @vitest-environment jsdom
import { cleanup, render } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { SupabaseProvider, useSupabase } from '@/contexts/SupabaseProvider'

/**
 * The published session surface is a closed set.
 *
 * Surfaces may ask `canWrite`. They may not ask the tier: the provider still
 * derives it and still folds it into `canWrite`, but it does not put it on
 * the context, because a second exported answer that says
 * almost-but-not-quite the same thing is an invitation to gate on the wrong
 * one. This file is the pin, and it fails by naming that rule rather than by
 * restating the key list.
 */

vi.mock('@/lib/supabase', () => ({
  isSupabaseConfigured: () => false,
  hasDevAuthoringKey: () => false,
  hasDevAuthoringUi: () => false,
  devLoginCredentials: () => null,
  createSupabaseClient: () => null,
}))

/** The published keys. Sorted so a missing or extra key is obvious. */
const PUBLISHED_KEYS = [
  'canAgent',
  'canAgentWrite',
  'canReadPrivate',
  'canWrite',
  'client',
  'configured',
  'devSimulation',
  'isDevAuthoring',
  'isEditPreview',
  'isLoading',
  'isSampleTrial',
  'realCanWrite',
  'session',
] as const

/**
 * Keys currently on the context value, sorted.
 *
 * @returns {string[]} The published surface, not the provider's locals.
 */
function publishedKeys(): string[] {
  let keys: string[] = []
  function Probe() {
    keys = Object.keys(useSupabase()).sort()
    return null
  }
  render(
    <SupabaseProvider>
      <Probe />
    </SupabaseProvider>,
  )
  return keys
}

afterEach(() => {
  cleanup()
})

describe('the published session surface', () => {
  it('publishes exactly the closed set, and not the tier', () => {
    const keys = publishedKeys()
    expect(
      keys,
      keys.includes('isServiceAccount')
        ? 'isServiceAccount is not a published flag. The tier stays local to the provider, which folds it into canWrite; a surface asks canWrite.'
        : 'The published session keys drifted from the closed set. A surface asks canWrite, the tier is never published, and a new flag needs a consumer that is not a test.',
    ).toEqual([...PUBLISHED_KEYS])
  })
})
