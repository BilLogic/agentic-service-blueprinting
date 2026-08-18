// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { MobileTopBar } from '@/components/mobile/MobileTopBar'

// Pins the Phase-3 top bar (plan 2026-08-16-002): the stateful menu toggle
// (☰ ⇄ ✕, aria-expanded, one control opens AND closes) and the bar being
// navigation-only — the agent enters through the FAB, never this bar.

afterEach(cleanup)

function renderBar(over: Partial<Parameters<typeof MobileTopBar>[0]> = {}) {
  const onToggleNav = vi.fn()
  render(
    <MobileTopBar
      title="Intake Call"
      navOpen={false}
      onToggleNav={onToggleNav}
      {...over}
    />,
  )
  return { onToggleNav }
}

describe('MobileTopBar', () => {
  it('carries no agent affordance — the FAB owns that entry', () => {
    renderBar()
    expect(screen.queryByLabelText('Ask the agent')).toBeNull()
  })

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
    expect(screen.getByText('Intake Call')).toBeDefined()
  })
})
