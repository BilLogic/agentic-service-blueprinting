// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, expect, it } from 'vitest'
import { SidebarProvider, useSidebar } from '@/components/ui/sidebar'
import { currentStoragePrefix } from '@/lib/storageNamespace'

/**
 * The sidebar primitive's cookie is namespaced like everything else this app
 * remembers.
 *
 * A cookie jar is shared per ORIGIN, exactly as a storage area is, so the
 * argument in `src/lib/storageNamespace.ts`'s header applies to it unchanged:
 * two installations served from one origin would otherwise write one
 * `sidebar_state`, and collapsing the sidebar in one would collapse it in the
 * other. The name the vendored provider writes therefore comes off
 * `storageKey`, and this is the assertion that says so — the cookie is the one
 * remembered value no `localStorage` test could have covered.
 *
 * The seam's TIMING — configure the prefix, then import the module that builds
 * its key while it evaluates — is `storageNamespace.test.ts`'s subject and is
 * not restated here. This file asks only whether the cookie is on the seam at
 * all, which is what was untrue.
 */

beforeEach(() => {
  // jsdom has no `matchMedia`; the desktop posture is the one that writes the
  // cookie at all — the mobile branch keeps its open state in React alone.
  window.matchMedia = ((query: string) => ({
    media: query,
    matches: false,
    addEventListener() {},
    removeEventListener() {},
  })) as unknown as typeof window.matchMedia
})

afterEach(() => {
  cleanup()
  document.cookie = `${currentStoragePrefix()}sidebar_state=; path=/; max-age=0`
  document.cookie = 'sidebar_state=; path=/; max-age=0'
})

function Collapse() {
  const { toggleSidebar } = useSidebar()
  return <button onClick={toggleSidebar}>collapse</button>
}

it('writes its remembered state under this installation’s prefix', () => {
  render(
    <SidebarProvider>
      <Collapse />
    </SidebarProvider>,
  )

  fireEvent.click(screen.getByRole('button', { name: 'collapse' }))

  expect(document.cookie).toContain(`${currentStoragePrefix()}sidebar_state=`)
  // The bare name is what two installations shared. It is not written at all —
  // matched at a boundary so the namespaced name above does not satisfy it.
  expect(document.cookie).not.toMatch(/(?:^|;\s*)sidebar_state=/)
})
