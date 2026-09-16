// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest'

/**
 * THE STORED PROVIDER, WHICH IS AN ID FROM WHENEVER IT WAS SAVED.
 *
 * `provider` is chosen once and then sits in a browser for as long as that
 * browser lasts, so the release that reads it is rarely the release that wrote
 * it. A release that retires a provider therefore meets browsers holding its
 * id — with a key saved beside it, so the no-key gate passes — and the loop
 * indexes its adapter map with that id and sends on `undefined`.
 *
 * Nothing but this reader is in a position to notice: every consumer downstream
 * has a typed `AgentProviderId` and believes it. The cases below load a fresh
 * module graph each time, because the settings are read while the module
 * evaluates to seed the store's first snapshot.
 */
beforeEach(() => {
  vi.resetModules()
  window.localStorage.clear()
})

/** The settings as the app sees them, out of a graph that has just booted. */
async function bootedSettings() {
  const { renderHook } = await import('@testing-library/react')
  const { useAgentSettings } = await import('@/lib/agent/settings')
  return renderHook(() => useAgentSettings()).result.current
}

async function store(settings: unknown) {
  const { storageKey } = await import('@/lib/storageNamespace')
  window.localStorage.setItem(storageKey('agent-settings'), JSON.stringify(settings))
}

describe('the stored provider', () => {
  it('is kept when it is one this build declares', async () => {
    await store({ provider: 'anthropic', models: {}, keys: { anthropic: 'k' } })

    expect((await bootedSettings()).provider).toBe('anthropic')
  })

  it('reads as the default when it is an id this build no longer has', async () => {
    // A key beside it, because that is the case that reaches the adapter map:
    // without one the composer stops at the no-key hint instead.
    await store({ provider: 'retired', models: {}, keys: { retired: 'k' } })

    expect((await bootedSettings()).provider).toBe('google')
  })

  it('reads as the default when it is not a string at all', async () => {
    await store({ provider: { id: 'google' }, models: {}, keys: {} })

    expect((await bootedSettings()).provider).toBe('google')
  })

  it('leaves the models and keys beside it alone', async () => {
    // The provider is the only field validated here, and a person who saved a
    // key under a provider that came back should not lose the rest with it.
    await store({ provider: 'retired', models: { google: 'gemini-3.7-flash' }, keys: { google: 'k' } })

    const settings = await bootedSettings()
    expect(settings.models.google).toBe('gemini-3.7-flash')
    expect(settings.keys.google).toBe('k')
  })
})
