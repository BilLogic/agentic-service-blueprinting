// @vitest-environment jsdom
import { act, cleanup, render, screen } from '@testing-library/react'
import { afterEach, beforeAll, describe, expect, it } from 'vitest'
import App from './App'
import { ORG_NAME } from './config'
import { coverContent } from './content/coverContent'

/**
 * Smoke render: the whole app mounts against the bundled fallback data with
 * no network and no env vars — the template's zero-config guarantee. If this
 * fails, a clean clone no longer renders.
 */

beforeAll(() => {
  // jsdom lacks the layout/observation APIs the canvas hooks touch.
  window.matchMedia ??= ((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  })) as typeof window.matchMedia
  window.ResizeObserver ??= class {
    observe() {}
    unobserve() {}
    disconnect() {}
  }
  window.IntersectionObserver ??= class {
    root = null
    rootMargin = ''
    thresholds = []
    observe() {}
    unobserve() {}
    disconnect() {}
    takeRecords() {
      return []
    }
  } as unknown as typeof window.IntersectionObserver
})

afterEach(cleanup)

describe('App (fallback render, zero config)', () => {
  it('mounts and shows the app chrome wordmark', async () => {
    render(<App />)
    expect(await screen.findAllByText(ORG_NAME)).not.toHaveLength(0)
  })
})

/**
 * The editor shell itself, rendered — the one surface nothing stood up before.
 *
 * The shape being held is the aside model: ONE aside, in flow at every width,
 * whose width is the whole of what collapse changes. The cover is the shell's
 * collapsed case, so entry from it is also the cheapest way to see the aside
 * open, the rail mount, and the sidebar's panels arrive.
 *
 * Held through the app rather than by mounting `EditorShell` directly: the
 * shell needs the editor, view-state, Supabase and agent providers, and a test
 * that rebuilds that tree is a test about the harness. `App` already assembles
 * it against the bundled fallback data.
 */
describe('the editor shell', () => {
  const aside = () => document.querySelector('[data-editor-sidebar]')

  it('collapses the whole aside on the cover, and opens it on entry', async () => {
    render(<App />)
    // The cover is full-bleed: the aside is mounted, at zero width, with no
    // rail left over — `data-collapsed` says the aside is gone, not narrowed.
    const collapsed = aside()
    expect(collapsed).not.toBeNull()
    expect(collapsed?.getAttribute('data-collapsed')).toBe('')
    expect((collapsed as HTMLElement).style.width).toBe('0px')

    const enter = await screen.findByRole('button', {
      name: coverContent.primaryCtaLabel,
    })
    await act(async () => {
      enter.click()
    })

    const open = aside()
    expect(open?.getAttribute('data-collapsed')).toBeNull()
    expect((open as HTMLElement).style.width).not.toBe('0px')
    // The rail, and the two panels it selects between. ✦ is not among them:
    // it toggles the chat under whichever panel is open.
    expect(document.querySelector('[data-editor-rail]')).not.toBeNull()
    expect(screen.getByRole('button', { name: 'Blueprints' })).toBeDefined()
    expect(screen.getByRole('button', { name: 'Slices' })).toBeDefined()
  })
})
