// @vitest-environment jsdom
/**
 * Two badges on one slide must open two different cells.
 *
 * Every badge used to call the same no-argument handler, so they all opened
 * the slice and none of them the cell they named. The badges still open the
 * slice tab — a tab descriptor carries no cell — and each one leaves a
 * pending focus for its own cell, consumed when the slice viewport
 * registers.
 */
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { SliceBlueprint } from '@/hooks/useSliceBlueprint'
import type { BlueprintData } from '@/types/blueprint'
import type { Slice, Slide } from '@/types/database'

const SLICE_ID = 'slice-badges'
const CELL_A = 'cell-alpha'
const CELL_B = 'cell-beta'

const openTab = vi.hoisted(() => vi.fn())

vi.mock('@/contexts/viewStateStore', () => ({
  useViewState: () => ({
    openTab,
    reportPresentSlide: () => {},
    restoredSlide: null,
    consumeRestoredSlide: () => {},
  }),
}))

const slice: Slice = {
  id: SLICE_ID,
  title: 'Two-cell readout',
  kind: 'journey',
  actor: null,
  created_at: '2026-01-01T00:00:00Z',
  created_by: null,
  summary: 'A slide with two cited cells.',
  locale: 'en',
  authorship: 'human',
  position: 0,
  service_id: 'svc-1',
  updated_at: '2026-01-01T00:00:00Z',
}

const slide: Slide = {
  id: 'slide-1',
  title: 'Both cells',
  cell_ids: [CELL_A, CELL_B],
  cell_keys: [],
  created_at: '2026-01-01T00:00:00Z',
  created_by: null,
  caption: null,
  position: 0,
  shows_all_images: true,
  slice_id: SLICE_ID,
  updated_at: '2026-01-01T00:00:00Z',
}

const blueprint = {
  path: {
    id: 'p-1',
    name: 'Happy',
    summary: null,
    note: null,
    kind: 'happy',
    status: 'live',
  },
  lanes: [{ id: 'l-1', name: 'Lane', role: null, position: 0 }],
  steps: [
    { id: 'st-1', name: 'One', position: 1 },
    { id: 'st-2', name: 'Two', position: 2 },
  ],
  cells: [
    {
      id: CELL_A,
      lane_id: 'l-1',
      step_id: 'st-1',
      content: 'Greet the guest',
      frame: null,
      summary: null,
    },
    {
      id: CELL_B,
      lane_id: 'l-1',
      step_id: 'st-2',
      content: 'Hand over the keys',
      frame: null,
      summary: null,
    },
  ],
  dependencies: [],
} as BlueprintData

const sliceBlueprint: SliceBlueprint = {
  result: { status: 'ready', data: { slice, items: [slide] }, source: 'fallback' },
  detail: { slice, items: [slide] },
  items: [slide],
  cellIds: [CELL_A, CELL_B],
  scenarioResult: { status: 'ready', data: 'scenario-1', source: 'fallback' },
  scenarioId: 'scenario-1',
  blueprint,
  blueprintsLoading: false,
}

vi.mock('@/hooks/useSliceBlueprint', () => ({
  useSliceBlueprint: () => sliceBlueprint,
}))

import { SlicePresentation } from '@/components/editor/SlicePresentation'
import {
  clearPendingSliceCellFocus,
  registerFocusCells,
  sliceFocusCellsKey,
  type FocusCellsFn,
} from '@/lib/canvasFocusCells'

afterEach(() => {
  cleanup()
  openTab.mockClear()
  clearPendingSliceCellFocus()
})

/**
 * A `focusCells` stand-in that records the cell ids it was asked to fly to.
 */
function recordingFocus(): {
  focus: FocusCellsFn
  calls: string[][]
} {
  const calls: string[][] = []
  const focus: FocusCellsFn = (cellIds) => {
    calls.push([...cellIds])
    return { kind: 'flown', completion: 'completed' }
  }
  return { focus, calls }
}

describe('presentation cell badges', () => {
  it('opens two different cells, and names the action on each badge', () => {
    const { focus, calls } = recordingFocus()
    const remove = registerFocusCells(sliceFocusCellsKey(SLICE_ID), focus)
    render(<SlicePresentation sliceId={SLICE_ID} onReturn={() => {}} />)

    const greet = screen.getByRole('button', {
      name: 'Open Greet the guest in the slice',
    })
    const keys = screen.getByRole('button', {
      name: 'Open Hand over the keys in the slice',
    })
    fireEvent.click(greet)
    fireEvent.click(keys)

    expect(calls).toEqual([[CELL_A], [CELL_B]])
    expect(openTab).toHaveBeenCalledTimes(2)
    expect(openTab).toHaveBeenNthCalledWith(1, {
      kind: 'slice',
      sliceId: SLICE_ID,
    })
    expect(openTab).toHaveBeenNthCalledWith(2, {
      kind: 'slice',
      sliceId: SLICE_ID,
    })
    remove()
  })

  it('lands the focus after the slice viewport registers, when the tab was not already open', () => {
    const { focus, calls } = recordingFocus()
    render(<SlicePresentation sliceId={SLICE_ID} onReturn={() => {}} />)

    fireEvent.click(
      screen.getByRole('button', {
        name: 'Open Greet the guest in the slice',
      }),
    )
    expect(calls).toEqual([])
    expect(openTab).toHaveBeenCalledWith({ kind: 'slice', sliceId: SLICE_ID })

    const remove = registerFocusCells(sliceFocusCellsKey(SLICE_ID), focus)
    expect(calls).toEqual([[CELL_A]])
    remove()
  })
})
