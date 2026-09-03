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
 * role read as the vocabulary and nothing else, the link found among the
 * cell's resources by the placement's id, and what happens when a name
 * resolves to nothing.
 */
import { describe, expect, it } from 'vitest'

import {
  cellTouchpoints,
  cellTouchpointsFromRows,
  placementResources,
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
  touchpointId: null,
  name: 'GIS Portal',
  kind: null,
  summary: 'Public map-based intake channel.',
  role: null as 'core' | 'peripheral' | null,
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

  it('reads the role as the vocabulary, and anything else as unmarked', () => {
    const rows = [
      { id: 'a', position: 1, name: 'GIS Portal', role: 'core' },
      { id: 'b', position: 2, name: 'Work Order App', role: 'important' },
      { id: 'c', position: 3, name: 'SMS Gateway' },
    ]
    expect(cellTouchpointsFromRows(rows).map((row) => row.role)).toEqual([
      'core',
      null,
      null,
    ])
  })

  it('reads a cell that carries none as having no placements', () => {
    expect(cellTouchpoints({})).toEqual([])
    expect(cellTouchpointsFromRows(undefined)).toEqual([])
  })

  it('carries the registry icon url off the embed, null where there is none (#326)', () => {
    const rows = [
      {
        id: 'a',
        position: 1,
        touchpoint_id: 'tp-1',
        touchpoints: {
          name: 'Zoom',
          kind: 'app',
          icon_url: '/touchpoint-logos/zoom-logo.png',
        },
      },
      { id: 'b', position: 2, name: 'Hand-typed only' },
    ]
    const out = cellTouchpointsFromRows(rows)
    expect(out[0]!.name).toBe('Zoom')
    expect(out[0]!.iconUrl).toBe('/touchpoint-logos/zoom-logo.png')
    expect(out[1]!.iconUrl ?? null).toBeNull()
  })
})

describe('what the panel reads off a placement', () => {
  const cell = {
    content: 'GIS Portal\nWork Order App',
    summary: 'The intake surfaces.',
    touchpoints: [
      placement(),
      placement({
        id: 'ct-2',
        name: 'Work Order App',
        summary: 'Where a crew picks the job up.',
      }),
    ],
    // The placement's link is a resource carrying its id (#111); the cell's
    // own link carries none, and a non-featured link comes after a featured.
    resources: [
      {
        id: 'r-cell',
        name: 'Runbook',
        kind: 'link' as const,
        url: 'https://example.com/runbook',
        placementId: null,
        featured: false,
      },
      {
        id: 'r-2',
        name: 'GIS Portal',
        kind: 'link' as const,
        url: 'https://example.com/design/gis-old',
        placementId: 'ct-1',
        featured: false,
      },
      {
        id: 'r-1',
        name: 'GIS Portal',
        kind: 'link' as const,
        url: 'https://example.com/design/gis',
        placementId: 'ct-1',
        featured: true,
      },
    ],
  }

  it('answers with the summary of the pill that was clicked', () => {
    expect(resolveTechCellDetailText('Work Order App', cell)).toBe(
      'Where a crew picks the job up.',
    )
  })

  it('gives the design link of THIS moment, not of the cell — the featured one first', () => {
    expect(resolveTechCellDetailUrl('GIS Portal', cell)).toBe(
      'https://example.com/design/gis',
    )
    // The second placement of the same cell has none of its own, and does not
    // inherit the first one's or the cell's — which is the whole reason a
    // resource carries the placement it belongs to.
    expect(resolveTechCellDetailUrl('Work Order App', cell)).toBeNull()
  })

  it('lists a placement\u2019s resources featured first', () => {
    expect(
      placementResources(cell.resources, 'ct-1').map((resource) => resource.id),
    ).toEqual(['r-1', 'r-2'])
    expect(placementResources(cell.resources, null)).toEqual([])
  })

  it('falls back to the cell summary for a pill nothing is placed at', () => {
    // The old shape's failure mode, now visible rather than silent: a pill
    // whose placement was renamed away resolves to the cell's own summary
    // instead of to a paragraph that has quietly stopped being found.
    expect(resolveTechCellDetailText('SMS Gateway', cell)).toBe('SMS Gateway')
    expect(touchpointNamed(cell.touchpoints, 'SMS Gateway')).toBeNull()
  })
})
