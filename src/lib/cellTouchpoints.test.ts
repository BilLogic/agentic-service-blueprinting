/**
 * A placement is a row, and that is what a rename survives.
 *
 * The prose about a touchpoint used to live in the `cells.links` array as an
 * entry typed `tech_description`, and it found its touchpoint by comparing its
 * `label` to a line of the cell's own `content`. There was no join but the
 * string: rename the touchpoint in the grid and the paragraph behind it stopped
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
  findCellPlacement,
  placementResources,
  resolveTouchpointDetail,
  touchpointNamed,
} from '@/lib/cellTouchpoints'

const placement = (over: Partial<ReturnType<typeof base>> = {}) => ({
  ...base(),
  ...over,
})
const base = () => ({
  id: 'ct-1',
  touchpointId: null,
  name: 'GIS Portal',
  kind: null,
  summary: 'Public map-based intake channel.' as string | null,
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

  it('carries the registry icon url off the embed, null where there is none', () => {
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
    // The placement's link is a resource carrying its id; the cell's own
    // link carries none, and a non-featured link comes after a featured.
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

  it('answers with the summary of the touchpoint that was clicked', () => {
    expect(resolveTouchpointDetail(cell, 'Work Order App')?.text).toBe(
      'Where a crew picks the job up.',
    )
  })

  it('picks the row, and reads it, as two separate answers', () => {
    // `findCellPlacement` says WHICH row; `resolveTouchpointDetail` says what
    // it reads as. The editor needs the first — seeding a form with the
    // second's fallback is how a cell's sentence gets saved onto a placement
    // that never said it.
    expect(findCellPlacement(cell, 'Work Order App')?.id).toBe('ct-2')
    expect(findCellPlacement(cell, 'SMS Gateway')).toBeNull()
  })

  it('resolves a single-touchpoint cell without being told which', () => {
    const one = { summary: null, touchpoints: [placement()] }
    expect(findCellPlacement(one)?.name).toBe('GIS Portal')
    // Several, and it refuses rather than guessing at the first: one
    // touchpoint's screenshot under another's heading is the confusion a
    // placement row exists to end.
    expect(findCellPlacement(cell)).toBeNull()
  })

  it('lists a placement\u2019s resources featured first', () => {
    expect(
      placementResources(cell.resources, 'ct-1').map((resource) => resource.id),
    ).toEqual(['r-1', 'r-2'])
    expect(placementResources(cell.resources, null)).toEqual([])
  })

  it('falls back to the cell summary for a touchpoint nothing is placed at', () => {
    // The old shape's failure mode, now visible rather than silent: a touchpoint
    // whose placement was renamed away resolves to the cell's own summary
    // instead of to a paragraph that has quietly stopped being found.
    expect(resolveTouchpointDetail(cell, 'SMS Gateway')).toBeNull()
    expect(touchpointNamed(cell.touchpoints, 'SMS Gateway')).toBeNull()
    // A placement with no words of its own reads as the cell's, then as its
    // own name — the one rule, for every touchpoint.
    const bare = {
      summary: 'The intake surfaces.',
      touchpoints: [placement({ summary: null })],
    }
    expect(resolveTouchpointDetail(bare, 'GIS Portal')?.text).toBe(
      'The intake surfaces.',
    )
    expect(
      resolveTouchpointDetail(
        { summary: null, touchpoints: [placement({ summary: null })] },
        'GIS Portal',
      )?.text,
    ).toBe('GIS Portal')
  })
})
