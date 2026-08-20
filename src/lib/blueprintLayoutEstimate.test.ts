import { describe, expect, it } from 'vitest'
import {
  NARRATIVE_CELL_HEIGHT,
  PILL_ITEM_HEIGHT,
  getCellContentMinHeight,
  getLayerRowMinHeight,
  getPillStackMinHeight,
} from '@/lib/blueprintLayout'
import type { BlueprintData, BlueprintLayer } from '@/types/blueprint'

// A plain act lane: text content, no visual/pill treatment.
const ACT_LANE = { id: 'l1', name: 'Field Crew', role: null } as BlueprintLayer

// Pins the stable-preview contract. Complete prose remains in the DOM/detail
// surface, but it may never resize the canvas face or the surrounding lane.

const WORST_257 =
  'Cancels the session when the student does not arrive within the first ten minutes, records the cancellation reason in the portal, notifies the supervisor on duty, and follows up with the family about rescheduling options before the end of the school day.'

describe('cell height estimation (todo 026)', () => {
  it('long narrative content uses the same fixed canvas face as short copy', () => {
    expect(WORST_257.length).toBeGreaterThanOrEqual(250)
    expect(getCellContentMinHeight(ACT_LANE, WORST_257)).toBe(
      NARRATIVE_CELL_HEIGHT,
    )
    expect(getCellContentMinHeight(ACT_LANE, 'Signs up.')).toBe(
      NARRATIVE_CELL_HEIGHT,
    )
  })

  it('one long cell cannot resize its whole narrative lane', () => {
    const data = (content: string) =>
      ({
        cells: [{ layer_id: ACT_LANE.id, content }],
      }) as BlueprintData

    expect(getLayerRowMinHeight(ACT_LANE, data(WORST_257))).toBe(
      getLayerRowMinHeight(ACT_LANE, data('Signs up.')),
    )
  })

  it('sizes a technology row from fixed pill faces and fixed gaps', () => {
    expect(getPillStackMinHeight(1)).toBeGreaterThanOrEqual(PILL_ITEM_HEIGHT)
    expect(getPillStackMinHeight(4) - getPillStackMinHeight(3)).toBe(
      PILL_ITEM_HEIGHT + 10,
    )
  })
})
