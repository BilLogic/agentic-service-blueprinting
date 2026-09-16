// @vitest-environment jsdom
import { cleanup, fireEvent, render, within } from '@testing-library/react'
import { afterEach, beforeEach, expect, it } from 'vitest'
import { SidebarProvider, useSidebar } from '@/components/ui/sidebar'

/**
 * Toggling the sidebar writes no cookie.
 *
 * The vendored provider used to write its open state to `document.cookie`
 * under a bare `sidebar_state`, which is how upstream tells a SERVER rendering
 * the next request what to pass `defaultOpen`. This app has no such reader —
 * collapse is `EditorShell`'s own state — so the write left an un-namespaced
 * value in the jar every installation on the origin shares, for nobody. It is
 * deleted, and the divergence comment in `sidebar.tsx` says why.
 *
 * The keystroke is the subject rather than `toggleSidebar`, because the
 * keystroke is the only path an app of ours can reach the provider's `setOpen`
 * by: nothing here calls `toggleSidebar`, and the ⌘B handler the provider
 * registers on `window` was what actually wrote the cookie. The state
 * assertion is what keeps the cookie assertion honest — a test where the
 * handler never ran would pass an empty jar for the wrong reason.
 */

beforeEach(() => {
  // jsdom has no `matchMedia`; the desktop posture is the one whose toggle
  // reached `setOpen` at all — the mobile branch keeps its state in React.
  window.matchMedia = ((query: string) => ({
    media: query,
    matches: false,
    addEventListener() {},
    removeEventListener() {},
  })) as unknown as typeof window.matchMedia
})

afterEach(cleanup)

function State() {
  const { state } = useSidebar()
  return <span>{state}</span>
}

it('leaves the cookie jar alone when the keyboard shortcut collapses it', () => {
  const { container } = render(
    <SidebarProvider>
      <State />
    </SidebarProvider>,
  )
  const panel = within(container)
  expect(panel.getByText('expanded')).toBeTruthy()
  expect(document.cookie).toBe('')

  fireEvent.keyDown(window, { key: 'b', metaKey: true })

  // The toggle happened — and the jar is still empty.
  expect(panel.getByText('collapsed')).toBeTruthy()
  expect(document.cookie).toBe('')
})
