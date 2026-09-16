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
const canvasBlueprintsCalls = vi.hoisted(() => [] as string[][])
/** Whether the cell rows have landed yet, so a test can stage their arrival. */
const cellsArrived = vi.hoisted(() => ({ value: true }))

const LONG_CELL_NAME =
  'Welcome the student with a line long enough that no row could hold it'

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
  useCanvasBlueprints: (scenarioIds: string[]) => {
    canvasBlueprintsCalls.push(scenarioIds)
    return {
      blueprintsByScenario:
        scenarioIds.length > 0 && cellsArrived.value
          ? new Map([
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
                      content: LONG_CELL_NAME,
                      frame: null,
                      summary: null,
                    },
                  ],
                  dependencies: [],
                },
              ],
            ])
          : new Map(),
    }
  },
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
  canvasBlueprintsCalls.length = 0
  cellsArrived.value = true
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

/**
 * Open the palette from the top-nav field and hand back its search input.
 */
async function openPalette(): Promise<HTMLElement> {
  fireEvent.click(screen.getAllByRole('button', { name: 'Jump to…' })[0]!)
  return await screen.findByPlaceholderText('Jump to…')
}

describe('JumpToSearch', () => {
  it('opens from the field, searches, and selects a scenario through the seam', async () => {
    mount()
    const search = await openPalette()
    fireEvent.change(search, { target: { value: 'Before Students' } })
    fireEvent.click(await screen.findByText('Before Students Join'))
    expect(openScenario).toHaveBeenCalledWith('scenario-1', { closeNav: true })
    expect(requestScenarioCellFocus).not.toHaveBeenCalled()
  })

  it('selects a cell through the scenario seam and the cell-focus pipeline', async () => {
    mount()
    const search = await openPalette()
    fireEvent.change(search, { target: { value: 'Welcome the student' } })
    fireEvent.click(await screen.findByText(LONG_CELL_NAME))
    expect(openScenario).toHaveBeenCalledWith('scenario-1', { closeNav: true })
    expect(requestScenarioCellFocus).toHaveBeenCalledWith(
      'scenario-1',
      'cell-1',
      { openDetail: true },
    )
  })

  it('names its dialog for a screen reader', async () => {
    mount()
    await openPalette()
    expect(screen.getByRole('dialog', { name: 'Jump to…' })).toBeTruthy()
  })

  it('holds no cells until a query is typed, and asks for none either', async () => {
    mount()
    const search = await openPalette()
    expect(screen.queryByText(LONG_CELL_NAME)).toBeNull()
    // The heading too: a group over nothing is still a group on screen.
    expect(screen.queryByText('Cells')).toBeNull()
    expect(screen.getByText('Scenarios')).toBeTruthy()
    expect(screen.getByText('Actions')).toBeTruthy()
    expect(canvasBlueprintsCalls.every((ids) => ids.length === 0)).toBe(true)

    fireEvent.change(search, { target: { value: 'W' } })
    expect(await screen.findByText(LONG_CELL_NAME)).toBeTruthy()
    expect(screen.getByText('Cells')).toBeTruthy()
    expect(canvasBlueprintsCalls.at(-1)).toEqual(['scenario-1'])
  })

  it('keeps the highlighted row where it was while cells arrive', async () => {
    cellsArrived.value = false
    const { rerender } = mount()
    const search = await openPalette()
    fireEvent.change(search, { target: { value: 'e' } })
    const highlighted = () =>
      document
        .querySelector('[data-slot="command-item"][aria-selected="true"]')
        ?.textContent?.trim()
    const before = highlighted()
    expect(before).toBeTruthy()

    cellsArrived.value = true
    rerender(
      <TooltipProvider>
        <JumpToSearch />
      </TooltipProvider>,
    )
    expect(await screen.findByText(LONG_CELL_NAME)).toBeTruthy()
    expect(highlighted()).toBe(before)
  })

  it('draws one line per row: the name truncates and the badge does not', async () => {
    mount()
    const search = await openPalette()
    fireEvent.change(search, { target: { value: 'W' } })
    const name = await screen.findByText(LONG_CELL_NAME)
    expect(name.className).toContain('truncate')
    expect(name.className).toContain('min-w-0')
    const badge = screen.getByText('Setup › Before Students Join')
    expect(badge.className).toContain('shrink-0')
  })

  it('clears the query on the first Escape and closes on the second', async () => {
    mount()
    const search = await openPalette()
    fireEvent.change(search, { target: { value: 'Before' } })
    expect((search as HTMLInputElement).value).toBe('Before')

    fireEvent.keyDown(search, { key: 'Escape' })
    expect((search as HTMLInputElement).value).toBe('')
    expect(screen.queryByRole('dialog', { name: 'Jump to…' })).toBeTruthy()

    fireEvent.keyDown(search, { key: 'Escape' })
    expect(screen.queryByRole('dialog', { name: 'Jump to…' })).toBeNull()
  })

  it('leaves ⌘K alone while a text field has focus', async () => {
    mount()
    const field = document.createElement('input')
    document.body.append(field)
    field.focus()
    fireEvent.keyDown(window, { key: 'k', metaKey: true })
    expect(screen.queryByPlaceholderText('Jump to…')).toBeNull()

    field.blur()
    field.remove()
    fireEvent.keyDown(window, { key: 'k', metaKey: true })
    expect(await screen.findByPlaceholderText('Jump to…')).toBeTruthy()
  })
})
