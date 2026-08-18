// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { MobileNavSheet } from '@/components/mobile/MobileNavSheet'
import type { NavItem } from '@/types/nav'

// Render tests for the drawer (ported from uno-blueprint, slices surface
// and rail not carried — this template has one blueprints surface). The
// pinned contract survives: the sheet only reports what was tapped
// (overview, phase expansion, scenario); the shell owns what a tap means
// for the visible surface. The accordion renders scenarios only for
// expanded phases.

const nav = (over: Partial<NavItem> & { id: string; label: string }): NavItem =>
  ({
    index: 0,
    description: '',
    ...over,
  }) as NavItem

const phases = [
  nav({ id: 'ph-1', label: 'Application', index: 1 }),
  nav({ id: 'ph-2', label: 'Onboarding', index: 2 }),
]
const scenarios = [
  nav({ id: 'sc-1', label: 'Discovery', parentId: 'ph-1' }),
  nav({ id: 'sc-2', label: 'Tech Setup', parentId: 'ph-2' }),
]
const slides = [...phases, ...scenarios]
const scenariosByPhase = new Map<string, NavItem[]>([
  ['ph-1', [scenarios[0]]],
  ['ph-2', [scenarios[1]]],
])
const allExpanded = new Set(['ph-1', 'ph-2'])

function renderSheet(over: Partial<Parameters<typeof MobileNavSheet>[0]> = {}) {
  const onSelectOverview = vi.fn()
  const onSelectScenario = vi.fn()
  const onPhaseExpandedChange = vi.fn()
  render(
    <MobileNavSheet
      open
      onOpenChange={() => {}}
      phases={phases}
      scenariosByPhase={scenariosByPhase}
      slides={slides}
      expandedPhaseIds={allExpanded}
      onPhaseExpandedChange={onPhaseExpandedChange}
      isHome={false}
      selectedScenarioId={null}
      onSelectOverview={onSelectOverview}
      onSelectScenario={onSelectScenario}
      {...over}
    />,
  )
  return {
    onSelectOverview,
    onSelectScenario,
    onPhaseExpandedChange,
  }
}

afterEach(cleanup)

describe('MobileNavSheet routing', () => {
  it('a phase label is an accordion header: it toggles and never navigates', () => {
    const h = renderSheet({ expandedPhaseIds: new Set<string>() })
    screen.getByText(/Application/).click()
    expect(h.onPhaseExpandedChange).toHaveBeenCalledWith('ph-1', true)
    expect(h.onSelectScenario).not.toHaveBeenCalled()
    expect(h.onSelectOverview).not.toHaveBeenCalled()
  })

  it('tapping an expanded phase label collapses it', () => {
    const h = renderSheet({ expandedPhaseIds: new Set(['ph-1']) })
    screen.getByText(/Application/).click()
    expect(h.onPhaseExpandedChange).toHaveBeenCalledWith('ph-1', false)
  })

  it('a scenario row reports the scenario and only the scenario', () => {
    const h = renderSheet()
    screen.getByText('Discovery').click()
    expect(h.onSelectScenario).toHaveBeenCalledWith('sc-1')
    expect(h.onSelectOverview).not.toHaveBeenCalled()
  })

  it('the overview row reports overview and nothing else', () => {
    const h = renderSheet()
    screen.getByText('Service overview').click()
    expect(h.onSelectOverview).toHaveBeenCalledTimes(1)
    expect(h.onSelectScenario).not.toHaveBeenCalled()
  })

  it('marks the selected scenario with aria-current', () => {
    renderSheet({ selectedScenarioId: 'sc-2' })
    const row = screen.getByText('Tech Setup').closest('button')
    expect(row?.getAttribute('aria-current')).toBe('true')
  })

  it('marks the overview row only while home is showing', () => {
    renderSheet({ isHome: true })
    const row = screen.getByText('Service overview').closest('button')
    expect(row?.getAttribute('aria-current')).toBe('true')
  })
})

describe('MobileNavSheet accordion', () => {
  it('collapsed phases hide their scenarios', () => {
    renderSheet({ expandedPhaseIds: new Set(['ph-1']) })
    expect(screen.getByText('Discovery')).toBeDefined()
    expect(screen.queryByText('Tech Setup')).toBeNull()
  })

  it('the caret reports an expansion change and nothing else', () => {
    const h = renderSheet({ expandedPhaseIds: new Set(['ph-1']) })
    screen.getByLabelText('Expand Onboarding').click()
    expect(h.onPhaseExpandedChange).toHaveBeenCalledWith('ph-2', true)
    screen.getByLabelText('Collapse Application').click()
    expect(h.onPhaseExpandedChange).toHaveBeenCalledWith('ph-1', false)
    expect(h.onSelectScenario).not.toHaveBeenCalled()
  })
})
