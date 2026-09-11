// @vitest-environment jsdom
import { render, screen, act, cleanup } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { useState } from 'react'
import {
  BlueprintCellDetailProvider,
  useBlueprintCellDetail,
} from '@/contexts/BlueprintCellDetailContext'
import { getOpenCellId } from '@/lib/openCellStore'

/*
 * LEAVING THE BOARD CLOSES THE CELL PANEL.
 *
 * The board is deliberately never unmounted: a slice tab and a presentation
 * lay a full-bleed surface OVER it so entering one is smooth. The cell drawer
 * lives inside the board, so it stayed on screen over the slides, describing a
 * row nobody could see, with closing it by hand the only way out.
 *
 * The panel already had a reset key. What it tracked was navigation WITHIN a
 * board — the view, the camera target, the focus nonce — so activating a tab
 * changed nothing in it. The tab is part of that key now, which settles the
 * question its placement leaves open: an open cell is a fact about the BOARD,
 * not about the workspace.
 *
 * Tested through the provider's own contract rather than through the shell,
 * because that is where the rule lives: a provider whose key changed must
 * clear, and one whose key merely re-rendered must not.
 */

afterEach(cleanup)

function Harness({ initialKey }: { initialKey: string }) {
  const [resetKey, setResetKey] = useState(initialKey)
  return (
    <BlueprintCellDetailProvider resetKey={resetKey} enabled scenarioId="s1">
      <Panel onNavigate={setResetKey} />
    </BlueprintCellDetailProvider>
  )
}

function Panel({ onNavigate }: { onNavigate: (key: string) => void }) {
  const detail = useBlueprintCellDetail()
  return (
    <div>
      <button
        type="button"
        onClick={() =>
          detail.selectCell({
            scenarioName: 'Warm-Up',
            laneName: 'Tutor',
            stepId: 'step-1',
            stepName: 'Join',
            stepIndex: 0,
            paths: [
              {
                cellId: 'cell-1',
                pathId: 'p1',
                pathName: 'Happy',
                pathKind: 'happy',
                content: 'Tutor waits for the room to open',
              },
            ],
          })
        }
      >
        open
      </button>
      <button type="button" onClick={() => onNavigate('service-canvas:present:slice-1::none:0')}>
        activate a presentation tab
      </button>
      <button type="button" onClick={() => onNavigate('service-canvas:board::none:0')}>
        stay on the board
      </button>
      <span data-testid="open">
        {detail.selection ? (detail.selection.paths[0]?.cellId ?? 'none') : 'none'}
      </span>
    </div>
  )
}

describe('activating another workspace tab', () => {
  it('closes the cell panel and stops the address bar claiming a cell', () => {
    render(<Harness initialKey="service-canvas:board::none:0" />)
    act(() => screen.getByText('open').click())
    expect(screen.getByTestId('open').textContent).toBe('cell-1')
    expect(getOpenCellId()).toBe('cell-1')

    act(() => screen.getByText('activate a presentation tab').click())
    expect(screen.getByTestId('open').textContent).toBe('none')
    // `?cell=` is the share link. A panel that closed while the store still
    // named a cell would hand someone a link to a drawer nobody has open.
    expect(getOpenCellId()).toBeNull()
  })

  it('keeps the selection when the key has not changed', () => {
    // The regression this key has already had once: a value that flips for a
    // reason that is not a navigation deselects a cell somebody just clicked.
    render(<Harness initialKey="service-canvas:board::none:0" />)
    act(() => screen.getByText('open').click())
    act(() => screen.getByText('stay on the board').click())
    expect(screen.getByTestId('open').textContent).toBe('cell-1')
  })
})
