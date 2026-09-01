import { describe, expect, it } from 'vitest'
import { detailClickCloses } from '@/lib/cellPickGrammar'
import type { BlueprintCellSelection } from '@/types/blueprintCellDetail'

/**
 * The detail panel's click toggle. It is worth pinning as a pure function
 * because the interesting part is not "does a second click close it" — it is
 * the four cases that must NOT close it, three of which are invisible from
 * the call site.
 */

function cellAt(stepIndex: number, cellId: string): BlueprintCellSelection {
  return {
    scenarioName: 'Intake Call',
    laneName: 'Actor',
    stepId: `step-${stepIndex}`,
    stepName: `Step ${stepIndex}`,
    stepIndex,
    paths: [
      {
        cellId,
        pathId: 'path-1',
        pathName: 'Happy',
        pathSummary: null,
        pathKind: 'happy',
        content: 'Greets the caller',
        frame: null,
        summary: null,
        touchpoints: [],
        resources: [],
      },
    ],
  }
}

const HUMAN_CLICK = {
  shiftKey: false,
  metaKey: false,
  ctrlKey: false,
  isTrusted: true,
}
const CELL_A = cellAt(1, 'cell-a')
const CELL_B = cellAt(2, 'cell-b')

describe('detailClickCloses', () => {
  it('closes when the click lands on the cell the panel is showing', () => {
    expect(
      detailClickCloses({
        event: HUMAN_CLICK,
        openSurface: 'details',
        current: CELL_A,
        next: CELL_A,
      }),
    ).toBe(true)
  })

  it('opens when the click lands on a different cell', () => {
    expect(
      detailClickCloses({
        event: HUMAN_CLICK,
        openSurface: 'details',
        current: CELL_A,
        next: CELL_B,
      }),
    ).toBe(false)
  })

  it('opens when the panel is closed', () => {
    expect(
      detailClickCloses({
        event: HUMAN_CLICK,
        openSurface: null,
        current: null,
        next: CELL_A,
      }),
    ).toBe(false)
  })

  it('switches surface rather than closing when the ledger is on top', () => {
    // The cell is selected underneath, but what the user can SEE is the
    // difference ledger. Closing the whole panel from a click on a cell the
    // panel is not currently showing would read as a bug.
    expect(
      detailClickCloses({
        event: HUMAN_CLICK,
        openSurface: 'differences',
        current: CELL_A,
        next: CELL_A,
      }),
    ).toBe(false)
  })

  it('never closes on the read gesture', () => {
    // ⌘/ctrl-click is "open detail, touch nothing" — and it is the only route
    // to the panel while a picker is armed, so it cannot also be the exit.
    for (const modifier of [{ metaKey: true }, { ctrlKey: true }]) {
      expect(
        detailClickCloses({
          event: { ...HUMAN_CLICK, ...modifier },
          openSurface: 'details',
          current: CELL_A,
          next: CELL_A,
        }),
      ).toBe(false)
    }
  })

  it('keeps the agent path idempotent', () => {
    // `open_cell_panel` opens the panel by dispatching a ⌘-click on the real
    // cell, so it arrives at the same handler a person's click does. Either
    // guard alone would hold here; both are asserted, because the day someone
    // switches that dispatch to a bare click, `isTrusted` is what stops
    // "open this cell" from silently meaning "close it".
    expect(
      detailClickCloses({
        event: { ...HUMAN_CLICK, metaKey: true, isTrusted: false },
        openSurface: 'details',
        current: CELL_A,
        next: CELL_A,
      }),
    ).toBe(false)
    expect(
      detailClickCloses({
        event: { ...HUMAN_CLICK, isTrusted: false },
        openSurface: 'details',
        current: CELL_A,
        next: CELL_A,
      }),
    ).toBe(false)
  })

  it('opens the clicked cell while a draft is on the panel', () => {
    // A draft and a selection are mutually exclusive, so a draft shows up
    // here as `current: null` and can never reach the close branch.
    expect(
      detailClickCloses({
        event: HUMAN_CLICK,
        openSurface: 'details',
        current: null,
        next: CELL_A,
      }),
    ).toBe(false)
  })

  it('treats a tech pill as its own cell', () => {
    // The panel can be open on one pill inside a tech cell; clicking a
    // different pill in the same cell has to open it, not close the panel.
    const pill = (item: string) => ({ ...cellAt(1, 'cell-tech'), techItem: item })
    expect(
      detailClickCloses({
        event: HUMAN_CLICK,
        openSurface: 'details',
        current: pill('Phone'),
        next: pill('Calendly'),
      }),
    ).toBe(false)
    expect(
      detailClickCloses({
        event: HUMAN_CLICK,
        openSurface: 'details',
        current: pill('Phone'),
        next: pill('Phone'),
      }),
    ).toBe(true)
  })
})
