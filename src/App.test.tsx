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

// The deployment seam, end to end: a host mounts the same App with a config,
// and the wordmark is the host's. Module-level, as a host should pass it — an
// inline literal is a new object every render.
const hostConfig = { brand: { name: 'Acme Service Design' } }

describe('App (mounted by a deployment)', () => {
  it('renders the deployment brand in the app chrome', async () => {
    render(<App config={hostConfig} />)
    expect(await screen.findAllByText(hostConfig.brand.name)).not.toHaveLength(0)
    // Only the wordmark reads the seam today; the cover's own heading still
    // carries the template name until `content` is wired. Asserting its
    // absence here would pin a surface the seam does not yet own.
  })
})
