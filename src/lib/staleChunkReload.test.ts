// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  STALE_CHUNK_RELOAD_KEY,
  installStaleChunkReload,
} from '@/lib/staleChunkReload'

/*
 * The recovery a tab that outlived a deploy gets, and the loop it must not
 * get: one reload per session, however many times the chunk goes missing.
 */

let reload: ReturnType<typeof vi.fn>
let uninstall: () => void

beforeEach(() => {
  reload = vi.fn()
  // jsdom's `location.reload` is a real navigation it refuses to perform, so
  // the property is replaced rather than spied.
  Object.defineProperty(window, 'location', {
    configurable: true,
    value: { ...window.location, reload },
  })
  window.sessionStorage.clear()
  uninstall = installStaleChunkReload()
})

afterEach(() => {
  uninstall()
  window.sessionStorage.clear()
})

const preloadError = () =>
  window.dispatchEvent(new Event('vite:preloadError', { cancelable: true }))

describe('the stale chunk listener', () => {
  it('reloads on the first missing chunk', () => {
    preloadError()
    expect(reload).toHaveBeenCalledTimes(1)
  })

  it('does not reload again on the second', () => {
    preloadError()
    preloadError()
    expect(reload).toHaveBeenCalledTimes(1)
  })

  it('remembers the reload in session storage', () => {
    preloadError()
    expect(window.sessionStorage.getItem(STALE_CHUNK_RELOAD_KEY)).not.toBeNull()
  })

  it('takes the error off the window only when it acts on it', () => {
    const first = new Event('vite:preloadError', { cancelable: true })
    window.dispatchEvent(first)
    expect(first.defaultPrevented).toBe(true)
    const second = new Event('vite:preloadError', { cancelable: true })
    window.dispatchEvent(second)
    expect(second.defaultPrevented).toBe(false)
  })

  it('leaves the page alone when storage cannot remember', () => {
    const getItem = vi
      .spyOn(Storage.prototype, 'getItem')
      .mockImplementation(() => {
        throw new Error('storage is blocked')
      })
    preloadError()
    expect(reload).not.toHaveBeenCalled()
    getItem.mockRestore()
  })

  it('stops listening once uninstalled', () => {
    uninstall()
    preloadError()
    expect(reload).not.toHaveBeenCalled()
  })
})
