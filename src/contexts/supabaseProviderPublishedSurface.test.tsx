// @vitest-environment jsdom
import { cleanup, render } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { SupabaseProvider, useSupabase } from '@/contexts/SupabaseProvider'

/**
 * The published session surface is a closed set.
 *
 * Surfaces may ask `canWrite`. They may not ask the tier. ADR 0011 is the
 * ruling; this file is the pin that fails by naming it rather than by
 * restating the key list.
 */

vi.mock('@/lib/supabase', () => ({
  isSupabaseConfigured: () => false,
  hasDevAuthoringKey: () => false,
  hasDevAuthoringUi: () => false,
  devLoginCredentials: () => null,
  createSupabaseClient: () => null,
}))

/** The keys ADR 0011 publishes. Sorted so a missing or extra key is obvious. */
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
  it('publishes exactly the keys ADR 0011 names, and not the tier', () => {
    const keys = publishedKeys()
    expect(
      keys,
      keys.includes('isServiceAccount')
        ? 'isServiceAccount is not a published flag — surfaces ask canWrite. See docs/adr/0011-one-question-a-surface-may-ask.md.'
        : 'Published session keys drifted from ADR 0011. See docs/adr/0011-one-question-a-surface-may-ask.md.',
    ).toEqual([...PUBLISHED_KEYS])
  })
})
