// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { MobileTopBar } from '@/components/mobile/MobileTopBar'

// Pins the top bar (ported from uno-blueprint): the stateful menu toggle
// (☰ ⇄ ✕, aria-expanded, one control opens AND closes) and the contextual
// right slot the shell owns.

afterEach(cleanup)

function renderBar(over: Partial<Parameters<typeof MobileTopBar>[0]> = {}) {
  const onToggleNav = vi.fn()
  render(
    <MobileTopBar
      title="Sample Service"
      navOpen={false}
      onToggleNav={onToggleNav}
      {...over}
    />,
  )
  return { onToggleNav }
}

describe('MobileTopBar', () => {
  it('closed drawer: menu button reads "Open navigation" and is not expanded', () => {
    const h = renderBar({ navOpen: false })
    const button = screen.getByLabelText('Open navigation')
    expect(button.getAttribute('aria-expanded')).toBe('false')
    button.click()
    expect(h.onToggleNav).toHaveBeenCalledTimes(1)
  })

  it('open drawer: the same control reads "Close navigation" and is expanded', () => {
    const h = renderBar({ navOpen: true })
    const button = screen.getByLabelText('Close navigation')
    expect(button.getAttribute('aria-expanded')).toBe('true')
    button.click()
    expect(h.onToggleNav).toHaveBeenCalledTimes(1)
    expect(screen.queryByLabelText('Open navigation')).toBeNull()
  })

  it('renders the contextual right slot the shell provides', () => {
    renderBar({ rightSlot: <span>Happy Path</span> })
    expect(screen.getByText('Happy Path')).toBeDefined()
    expect(screen.getByText('Sample Service')).toBeDefined()
  })
})
