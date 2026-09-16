// @vitest-environment jsdom
/**
 * A throw above the editor shell is a message, not a white page.
 *
 * The editor's boundary sits at the bottom of the tree, under eleven
 * providers, so it can only catch what the shell does. Everything outside it
 * — the deployment seam, the database client, the active service, the two
 * components that reach the address bar and the notice strip — used to take
 * the document to blank with the error in the console, which is the one place
 * a reader is not looking.
 *
 * Two throws are asserted here because they fail for different reasons. A
 * provider that throws is the general case, and is driven by replacing one;
 * the rejected registry loader is the case this package creates on purpose,
 * so it is the one that would be a regression to lose. Why the boundary is
 * where it is: `EditorErrorBoundary`'s class comment.
 *
 * `App` is rendered whole rather than through a stand-in tree: what is under
 * test is where the boundary is wired, and a stand-in would assert the
 * arrangement the test itself wrote. Neither throw mounts the shell, so the
 * cost of the real root is its imports.
 */
import { cleanup, render, screen, waitFor, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { App } from '@/App'
import type { DeploymentConfig } from '@/deploymentConfig'
import { queryClient } from '@/lib/queryClient'

/**
 * The bundled sample is what gates the loader, and a build with no database
 * is the only state that reads one. Mocked rather than driven through the
 * environment for the reason `deploymentSampleLoader.test.tsx` gives: the
 * module reads `import.meta.env` once, when it evaluates.
 */
vi.mock('@/lib/bundledSample', () => ({
  isBundledSampleActive: () => true,
}))

/** Which provider throws is per-test, so the module mock reads a flag. */
const supabase = vi.hoisted(() => ({ throws: false }))
vi.mock('@/contexts/SupabaseProvider', async (importOriginal) => {
  const original =
    await importOriginal<typeof import('@/contexts/SupabaseProvider')>()
  return {
    ...original,
    SupabaseProvider: (props: { children: React.ReactNode }) => {
      if (supabase.throws) throw new Error('no client anywhere')
      return original.SupabaseProvider(props)
    },
  }
})

/** React logs the caught error itself; the test does not need the noise. */
const quiet = () => vi.spyOn(console, 'error').mockImplementation(() => {})

beforeEach(() => {
  supabase.throws = false
})

afterEach(() => {
  cleanup()
  queryClient.clear()
  vi.restoreAllMocks()
})

describe('a throw above the editor shell', () => {
  it('renders the boundary rather than a blank document', () => {
    quiet()
    supabase.throws = true

    render(<App />)

    const card = screen.getByText('Something went wrong').parentElement!
    expect(screen.getByText('no client anywhere')).toBeDefined()
    // The app sentence, not the view one. `scope="app"` is a prop a refactor
    // can drop in silence otherwise: everything else the card renders is the
    // same in both scopes.
    expect(within(card).getByText(/nothing below this point came up/)).toBeDefined()
    expect(within(card).getByRole('button', { name: 'Reload' })).toBeDefined()
  })

  it('renders a message when the blueprint registry loader rejects', async () => {
    quiet()
    const failing: DeploymentConfig = {
      sample: {
        nav: [],
        blueprints: () => Promise.reject(new Error('the chunk never arrived')),
      },
    }

    render(<App config={failing} />)

    await waitFor(() =>
      expect(screen.getByText('the chunk never arrived')).toBeDefined(),
    )
    const card = screen.getByText('Something went wrong').parentElement!
    expect(within(card).getByText(/Reload the page/)).toBeDefined()
    expect(within(card).getByRole('button', { name: 'Reload' })).toBeDefined()
  })
})
