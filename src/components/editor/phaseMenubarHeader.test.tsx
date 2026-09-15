// @vitest-environment jsdom
/**
 * The scenario header: a phase crumb, and no query-result message.
 *
 * `ServiceOverviewHeader` owns the query and may print its failure. This bar
 * does not — identity is props. The crumb is the existing trail, mounted
 * before the title with the current page omitted, so clicking the phase
 * name is the navigation that lands on that phase on the overview.
 */
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { PhaseMenubarHeader } from '@/components/editor/PhaseMenubarHeader'
import { COVER_DISCONNECTED_STATUS } from '@/components/cover/CoverPage'
import { EntityDetailProvider } from '@/contexts/EntityDetailContext'
import type { NavItem } from '@/types/nav'

const openDetail = vi.hoisted(() => vi.fn())
const goHome = vi.hoisted(() => vi.fn())

vi.mock('@/contexts/EditorContext', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/contexts/EditorContext')>()),
  useEditor: () => ({
    getScenarioDisplayViewType: () => 'stacked',
    setScenarioDisplayViewType: () => {},
    openDetail,
    goHome,
  }),
}))

const PHASE: NavItem = { id: 'phase-1', index: 0, label: 'Onboarding' }
const SCENARIO: NavItem = {
  id: 'scenario-1',
  index: 1,
  label: 'Employment & Access',
  parentId: 'phase-1',
  summary: 'How tutors join the service.',
}

afterEach(() => {
  cleanup()
  openDetail.mockClear()
  goHome.mockClear()
})

/**
 * The scenario (or phase) bar, inside the provider the title affordance needs.
 */
function mountHeader(slide: NavItem) {
  return render(
    <EntityDetailProvider>
      <PhaseMenubarHeader slide={slide} slides={[PHASE, SCENARIO]} />
    </EntityDetailProvider>,
  )
}

describe('the scenario header', () => {
  it('does not print a query-result message', () => {
    mountHeader(SCENARIO)
    expect(screen.queryByText(COVER_DISCONNECTED_STATUS)).toBeNull()
    expect(screen.queryByText('No database connected')).toBeNull()
    expect(screen.getByText('How tutors join the service.')).toBeTruthy()
    expect(document.body.textContent).not.toMatch(/Supabase/i)
  })

  it('mounts a breadcrumb before the title, and the phase crumb opens that phase', () => {
    mountHeader(SCENARIO)

    const trail = screen.getByRole('navigation', { name: 'breadcrumb' })
    const title = screen.getByText('Employment & Access')
    expect(
      trail.compareDocumentPosition(title) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy()

    fireEvent.click(screen.getByRole('button', { name: 'Onboarding' }))
    expect(openDetail).toHaveBeenCalledTimes(1)
    expect(openDetail).toHaveBeenCalledWith(PHASE.id)
  })

  it('leaves the phase header without a trail', () => {
    mountHeader(PHASE)
    expect(screen.queryByRole('navigation', { name: 'breadcrumb' })).toBeNull()
    expect(screen.getByText('Onboarding')).toBeTruthy()
  })
})
