// @vitest-environment jsdom
/**
 * The theme switch, and the branch it no longer has.
 *
 * This component used to render a disabled placeholder on its first pass,
 * because the library it ran on resolved the theme in an effect and so knew
 * nothing on that pass. The theme is now read while the import graph
 * evaluates, which is why the placeholder went — and that premise is the thing
 * worth holding down here, because it is the one a future change could quietly
 * break. So every case seeds storage FIRST and imports afterwards, the way the
 * app's own import graph runs, and asserts on the FIRST render rather than
 * whatever the last one settled on.
 */
import { cleanup, act, fireEvent, render, screen } from '@testing-library/react'
import { renderToStaticMarkup } from 'react-dom/server'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { TooltipProvider } from '@/components/ui/tooltip'

/** The template's own prefix. Spelled out to prove the key arrived through it. */
const STORED_KEY = 'sb-theme'

/** A `matchMedia` that answers "no dark preference" and never changes. */
function stubMatchMedia() {
  window.matchMedia = ((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  })) as unknown as typeof window.matchMedia
}

/** Mount the toggle, importing it only now so the seeded storage is what it reads. */
async function mount() {
  const { ThemeToggle } = await import('@/components/editor/ThemeToggle')
  return render(
    <TooltipProvider>
      <ThemeToggle />
    </TooltipProvider>,
  )
}

const toggle = () => screen.getByRole('button')
/** What the control offers to do next — the only visible trace of the theme. */
const offer = () => toggle().getAttribute('aria-label')

beforeEach(() => {
  vi.resetModules()
  window.localStorage.clear()
  document.documentElement.className = ''
  document.documentElement.style.colorScheme = ''
  stubMatchMedia()
})

afterEach(cleanup)

describe('the first render', () => {
  /*
   * Rendered to STATIC MARKUP, which is one pass with no effects and no
   * commit — the only way to say "first render" and mean it. `render()` has
   * already flushed effects by the time an assertion runs, so it cannot tell
   * a synchronous answer apart from one an effect supplied a tick later. That
   * distinction is the entire premise on which the placeholder this component
   * used to render was removed.
   */
  it('knows a stored dark theme before any effect has run', async () => {
    window.localStorage.setItem(STORED_KEY, 'dark')
    const { ThemeToggle } = await import('@/components/editor/ThemeToggle')
    const html = renderToStaticMarkup(
      <TooltipProvider>
        <ThemeToggle />
      </TooltipProvider>,
    )
    expect(html).toContain('aria-label="Switch to light theme"')
    // The sun, because the page is already dark. The placeholder drew neither
    // glyph, so naming one is what separates "resolved" from "not yet known".
    expect(html).toContain('lucide-sun')
    // `disabled=""`, the attribute — the bare word also appears in a dozen
    // `disabled:` class names on this button.
    expect(html).not.toContain('disabled=')
  })

  it('is live once mounted, not a placeholder waiting for an effect', async () => {
    window.localStorage.setItem(STORED_KEY, 'dark')
    await mount()
    expect(offer()).toBe('Switch to light theme')
    expect(toggle().hasAttribute('disabled')).toBe(false)
  })

  it('opens light when nothing is stored', async () => {
    await mount()
    expect(offer()).toBe('Switch to dark theme')
  })
})

describe('choosing a theme', () => {
  it('writes the opposite through the namespaced key and repaints the root', async () => {
    await mount()
    fireEvent.click(toggle())
    expect(window.localStorage.getItem(STORED_KEY)).toBe('dark')
    expect(document.documentElement.classList.contains('dark')).toBe(true)
    expect(offer()).toBe('Switch to light theme')
  })

  it('leaves the bare key the old library used untouched', async () => {
    await mount()
    fireEvent.click(toggle())
    expect(window.localStorage.getItem('theme')).toBeNull()
  })
})

describe('a second tab', () => {
  it('follows a theme chosen elsewhere, with no click here', async () => {
    await mount()
    expect(offer()).toBe('Switch to dark theme')

    act(() => {
      window.localStorage.setItem(STORED_KEY, 'dark')
      window.dispatchEvent(
        new StorageEvent('storage', { key: STORED_KEY, newValue: 'dark' }),
      )
    })

    expect(offer()).toBe('Switch to light theme')
  })
})
