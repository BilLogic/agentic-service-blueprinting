/**
 * A placement the registry lacks is still a face on the board.
 *
 * The selection seam used to read a cell's touchpoints by splitting its
 * `content` string, and that reading cannot see a name-only placement: the
 * row names its touchpoint by name alone precisely because the registry has
 * no entry for it, and nothing obliges the cell's own text to repeat that
 * name. `getTouchpointNames` reads the placements where the cell has them,
 * so the face is drawn — and `getMaxTouchpointCountInLane` counts the same
 * way, so the row is tall enough to hold it.
 *
 * The text fallback is the other half of the behaviour worth pinning. A
 * compare slot and the hand-written fixture boards hand these readers a cell
 * that never went through the normalizer, and splitting the text is what
 * those sources mean.
 */
import { describe, expect, it } from 'vitest'

import { getTouchpointNames } from '@/lib/blueprintCellSelection'
import { getMaxTouchpointCountInLane } from '@/lib/blueprintLayout'
import { isNameOnlyPlacement } from '@/lib/cellTouchpoints'
import type { BlueprintData, CellTouchpoint } from '@/types/blueprint'

const placement = (
  over: Pick<CellTouchpoint, 'id' | 'touchpointId' | 'name'>,
): CellTouchpoint => ({
  kind: null,
  iconUrl: null,
  summary: null,
  role: null,
  ...over,
})

describe('name-only placements on the board', () => {
  // The cell's text names the registered touchpoint and nothing else, which
  // is the ordinary case: an author placed the second one by name from the
  // panel and never retyped the grid.
  const touchpoints = [
    placement({ id: 'ct-1', touchpointId: 'tp-1', name: 'GIS Portal' }),
    placement({ id: 'ct-2', touchpointId: null, name: 'GIS Field Console' }),
  ]
  const cell = { content: 'GIS Portal', touchpoints }

  it('lists the name-only placement beside the registered one', () => {
    expect(getTouchpointNames(cell)).toEqual(['GIS Portal', 'GIS Field Console'])
  })

  it('leaves which of them the registry lacks to the one predicate', () => {
    expect(touchpoints.map(isNameOnlyPlacement)).toEqual([false, true])
  })

  it('reads a cell that has no placements from its text, in order', () => {
    expect(getTouchpointNames({ content: 'Work Order App, SMS Gateway' })).toEqual([
      'Work Order App',
      'SMS Gateway',
    ])
    expect(getTouchpointNames({})).toEqual([])
  })

  it('sizes the lane by placements, so the dashed face is not clipped', () => {
    const data = {
      cells: [
        { id: 'c1', lane_id: 'lane', step_id: 's1', content: 'GIS Portal', touchpoints },
        {
          id: 'c2',
          lane_id: 'lane',
          step_id: 's2',
          content: 'Work Order App, SMS Gateway, Dispatch Radio',
        },
      ],
    } as unknown as BlueprintData
    // Step 2 has three names in its text and no placements; step 1 has one
    // name in its text and two placements, and is two faces tall for it.
    expect(getMaxTouchpointCountInLane(data, 'lane')).toBe(3)
    const alone = { cells: [data.cells[0]] } as unknown as BlueprintData
    expect(getMaxTouchpointCountInLane(alone, 'lane')).toBe(2)
  })
})
