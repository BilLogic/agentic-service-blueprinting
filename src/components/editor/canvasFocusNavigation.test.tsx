// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest'
import { ResizableComparePanel } from '@/components/blueprint/ResizableComparePanel'
import { CanvasPhaseSection } from '@/components/editor/CanvasPhaseSection'

beforeAll(() => {
  vi.stubGlobal(
    'ResizeObserver',
    class {
      observe() {}
      unobserve() {}
      disconnect() {}
    },
  )
})

afterEach(cleanup)

describe('dimmed canvas navigation', () => {
  it('keeps a different scenario clickable and gives hover/focus a visible lift', () => {
    const onNavigate = vi.fn()
    render(
      <ResizableComparePanel
        onNavigate={onNavigate}
        navigateLabel="Open another scenario"
        dimmed
      >
        <div>Scenario contents</div>
      </ResizableComparePanel>,
    )

    const scenario = screen.getByRole('button', {
      name: 'Open another scenario',
    })
    expect(scenario.closest('[inert]')).toBeNull()
    expect(scenario.parentElement?.className).toContain('hover:opacity-70')

    scenario.click()
    expect(onNavigate).toHaveBeenCalledTimes(1)
  })

  it('keeps a different phase clickable and exposes its nested dim state', () => {
    const onNavigate = vi.fn()
    render(
      <CanvasPhaseSection
        title="Onboarding"
        ordinal={2}
        phaseId="phase-onboarding"
        onNavigate={onNavigate}
        dimmed
      >
        <div>Phase contents</div>
      </CanvasPhaseSection>,
    )

    const phase = screen.getByRole('button', {
      name: 'Open Onboarding phase',
    })
    expect(phase.hasAttribute('inert')).toBe(false)
    expect(phase.hasAttribute('data-canvas-focus-dimmed')).toBe(true)
    expect(phase.className).not.toContain('opacity-30')

    phase.click()
    expect(onNavigate).toHaveBeenCalledTimes(1)
  })
})
