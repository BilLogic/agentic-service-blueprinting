import { describe, expect, it, vi } from 'vitest'
import { coverCanvasAction } from '@/lib/coverOpenAction'
import type { NavItem } from '@/types/nav'

const PHASE: NavItem = { id: 'phase-1', index: 0, label: 'Setup' }
const SCENARIO: NavItem = {
  id: 'scenario-1',
  index: 1,
  label: 'Before Students Join',
  parentId: 'phase-1',
}

describe('coverCanvasAction', () => {
  it('enters the overview canvas on desktop', () => {
    const enterCanvas = vi.fn()
    const openScenario = vi.fn()
    coverCanvasAction({
      mobile: false,
      slides: [PHASE, SCENARIO],
      enterCanvas,
      openScenario,
    })()
    expect(enterCanvas).toHaveBeenCalledOnce()
    expect(openScenario).not.toHaveBeenCalled()
  })

  it('opens the first scenario of the first phase on a phone, drawer closed', () => {
    const enterCanvas = vi.fn()
    const openScenario = vi.fn()
    coverCanvasAction({
      mobile: true,
      slides: [PHASE, SCENARIO],
      enterCanvas,
      openScenario,
    })()
    expect(openScenario).toHaveBeenCalledOnce()
    expect(openScenario).toHaveBeenCalledWith('scenario-1', { closeNav: true })
    expect(enterCanvas).not.toHaveBeenCalled()
  })
})
