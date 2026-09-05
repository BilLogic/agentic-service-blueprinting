import { describe, expect, it } from 'vitest'
import {
  COMPARE_SEMANTIC_ZOOM_THRESHOLD,
  MOBILE_MIN_FIT_ZOOM,
  MOBILE_SEMANTIC_ZOOM_THRESHOLD,
  getFocusedComparisonCameraKey,
  getMinFitZoom,
  getSemanticZoomThreshold,
} from '@/lib/canvasCameraPolicy'

/*
 * These decisions used to be "tested" by reading the component's source and
 * asserting it contained certain literals — including one whole formatted
 * statement. That passes no matter what those lines do, and fails on a
 * reformat that changes nothing. The policy is pure, so it is tested as
 * behaviour instead.
 */

const desktopOverview = {
  mobileShell: false,
  isDetail: false,
  selectedPathCount: 1,
}

describe('semantic zoom threshold', () => {
  it('defers to the viewport default until a comparison is actually focused', () => {
    // Overview: path selection is a filter here, not a camera event.
    expect(getSemanticZoomThreshold(desktopOverview)).toBeUndefined()
    expect(
      getSemanticZoomThreshold({ ...desktopOverview, selectedPathCount: 3 }),
    ).toBeUndefined()
    // Focused, but a single path is not a comparison.
    expect(
      getSemanticZoomThreshold({ ...desktopOverview, isDetail: true }),
    ).toBeUndefined()
  })

  it('keeps a focused comparison legible at its own fitted scale', () => {
    /*
      A comparison is wider and taller than one blueprint, so its fitted
      destination commonly lands below the overview's density cutoff — the
      reader would open the thing they asked for and find an empty board.
    */
    expect(
      getSemanticZoomThreshold({
        ...desktopOverview,
        isDetail: true,
        selectedPathCount: 2,
      }),
    ).toBe(COMPARE_SEMANTIC_ZOOM_THRESHOLD)
  })

  it('lets the phone threshold win outright', () => {
    for (const isDetail of [false, true]) {
      for (const selectedPathCount of [1, 2]) {
        expect(
          getSemanticZoomThreshold({
            mobileShell: true,
            isDetail,
            selectedPathCount,
          }),
        ).toBe(MOBILE_SEMANTIC_ZOOM_THRESHOLD)
      }
    }
  })

  it('floors the phone fit above its own threshold, so a landing has text in it', () => {
    expect(getMinFitZoom({ mobileShell: true })).toBe(MOBILE_MIN_FIT_ZOOM)
    expect(getMinFitZoom({ mobileShell: false })).toBeUndefined()
    // The floor must sit above the threshold or the phone lands on a board
    // that has already dropped its text.
    expect(MOBILE_MIN_FIT_ZOOM).toBeGreaterThan(MOBILE_SEMANTIC_ZOOM_THRESHOLD)
  })
})

describe('focused comparison camera key', () => {
  it('is stable outside a focused scenario, so a filter never moves the camera', () => {
    const outside = {
      isFocusedScenario: false,
      displayViewType: 'stacked',
    }
    expect(
      getFocusedComparisonCameraKey({ ...outside, selectedPathIds: ['a'] }),
    ).toBe(
      getFocusedComparisonCameraKey({
        ...outside,
        selectedPathIds: ['a', 'b', 'c'],
      }),
    )
  })

  it('changes with the selection and the view mode inside a focused scenario', () => {
    const focused = { isFocusedScenario: true, displayViewType: 'stacked' }
    const one = getFocusedComparisonCameraKey({
      ...focused,
      selectedPathIds: ['a'],
    })
    const two = getFocusedComparisonCameraKey({
      ...focused,
      selectedPathIds: ['a', 'b'],
    })
    const merged = getFocusedComparisonCameraKey({
      isFocusedScenario: true,
      displayViewType: 'merged',
      selectedPathIds: ['a', 'b'],
    })

    // Both change the comparison's geometry, so both are camera events.
    expect(two).not.toBe(one)
    expect(merged).not.toBe(two)
  })

  it('does not confuse a reordered selection with a changed one', () => {
    // Order is presentation; the same two paths are the same comparison
    // geometry, and re-fitting the camera for a reorder would be a move the
    // reader did not ask for.
    const key = (selectedPathIds: string[]) =>
      getFocusedComparisonCameraKey({
        isFocusedScenario: true,
        displayViewType: 'stacked',
        selectedPathIds,
      })
    // Documented shortcoming rather than a guarantee: selection order IS
    // part of the key today, because the panel renders the paths in
    // selection order and a swap therefore is a different board.
    expect(key(['a', 'b'])).not.toBe(key(['b', 'a']))
  })
})
