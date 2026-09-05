/**
 * The detail panel's stock logo is DATA, not a table in the renderer (#326).
 *
 * A well-known tool's logo used to be a `Record<toolName, logo>` baked into
 * code, keyed on the deployment's own vocabulary — a foreign tool fell
 * straight through it. Now a touchpoint carries its own `iconUrl` on the
 * registry row, and this resolver reads it off the placement. The behaviour
 * pinned here is that the icon leads the panel's pictures, and that a
 * touchpoint without one draws the frame it always did.
 */
import { describe, expect, it } from 'vitest'

import { resolveCellDetailPictures } from '@/lib/blueprintTechPictures'
import type { CellResource, CellTouchpoint } from '@/types/blueprint'

const placement = (over: Partial<CellTouchpoint> = {}): CellTouchpoint => ({
  id: 'ct-1',
  touchpointId: 'tp-1',
  name: 'Zoom',
  kind: 'app',
  iconUrl: null,
  summary: null,
  role: null,
  ...over,
})

const screenshot = (over: Partial<CellResource> = {}): CellResource => ({
  id: 'r-1',
  name: 'A screen',
  kind: 'attachment',
  url: 'https://example.com/shot.png',
  placementId: 'ct-1',
  featured: true,
  ...over,
})

describe('resolveCellDetailPictures', () => {
  it('leads with the touchpoint registry icon for the clicked touchpoint', () => {
    expect(
      resolveCellDetailPictures({
        techItem: 'Zoom',
        cellContent: 'Zoom',
        cellTouchpoints: [placement({ iconUrl: '/touchpoint-logos/zoom-logo.png' })],
        cellResources: [],
      }),
    ).toEqual(['/touchpoint-logos/zoom-logo.png'])
  })

  it('reads the icon off a single-touchpoint cell with no touchpoint clicked', () => {
    expect(
      resolveCellDetailPictures({
        cellContent: 'Zoom',
        cellTouchpoints: [placement({ iconUrl: '/touchpoint-logos/zoom-logo.png' })],
        cellResources: [],
      }),
    ).toEqual(['/touchpoint-logos/zoom-logo.png'])
  })

  it('puts the stock icon ahead of a placement screenshot', () => {
    expect(
      resolveCellDetailPictures({
        techItem: 'Zoom',
        cellContent: 'Zoom',
        cellTouchpoints: [placement({ iconUrl: '/touchpoint-logos/zoom-logo.png' })],
        cellResources: [screenshot()],
      }),
    ).toEqual(['/touchpoint-logos/zoom-logo.png', 'https://example.com/shot.png'])
  })

  it('draws the frame when the touchpoint carries no icon', () => {
    expect(
      resolveCellDetailPictures({
        techItem: 'Zoom',
        cellContent: 'Zoom',
        cellFrame: 'https://example.com/frame.png',
        cellTouchpoints: [placement({ iconUrl: null })],
        cellResources: [],
      }),
    ).toEqual(['https://example.com/frame.png'])
  })
})
