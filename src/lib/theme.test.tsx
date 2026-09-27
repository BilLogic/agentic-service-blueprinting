// @vitest-environment jsdom
import { cleanup, act, render } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { stubMatchMedia } from '@/test/stubMatchMedia'

/**
 * The theme, and specifically WHEN it is applied.
 *
 * The whole point of this module is a side effect that runs while the import
 * graph evaluates, so every case here reloads the graph (`vi.resetModules`)
 * and imports dynamically after seeding storage and the media query. A static
 * import at the top of this file would apply the theme once, before any case
 * had set anything up, and prove nothing about the order.
 */

const root = () => document.documentElement

beforeEach(() => {
  vi.resetModules()
  window.localStorage.clear()
  root().className = ''
  root().style.colorScheme = ''
  stubMatchMedia(false)
})

afterEach(cleanup)

describe('what is stored', () => {
  it('reads the three values it writes, and nothing else', async () => {
    const { parseStoredTheme } = await import('@/lib/theme')
    expect(parseStoredTheme('light')).toBe('light')
    expect(parseStoredTheme('dark')).toBe('dark')
    expect(parseStoredTheme('system')).toBe('system')
    // Absent, hand-edited, or written by a build that knew another name: the
    // default is a correct answer and there is no throw path.
    expect(parseStoredTheme(null)).toBe('system')
    expect(parseStoredTheme('')).toBe('system')
    expect(parseStoredTheme('midnight')).toBe('system')
  })

  it('resolves the choice against the system preference', async () => {
    const { resolveTheme } = await import('@/lib/theme')
    expect(resolveTheme('light', true)).toBe('light')
    expect(resolveTheme('dark', false)).toBe('dark')
    expect(resolveTheme('system', true)).toBe('dark')
    expect(resolveTheme('system', false)).toBe('light')
  })

  it('stores under the namespaced key, never the bare one', async () => {
    const { THEME_STORAGE_KEY, setTheme } = await import('@/lib/theme')
    expect(THEME_STORAGE_KEY).toBe('ub-theme')
    setTheme('dark')
    expect(window.localStorage.getItem('ub-theme')).toBe('dark')
    expect(window.localStorage.getItem('theme')).toBeNull()
  })
})

describe('the class, applied while the module evaluates', () => {
  it('a stored dark theme is on the root once the import returns', async () => {
    window.localStorage.setItem('ub-theme', 'dark')
    const { getTheme } = await import('@/lib/theme')
    // No render, no effect, no tick — just the import.
    expect(root().classList.contains('dark')).toBe(true)
    expect(root().classList.contains('light')).toBe(false)
    expect(root().style.colorScheme).toBe('dark')
    expect(getTheme().resolvedTheme).toBe('dark')
  })

  it('nothing stored follows the system preference', async () => {
    stubMatchMedia(true)
    const { getTheme } = await import('@/lib/theme')
    expect(root().classList.contains('dark')).toBe(true)
    expect(root().style.colorScheme).toBe('dark')
    expect(getTheme().theme).toBe('system')
    expect(getTheme().resolvedTheme).toBe('dark')
  })

  it('nothing stored keeps following the OS as it changes', async () => {
    const media = stubMatchMedia(false)
    const { getTheme } = await import('@/lib/theme')
    expect(getTheme().resolvedTheme).toBe('light')
    media.change(true)
    expect(getTheme().resolvedTheme).toBe('dark')
    expect(root().classList.contains('dark')).toBe(true)
  })

  it('a stored `system` reads the query', async () => {
    window.localStorage.setItem('ub-theme', 'system')
    stubMatchMedia(true)
    const { getTheme } = await import('@/lib/theme')
    expect(root().classList.contains('dark')).toBe(true)
    expect(getTheme().theme).toBe('system')
    expect(getTheme().resolvedTheme).toBe('dark')
  })

  it('applies no inline script to get there', async () => {
    window.localStorage.setItem('ub-theme', 'dark')
    await import('@/lib/theme')
    expect(document.querySelectorAll('script:not([src])')).toHaveLength(0)
  })
})

