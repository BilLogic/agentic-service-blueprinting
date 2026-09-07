// @vitest-environment jsdom
/**
 * A crash inside the board degrades the board.
 *
 * `App.tsx` wraps the whole editor shell in one boundary, and for a throw
 * that comes from a canvas that is the wrong blast radius: the tab strip,
 * the sidebar, the rail and the agent dock all go with it, so one bad view
 * reads as "the app died" and every route back to a working tab disappears
 * along with the broken one. The mobile shell has had a board-scoped
 * boundary since it was built; the desktop shell did not. #57, finding 16.
 *
 * What is asserted here is the property the second boundary buys — chrome
 * beside a throwing child survives, and navigating recovers — because that
 * is what makes the nesting worth having. Whether `EditorShell` is wired
 * this way is not reachable from a unit test: standing the shell up needs
 * Supabase, the query client, the tab store and the agent registries, at
 * which point the test is about the harness. That wiring is verified by
 * hand, in the browser, against a board made to throw.
 */
import { act, cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { EditorErrorBoundary } from '@/components/EditorErrorBoundary'

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})

/** React logs the caught error itself; the tests do not need the noise. */
const quiet = () => vi.spyOn(console, 'error').mockImplementation(() => {})

function Boom({ throws }: { throws: boolean }) {
  if (throws) throw new Error('the canvas fell over')
  return <div>board</div>
}

function Shell({ tab, throws }: { tab: string; throws: boolean }) {
  return (
    <div>
      <nav>tab strip</nav>
      <aside>sidebar</aside>
      <main>
        <EditorErrorBoundary resetKey={tab}>
          <Boom throws={throws} />
        </EditorErrorBoundary>
      </main>
    </div>
  )
}

describe('a board that throws', () => {
  it('leaves the chrome beside it on screen', () => {
    quiet()
    render(<Shell tab="blueprint" throws />)
    expect(screen.getByText('tab strip')).toBeDefined()
    expect(screen.getByText('sidebar')).toBeDefined()
    expect(screen.queryByText('board')).toBeNull()
    expect(screen.getByText('Something went wrong')).toBeDefined()
    expect(screen.getByText('the canvas fell over')).toBeDefined()
  })

  it('recovers when the reader navigates, without a reload', () => {
    quiet()
    const view = render(<Shell tab="blueprint" throws />)
    expect(screen.getByText('Something went wrong')).toBeDefined()
    // A different tab: new content key, new child, error cleared.
    view.rerender(<Shell tab="slice:a" throws={false} />)
    expect(screen.queryByText('Something went wrong')).toBeNull()
    expect(screen.getByText('board')).toBeDefined()
  })

  it('offers a way back in place, for a throw that will not repeat', () => {
    quiet()
    const view = render(<Shell tab="blueprint" throws />)
    const retry = screen.getByRole('button', { name: 'Try again' })
    view.rerender(<Shell tab="blueprint" throws={false} />)
    act(() => retry.click())
    expect(screen.getByText('board')).toBeDefined()
  })
})
