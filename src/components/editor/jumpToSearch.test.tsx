// @vitest-environment jsdom
/**
 * The Jump to… field opens a command palette; searching and selecting a
 * scenario or a cell runs the scenario-navigation seam / cell focus.
 */
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest'
import { TooltipProvider } from '@/components/ui/tooltip'

const openScenario = vi.hoisted(() => vi.fn())
const requestScenarioCellFocus = vi.hoisted(() => vi.fn())
const goLanding = vi.hoisted(() => vi.fn())

vi.mock('@/contexts/EditorContext', () => ({
  useEditor: () => ({
    slides: [
      { id: 'phase-1', index: 0, label: 'Setup' },
      {
        id: 'scenario-1',
        index: 1,
        label: 'Before Students Join',
        parentId: 'phase-1',
      },
    ],
    openScenario,
    goLanding,
  }),
}))

vi.mock('@/hooks/useCanvasBlueprints', () => ({
  useCanvasBlueprints: () => ({
    blueprintsByScenario: new Map([
      [
        'scenario-1',
        {
          path: { id: 'p1', name: 'Happy Path', kind: 'happy' },
          lanes: [{ id: 'lane-1', name: 'Frontstage', position: 0 }],
          steps: [{ id: 'step-1', name: 'Arrive', position: 0 }],
          cells: [
            {
              id: 'cell-1',
              lane_id: 'lane-1',
              step_id: 'step-1',
              content: 'Welcome the student',
              frame: null,
              summary: null,
            },
          ],
          dependencies: [],
        },
      ],
    ]),
  }),
}))

vi.mock('@/lib/canvasFocusCells', () => ({
  requestScenarioCellFocus,
}))

vi.mock('@/contexts/CanvasZoomChromeContext', () => ({
  useCanvasZoomChrome: () => null,
}))

vi.mock('next-themes', () => ({
  useTheme: () => ({ resolvedTheme: 'light', setTheme: vi.fn() }),
}))

import { JumpToSearch } from '@/components/editor/JumpToSearch'

beforeAll(() => {
  vi.stubGlobal(
    'ResizeObserver',
    class {
      observe() {}
      unobserve() {}
      disconnect() {}
    },
  )
  Element.prototype.scrollIntoView = vi.fn()
})

afterEach(() => {
  cleanup()
  openScenario.mockClear()
  requestScenarioCellFocus.mockClear()
  goLanding.mockClear()
})

/**
 * Mount the Jump to… control with the app-wide tooltip provider.
 */
function mount() {
  return render(
    <TooltipProvider>
      <JumpToSearch />
    </TooltipProvider>,
  )
}

describe('JumpToSearch', () => {
  it('opens from the field, searches, and selects a scenario', async () => {
    mount()
    fireEvent.click(screen.getAllByRole('button', { name: 'Jump to…' })[0]!)
    const search = await screen.findByPlaceholderText('Jump to…')
    fireEvent.change(search, { target: { value: 'Before Students' } })
    fireEvent.click(await screen.findByText('Before Students Join'))
    expect(openScenario).toHaveBeenCalledWith('scenario-1')
    expect(requestScenarioCellFocus).not.toHaveBeenCalled()
  })

  it('selects a cell through the scenario seam and the cell-focus pipeline', async () => {
    mount()
    fireEvent.click(screen.getAllByRole('button', { name: 'Jump to…' })[0]!)
    const search = await screen.findByPlaceholderText('Jump to…')
    fireEvent.change(search, { target: { value: 'Welcome the student' } })
    fireEvent.click(await screen.findByText('Welcome the student'))
    expect(openScenario).toHaveBeenCalledWith('scenario-1')
    expect(requestScenarioCellFocus).toHaveBeenCalledWith(
      'scenario-1',
      'cell-1',
      { openDetail: true },
    )
  })
})