describe('changing it', () => {
  it('swaps the class, the colour scheme and the stored value', async () => {
    const { setTheme } = await import('@/lib/theme')
    setTheme('dark')
    expect(root().classList.contains('dark')).toBe(true)
    expect(root().classList.contains('light')).toBe(false)
    expect(root().style.colorScheme).toBe('dark')
    expect(window.localStorage.getItem('ub-theme')).toBe('dark')

    setTheme('light')
    expect(root().classList.contains('light')).toBe(true)
    expect(root().classList.contains('dark')).toBe(false)
    expect(root().style.colorScheme).toBe('light')
    expect(window.localStorage.getItem('ub-theme')).toBe('light')
  })

  it('tells its subscribers, and only when the answer moved', async () => {
    const { setTheme, subscribeTheme } = await import('@/lib/theme')
    const heard = vi.fn()
    const unsubscribe = subscribeTheme(heard)
    setTheme('dark')
    expect(heard).toHaveBeenCalledTimes(1)
    setTheme('dark')
    expect(heard).toHaveBeenCalledTimes(1)
    unsubscribe()
    setTheme('light')
    expect(heard).toHaveBeenCalledTimes(1)
  })

  it('keeps following the query while the choice is `system`', async () => {
    window.localStorage.setItem('ub-theme', 'system')
    const media = stubMatchMedia(false)
    const { getTheme } = await import('@/lib/theme')
    expect(getTheme().resolvedTheme).toBe('light')

    media.change(true)
    expect(getTheme().resolvedTheme).toBe('dark')
    expect(root().classList.contains('dark')).toBe(true)
    expect(root().style.colorScheme).toBe('dark')
  })

  it('ignores the query once a theme is chosen outright', async () => {
    window.localStorage.setItem('ub-theme', 'system')
    const media = stubMatchMedia(false)
    const { getTheme, setTheme } = await import('@/lib/theme')
    setTheme('light')

    media.change(true)
    expect(getTheme().resolvedTheme).toBe('light')
    expect(root().classList.contains('light')).toBe(true)
  })

  /** A second tab of the same installation chose a theme. */
  it('follows the key across tabs', async () => {
    const { getTheme } = await import('@/lib/theme')
    expect(getTheme().resolvedTheme).toBe('light')

    window.localStorage.setItem('ub-theme', 'dark')
    window.dispatchEvent(new StorageEvent('storage', { key: 'ub-theme' }))
    expect(getTheme().resolvedTheme).toBe('dark')
    expect(root().classList.contains('dark')).toBe(true)
  })

  it('is deaf to another key moving', async () => {
    const { getTheme } = await import('@/lib/theme')
    window.localStorage.setItem('ub-theme', 'dark')
    window.dispatchEvent(
      new StorageEvent('storage', { key: 'ub-slide-sheet-height' }),
    )
    expect(getTheme().resolvedTheme).toBe('light')
  })
})

describe('toggling', () => {
  it('stores the outright value when the pick departs from the OS', async () => {
    stubMatchMedia(false)
    const { getTheme, toggleTheme } = await import('@/lib/theme')
    toggleTheme()
    expect(getTheme()).toEqual({ theme: 'dark', resolvedTheme: 'dark' })
    expect(window.localStorage.getItem('ub-theme')).toBe('dark')
  })

  it('goes back to following the OS when the pick lands on it', async () => {
    const media = stubMatchMedia(false)
    const { getTheme, toggleTheme } = await import('@/lib/theme')
    toggleTheme()
    toggleTheme()
    expect(getTheme()).toEqual({ theme: 'system', resolvedTheme: 'light' })
    expect(window.localStorage.getItem('ub-theme')).toBe('system')
    // Following, not pinned: the OS flipping now moves the page.
    media.change(true)
    expect(getTheme().resolvedTheme).toBe('dark')
  })

  it('from a stored choice that matches the OS, still flips what is painted', async () => {
    window.localStorage.setItem('ub-theme', 'dark')
    stubMatchMedia(true)
    const { getTheme, toggleTheme } = await import('@/lib/theme')
    toggleTheme()
    expect(getTheme()).toEqual({ theme: 'light', resolvedTheme: 'light' })
    toggleTheme()
    expect(getTheme()).toEqual({ theme: 'system', resolvedTheme: 'dark' })
  })
})

describe('the hook', () => {
  it('knows the resolved theme on its FIRST render — no mounted flag', async () => {
    window.localStorage.setItem('ub-theme', 'dark')
    const { useTheme } = await import('@/lib/theme')
    const renders: (string | undefined)[] = []
    function Probe() {
      const { resolvedTheme } = useTheme()
      renders.push(resolvedTheme)
      return <span data-testid="probe">{resolvedTheme}</span>
    }
    const { getByTestId } = render(<Probe />)
    // The first entry, not the last: the claim is that nothing was ever
    // undefined, which is what let the toggle drop its placeholder.
    expect(renders[0]).toBe('dark')
    expect(getByTestId('probe').textContent).toBe('dark')
  })

  it('re-renders the call site when the theme is set elsewhere', async () => {
    const { setTheme, useTheme } = await import('@/lib/theme')
    function Probe() {
      const { resolvedTheme } = useTheme()
      return <span data-testid="probe">{resolvedTheme}</span>
    }
    const { getByTestId } = render(<Probe />)
    expect(getByTestId('probe').textContent).toBe('light')
    act(() => setTheme('dark'))
    expect(getByTestId('probe').textContent).toBe('dark')
  })
})
