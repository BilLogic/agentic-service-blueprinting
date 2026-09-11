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

  it('keeps a different phase clickable and dims its parts, not itself', () => {
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
    // Dimming never takes the phase out of reach: nothing on it or above it
    // is inert.
    expect(phase.hasAttribute('inert')).toBe(false)
    expect(phase.closest('[inert]')).toBeNull()
    // The dim is keyed on this marker, and lands on the section's frame,
    // badge and scenarios. The section itself carries no opacity: it is the
    // button, and a translucent button would hold every scenario inside it
    // at its own opacity, so none of them could lift on hover.
    expect(phase.hasAttribute('data-canvas-focus-dimmed')).toBe(true)
    expect(phase.className).not.toMatch(/\bopacity-\d/)

    phase.click()
    expect(onNavigate).toHaveBeenCalledTimes(1)
  })

  it("sets the phase badge on the frame's own left edge", () => {
    const { container } = render(
      <CanvasPhaseSection
        title="Onboarding"
        ordinal={2}
        phaseId="phase-onboarding"
        variant="overview"
      >
        <div>Phase contents</div>
      </CanvasPhaseSection>,
    )

    const frame = container.querySelector<HTMLElement>('[data-phase-frame]')
    const badge = container.querySelector<HTMLElement>(
      '[data-phase-title-badge]',
    )
    // A label that names a container reads as belonging to it only when their
    // edges agree — with a wide band, a badge inset from the frame drifts over
    // the first scenario instead.
    expect(frame?.style.left).toBe('-120px')
    expect(badge?.style.left).toBe(frame?.style.left)
  })
})
