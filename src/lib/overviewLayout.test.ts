import { describe, expect, it } from 'vitest'
import {
  OVERVIEW_PHASE_SECTION_BOTTOM_INSET,
  OVERVIEW_PHASE_SECTION_INSET,
  OVERVIEW_PHASE_SECTION_TOP_INSET,
  OVERVIEW_SCENARIO_GAP,
} from '@/lib/overviewLayout'

/*
 * The overview is read zoomed out, where every gap shrinks with the board.
 * Two targets live on it — the scenario panel and the phase band around its
 * row — and each needs enough room that a pointer aimed at one does not land
 * on its neighbour once the camera has scaled everything down.
 */
describe('the overview gives each target its own room', () => {
  it('keeps neighbouring scenario panels apart', () => {
    expect(OVERVIEW_SCENARIO_GAP).toBe(360)
  })

  it('leaves a phase band wide enough to be a target of its own', () => {
    expect(OVERVIEW_PHASE_SECTION_INSET).toBe(120)
    expect(OVERVIEW_PHASE_SECTION_BOTTOM_INSET).toBe(48)
    // The top inset is where the phase badge sits on the frame's edge; it
    // does not grow with the band.
    expect(OVERVIEW_PHASE_SECTION_TOP_INSET).toBe(28)
  })
})
