/**
 * Which height a scenario panel takes in an aligned phase row.
 *
 * Two rules that used to be one, and had to be split because collapsing
 * them silently answered the wrong question:
 *
 *   1. A scenario showing MORE than its default path selection must not
 *      drive its siblings' height. Such a comparison would otherwise reach
 *      every dimmed neighbour through the row's `Math.max`, so opening one
 *      panel pads every other panel in the row with empty gray. Note the
 *      trigger: the EXPANSION, not the focus. Gating on focus alone makes
 *      rule 2 unsatisfiable, since excluding a panel is itself a change to
 *      the row height.
 *
 *   2. Focus must not change the focused panel's OWN height. The camera
 *      depends on it: a canvas click starts the ease from the geometry on
 *      screen, React's navigation then recomputes the fit, and `fitToView`
 *      skips the second animation only when the two targets agree. A panel
 *      that resizes *because* it became focused guarantees a second ease
 *      superseding the first partway through — the lurch.
 *
 * Rule 1 alone breaks rule 2 whenever the focused scenario is the tallest
 * in its row: dropping it from the row height drops the row height, and the
 * focused panel goes down with it. Handing it back its own estimate as a
 * floor is what makes the two compatible — and the arithmetic is exact
 * rather than approximate, because the row maximum is by definition the
 * larger of "the siblings' maximum" and "its own estimate":
 *
 *   overview: max(others, own)
 *   focused:  max(max(others), own)  ≡ max(others, own)
 */
export function resolveScenarioPanelHeight({
  rowPanelHeight,
  ownHeightFloor,
  isExcludedFromRow,
}: {
  /** The row's shared height — computed WITHOUT the excluded scenario. */
  rowPanelHeight: number | undefined
  /** The excluded scenario's own height, measured or estimated. */
  ownHeightFloor: number | undefined
  /** True only for a focused scenario expanded past its default paths. */
  isExcludedFromRow: boolean
}): number | undefined {
  if (!isExcludedFromRow || ownHeightFloor === undefined) return rowPanelHeight
  return Math.max(rowPanelHeight ?? 0, ownHeightFloor)
}
