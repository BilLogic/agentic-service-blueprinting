import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { resolveScenarioPanelHeight } from './phaseRowPanelHeight'
import {
  getComparePanelScrollPaddingY,
  getStackedComparePanelHeight,
} from './sideBySideCompareLayout'

/**
 * The height a phase row computes from its panels, given which one (if any)
 * is excluded from the shared max — rule 1 in the module doc.
 */
const rowHeight = (estimates: number[], excludedIndex: number | null) => {
  const inputs = estimates.filter((_, index) => index !== excludedIndex)
  const tallest = Math.max(0, ...inputs)
  return tallest > 0 ? tallest : undefined
}

describe('aligned phase row panel height', () => {
  it('gives an excluded panel the same height it had at overview', () => {
    // The excluded scenario is the TALLEST — the case that regresses. Its
    // own 1766px estimate set the whole row's height at overview; excluding
    // it drops the row to the sibling's 1730px and the panel shrinks 36px,
    // which reads as a padding jump.
    const estimates = [1766, 1730]

    const atOverview = resolveScenarioPanelHeight({
      rowPanelHeight: rowHeight(estimates, null),
      ownHeightFloor: undefined,
      isExcludedFromRow: false,
    })
    const whenExcluded = resolveScenarioPanelHeight({
      rowPanelHeight: rowHeight(estimates, 0),
      ownHeightFloor: estimates[0],
      isExcludedFromRow: true,
    })

    expect(atOverview).toBe(1766)
    expect(whenExcluded).toBe(atOverview)
  })

  it('holds whichever scenario is excluded, tallest or not', () => {
    const estimates = [900, 2400, 1500]
    const atOverview = rowHeight(estimates, null)
    estimates.forEach((own, index) => {
      expect(
        resolveScenarioPanelHeight({
          rowPanelHeight: rowHeight(estimates, index),
          ownHeightFloor: own,
          isExcludedFromRow: true,
        }),
      ).toBe(atOverview)
    })
  })

  it('never lets an expanded scenario raise its siblings', () => {
    // A comparison opened inside the focused scenario: its own estimate
    // explodes, and every sibling must stay exactly where it was.
    const before = [1200, 1400]
    const afterComparison = [4250, 1400]

    expect(
      resolveScenarioPanelHeight({
        rowPanelHeight: rowHeight(afterComparison, 0),
        ownHeightFloor: undefined,
        isExcludedFromRow: false,
      }),
    ).toBe(rowHeight(before, 0))

    // …while the expanded panel itself does grow to hold its own content.
    expect(
      resolveScenarioPanelHeight({
        rowPanelHeight: rowHeight(afterComparison, 0),
        ownHeightFloor: 4250,
        isExcludedFromRow: true,
      }),
    ).toBe(4250)
  })

  it('leaves an unaligned row (no shared height) unlocked', () => {
    expect(
      resolveScenarioPanelHeight({
        rowPanelHeight: undefined,
        ownHeightFloor: undefined,
        isExcludedFromRow: true,
      }),
    ).toBeUndefined()
  })
})

/*
 * Why the estimate must describe the panel that gets rendered.
 *
 * An aligned phase row's panels are height-locked and carry no resize
 * handle, but the panel-height estimates budgeted for one anyway. A
 * `Math.max` against a prediction that is always high can never correct
 * itself, so the surplus paints as permanent gray under the board rather
 * than as one wrong pre-paint frame.
 */
describe('panel height estimates and the chrome they assume', () => {
  it('costs a locked panel less than an unlocked one, by the handle chrome', () => {
    const locked = getComparePanelScrollPaddingY({ lockHeight: true })
    const unlocked = getComparePanelScrollPaddingY()
    expect(locked).toBeLessThan(unlocked)
  })

  it('lets a caller ask for the chrome its panel will actually have', () => {
    // The defect: these took no options, so every estimate assumed the
    // unlocked panel. An aligned phase row is always locked.
    const blueprints = [
      { id: 'bp', steps: [], lanes: [] },
    ] as unknown as Parameters<typeof getStackedComparePanelHeight>[0]

    const locked = getStackedComparePanelHeight(blueprints, false, {
      lockHeight: true,
    })
    const unlocked = getStackedComparePanelHeight(blueprints, false)
    expect(unlocked - locked).toBe(
      getComparePanelScrollPaddingY() -
        getComparePanelScrollPaddingY({ lockHeight: true }),
    )
  })
})

/*
 * The wiring, pinned at the source.
 *
 * Both rules are invisible in a rendered tree until a real board is
 * measured, and jsdom reports every `offsetHeight` as 0 — so the two places
 * that are easy to get wrong are held to the text instead.
 */
describe('phase row height wiring', () => {
  const read = (path: string) =>
    readFileSync(fileURLToPath(new URL(path, import.meta.url)), 'utf8')

  it('excludes on an attribute of its own, not on the focus marker', () => {
    /*
      `data-canvas-focus-active` is set on the phase SECTION as well as on
      the panel, so a `closest()` for it matched every panel in a focused
      row: the measuring loop then measured nothing, and the whole row stayed
      pinned to its estimate.
    */
    const hook = read('../hooks/useAlignedPhaseRowPanelHeight.ts')
    expect(hook).toContain("node.closest('[data-row-height-excluded]')")
    // The doc comment above that line names the wrong attribute on purpose,
    // to say why it is not used; the call must never reach for it.
    expect(hook).not.toContain("closest('[data-canvas-focus-active]')")
  })

  it('gives the focused panel its row’s lock and its row’s height', () => {
    /*
      Focus must change no geometry: a panel that resizes *because* it became
      focused starts a second camera ease over the first. The overview used
      to hand the focused scenario `undefined` for both.
    */
    const overview = read('../components/blueprint/PhaseScenarioOverview.tsx')
    expect(overview).toContain('lockPanelHeight={alignPanelHeights}')
    expect(overview).not.toContain(
      'lockedPanelHeight={isFocusedScenario ? undefined : rowPanelHeight}',
    )
  })
})
