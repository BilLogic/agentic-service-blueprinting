// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from 'vitest'
import {
  getAgentServiceScopeMode,
  saveAgentSettings,
  serviceScopeMode,
} from '@/lib/agent/settings'
import { storageKey } from '@/lib/storageNamespace'

/*
 * The creator's default-scope config. It replaces the old hardcoded
 * single-service cache: the agent no longer assumes one service, it defaults to
 * the active one unless the creator opts the whole deployment in.
 */

beforeEach(() => {
  window.localStorage.clear()
  saveAgentSettings({ serviceScope: 'active' })
})

describe('agent default service scope', () => {
  it('defaults to the active service', () => {
    expect(getAgentServiceScopeMode()).toBe('active')
    expect(serviceScopeMode({ provider: 'google', models: {}, keys: {}, serviceScope: 'active' })).toBe(
      'active',
    )
  })

  it('the creator can widen the default to all services, and it persists', () => {
    saveAgentSettings({ serviceScope: 'all' })
    expect(getAgentServiceScopeMode()).toBe('all')
    // Written through to storage under the same key the rest of the settings use.
    const stored = JSON.parse(window.localStorage.getItem(storageKey('agent-settings')) ?? '{}')
    expect(stored.serviceScope).toBe('all')
  })

  it('a legacy settings blob with no scope reads as active, not undefined', () => {
    // A key saved before this field existed must not resolve to a broken scope.
    expect(
      serviceScopeMode({ provider: 'google', models: {}, keys: {} } as never),
    ).toBe('active')
  })
})
