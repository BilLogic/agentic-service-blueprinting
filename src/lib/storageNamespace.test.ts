// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest'

/**
 * The namespace seam, and specifically its TIMING — the part a
 * `DeploymentConfig` field could not have honoured.
 *
 * Every case reloads the module graph (`vi.resetModules`) and imports
 * dynamically, because the thing under test is what a module records while it
 * evaluates. A static import at the top of this file would settle the prefix
 * once for the whole suite and prove nothing.
 */

beforeEach(() => {
  vi.resetModules()
  window.localStorage.clear()
})

describe('the storage namespace', () => {
  it('ships as the template prefix, and keys take it', async () => {
    const { STORAGE_PREFIX, currentStoragePrefix, storageKey } = await import(
      '@/lib/storageNamespace'
    )
    expect(STORAGE_PREFIX).toBe('sb-')
    expect(currentStoragePrefix()).toBe('sb-')
    expect(storageKey('agent-settings')).toBe('sb-agent-settings')
  })

  it('a host names its own, and every later key takes it', async () => {
    const { configureStorageNamespace, storageKey } = await import(
      '@/lib/storageNamespace'
    )
    configureStorageNamespace('acme-')
    expect(storageKey('agent-settings')).toBe('acme-agent-settings')
  })

  /**
   * The case the seam exists for. `mobilePathMemory` builds its key at MODULE
   * SCOPE, so this is the whole ordering contract in one assertion: configure,
   * then import, and the module that never mentions a prefix writes under the
   * host's.
   */
  it('reaches a module that builds its key while it evaluates', async () => {
    const { configureStorageNamespace } = await import('@/lib/storageNamespace')
    configureStorageNamespace('acme-')

    const { writeLastViewedPath } = await import('@/lib/mobilePathMemory')
    writeLastViewedPath('scenario-1', 'path-1')

    expect(window.localStorage.getItem('acme-mobile-paths')).toBe(
      '{"scenario-1":"path-1"}',
    )
    expect(window.localStorage.getItem('sb-mobile-paths')).toBeNull()
  })

  it('a late change throws instead of splitting the namespace in two', async () => {
    const { configureStorageNamespace, storageKey } = await import(
      '@/lib/storageNamespace'
    )
    // Whatever imported the app already asked for a key.
    expect(storageKey('agent-sessions')).toBe('sb-agent-sessions')
    expect(() => configureStorageNamespace('acme-')).toThrow(
      /already in use as "sb-"/,
    )
    // And the app keeps running on the prefix its keys were built with.
    expect(storageKey('agent-sessions')).toBe('sb-agent-sessions')
  })

  it('repeating the same prefix is a no-op, however late', async () => {
    const { configureStorageNamespace, storageKey } = await import(
      '@/lib/storageNamespace'
    )
    configureStorageNamespace('acme-')
    expect(storageKey('agent-settings')).toBe('acme-agent-settings')
    expect(() => configureStorageNamespace('acme-')).not.toThrow()
  })

  it('refuses a prefix that namespaces nothing', async () => {
    const { configureStorageNamespace } = await import('@/lib/storageNamespace')
    expect(() => configureStorageNamespace('')).toThrow(/cannot be empty/)
  })
})
