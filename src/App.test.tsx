// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, beforeAll, describe, expect, it } from 'vitest'
import App from './App'
import { ORG_NAME } from './config'

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
