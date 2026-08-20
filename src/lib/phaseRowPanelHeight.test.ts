import { describe, expect, it } from 'vitest'
import { resolveScenarioPanelHeight } from './phaseRowPanelHeight'
import {
  getComparePanelScrollPaddingY,
  getStackedComparePanelHeight,
} from './sideBySideCompareLayout'

/**
 * The row height a phase row computes, given which scenario is focused:
 * the focused one is excluded from the inputs (rule 1 in the module doc).
 */
const rowHeight = (estimates: number[], focusedIndex: number | null) => {
  const inputs = estimates.filter((_, index) => index !== focusedIndex)
  const tallest = Math.max(0, ...inputs)
  return tallest > 0 ? tallest : undefined
}

describe('aligned phase row panel height', () => {
  it('gives the focused panel the same height it had at overview', () => {
    // The focused scenario is the TALLEST — the case that regressed. Its
    // own 1766px estimate set the whole row's height at overview; excluding
    // it dropped the row to the sibling's 1730px and the panel shrank 36px
    // the moment it was focused, which read as a padding jump.
    const estimates = [1766, 1730]

    const atOverview = resolveScenarioPanelHeight({
      rowPanelHeight: rowHeight(estimates, null),
      ownHeightFloor: undefined,
      isFocused: false,
    })
    const whenFocused = resolveScenarioPanelHeight({
      rowPanelHeight: rowHeight(estimates, 0),
      ownHeightFloor: estimates[0],
      isFocused: true,
    })

    expect(atOverview).toBe(1766)
    expect(whenFocused).toBe(atOverview)
  })

  it('holds whichever scenario is focused, tallest or not', () => {
    const estimates = [900, 2400, 1500]
    const atOverview = rowHeight(estimates, null)
    estimates.forEach((own, index) => {
      expect(
        resolveScenarioPanelHeight({
          rowPanelHeight: rowHeight(estimates, index),
          ownHeightFloor: own,
          isFocused: true,
        }),
      ).toBe(atOverview)
    })
  })

  it('never lets a focused scenario raise its siblings', () => {
    // A comparison opened inside the focused scenario: its own estimate
    // explodes, every sibling must stay exactly where it was.
    const before = [1200, 1400]
    const afterComparison = [4250, 1400]

    expect(resolveScenarioPanelHeight({
      rowPanelHeight: rowHeight(afterComparison, 0),
      ownHeightFloor: undefined,
      isFocused: false,
    })).toBe(rowHeight(before, 0))

    // ...while the focused panel itself does grow to hold its own content.
    expect(resolveScenarioPanelHeight({
      rowPanelHeight: rowHeight(afterComparison, 0),
      ownHeightFloor: 4250,
      isFocused: true,
    })).toBe(4250)
  })

  it('leaves an unaligned row (no shared height) unlocked', () => {
    expect(resolveScenarioPanelHeight({
      rowPanelHeight: undefined,
      ownHeightFloor: undefined,
      isFocused: true,
    })).toBeUndefined()
  })
})

/*
 * The 84px.
 *
 * Every phase row on the canvas sat exactly 84px taller than its tallest
 * content — the same number on all six, which is the signature of an
 * arithmetic error rather than a measurement one. 64 of it came from here:
 * the panel-height estimates budgeted for scroll chrome that height-locked
 * panels do not have. A `Math.max` against a prediction that is always high
 * can never correct itself, so it showed as permanent gray under the board.
 */
describe('panel height estimates and the chrome they assume', () => {
  it('costs a locked panel less than an unlocked one, by the handle chrome', () => {
    const locked = getComparePanelScrollPaddingY({ lockHeight: true })
    const unlocked = getComparePanelScrollPaddingY()
    expect(unlocked - locked).toBe(64)
    expect(locked).toBeLessThan(unlocked)
  })

  it('lets a caller ask for the chrome its panel will actually have', () => {
    // The regression: these took no options, so every estimate assumed the
    // unlocked panel. An aligned phase row is always locked.
    const blueprints = [
      { id: 'bp', steps: [], layers: [] },
    ] as unknown as Parameters<typeof getStackedComparePanelHeight>[0]

    const locked = getStackedComparePanelHeight(blueprints, false, {
      lockHeight: true,
    })
    const unlocked = getStackedComparePanelHeight(blueprints, false)
    expect(unlocked - locked).toBe(64)
  })
})
