import { describe, expect, it } from 'vitest'
import {
  getBlueprintCellInnerWidth,
  getCellContentMinHeight,
  getEffectiveLineCount,
} from '@/lib/blueprintLayout'
import type { BlueprintLayer } from '@/types/blueprint'

// A plain act lane: text content, no visual/pill treatment.
const ACT_LANE = { id: 'l1', name: 'Field Crew', role: null } as BlueprintLayer

// Pins the todo-026 estimator floor: the height estimate must be >= the
// real wrapped height for the worst string that ever shipped (257 chars —
// measured ~403px rendered in a 158px text box at 22.75px lines). The old
// constants estimated 280px for it, and with overflow-visible lane rows
// the 123px difference painted straight over the band below.

const WORST_257 =
  'Cancels the session when the student does not arrive within the first ten minutes, records the cancellation reason in the portal, notifies the supervisor on duty, and follows up with the family about rescheduling options before the end of the school day.'

describe('cell height estimation (todo 026)', () => {
  it('the known-worst-scale cell estimates at least its real height', () => {
    expect(WORST_257.length).toBeGreaterThanOrEqual(250)
    expect(getCellContentMinHeight(ACT_LANE, WORST_257)).toBeGreaterThanOrEqual(
      403,
    )
  })

  it('inner width accounts for the button chrome, not just the shell', () => {
    // 220-column geometry: shell 28 + button px-4 & borders 34 → 158.
    expect(getBlueprintCellInnerWidth()).toBeLessThanOrEqual(160)
  })

  it('a one-line cell keeps the single-line floor (no global inflation)', () => {
    expect(getEffectiveLineCount('Signs up.')).toBe(1)
  })
})
