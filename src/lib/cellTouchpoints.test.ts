/**
 * A placement is a row, and that is what a rename survives.
 *
 * The prose about a touchpoint used to live in the `cells.links` array as an
 * entry typed `tech_description`, and it found its touchpoint by comparing its
 * `label` to a line of the cell's own `content`. There was no join but the
 * string: rename the pill in the grid and the paragraph behind it stopped
 * being found, silently. `cell_touchpoints` gives it an identity of its own.
 *
 * The behaviour worth pinning here is the part the reader sees — order, the
 * fold of `frame`/`frames` into one `screenshots` array, and what happens
 * when a name resolves to nothing.
 */
import { describe, expect, it } from 'vitest'

import {
  cellTouchpoints,
  cellTouchpointsFromRows,
  touchpointNamed,
} from '@/lib/cellTouchpoints'
import {
  resolveTechCellDetailText,
  resolveTechCellDetailUrl,
} from '@/lib/blueprintTechDescriptions'

const placement = (over: Partial<ReturnType<typeof base>> = {}) => ({
  ...base(),
  ...over,
})
const base = () => ({
  id: 'ct-1',
  name: 'GIS Portal',
  summary: 'Public map-based intake channel.',
  screenshots: [] as string[],
  url: null as string | null,
})

describe('placements from database rows', () => {
  it('sorts by position rather than trusting the embed order', () => {
    const rows = [
      { id: 'b', position: 2, name: 'Work Order App' },
      { id: 'a', position: 1, name: 'GIS Portal' },
    ]
    expect(cellTouchpointsFromRows(rows).map((row) => row.name)).toEqual([
      'GIS Portal',
      'Work Order App',
    ])
  })

  it('trims screenshots and drops the empty ones', () => {
    const rows = [
      { id: 'a', position: 1, name: 'GIS Portal', screenshots: [' a.png ', '', ' '] },
    ]
    expect(cellTouchpointsFromRows(rows)[0]!.screenshots).toEqual(['a.png'])
  })

  it('reads a cell that carries none as having no placements', () => {
    expect(cellTouchpoints({})).toEqual([])
    expect(cellTouchpointsFromRows(undefined)).toEqual([])
  })
})

describe('what the panel reads off a placement', () => {
  const cell = {
    content: 'GIS Portal\nWork Order App',
    summary: 'The intake surfaces.',
    touchpoints: [
      placement({ url: 'https://example.com/design/gis' }),
      placement({
        id: 'ct-2',
        name: 'Work Order App',
        summary: 'Where a crew picks the job up.',
      }),
    ],
  }

  it('answers with the summary of the pill that was clicked', () => {
    expect(resolveTechCellDetailText('Work Order App', cell)).toBe(
      'Where a crew picks the job up.',
    )
  })

  it('gives the design link of THIS moment, not of the cell', () => {
    expect(resolveTechCellDetailUrl('GIS Portal', cell)).toBe(
      'https://example.com/design/gis',
    )
    // The second placement of the same cell has none of its own, and does not
    // inherit the first one's — which is the whole reason the url sits on the
    // placement rather than on the cell.
    expect(resolveTechCellDetailUrl('Work Order App', cell)).toBeNull()
  })

  it('falls back to the cell summary for a pill nothing is placed at', () => {
    // The old shape's failure mode, now visible rather than silent: a pill
    // whose placement was renamed away resolves to the cell's own summary
    // instead of to a paragraph that has quietly stopped being found.
    expect(resolveTechCellDetailText('SMS Gateway', cell)).toBe('SMS Gateway')
    expect(touchpointNamed(cell.touchpoints, 'SMS Gateway')).toBeNull()
  })
})
