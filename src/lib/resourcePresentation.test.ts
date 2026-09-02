import { describe, expect, it } from 'vitest'
import {
  attachmentMedium,
  featuredPresentation,
  linkPresentation,
} from '@/lib/resourcePresentation'
import type { CellResource } from '@/types/blueprint'

const resource = (over: Partial<CellResource> & { url: string }): CellResource => ({
  id: over.url,
  name: 'Intake portal',
  kind: 'link',
  placementId: null,
  featured: false,
  ...over,
})

describe('linkPresentation', () => {
  it('names the verb by host', () => {
    expect(linkPresentation('https://www.figma.com/design/x').label).toBe('Open in Figma')
    expect(linkPresentation('https://youtu.be/abc').label).toBe('Watch on YouTube')
    expect(linkPresentation('https://www.youtube.com/watch?v=1').glyph).toBe('watch')
    expect(linkPresentation('https://acme.notion.site/page').label).toBe('Open in Notion')
    expect(linkPresentation('https://docs.google.com/document/d/1').glyph).toBe('document')
  })

  it('falls back to "Open link" and the host for anything it does not know', () => {
    const unknown = linkPresentation('https://pencil.dev/doc/42')
    expect(unknown.label).toBe('Open link')
    expect(unknown.host).toBe('pencil.dev')
    expect(unknown.glyph).toBe('open')
  })

  it('does not mistake a look-alike host for a known one', () => {
    expect(linkPresentation('https://notfigma.com/x').label).toBe('Open link')
  })
})

describe('attachmentMedium', () => {
  it('reads the extension, query string and all', () => {
    expect(attachmentMedium('/blueprint-images/a/b.png')).toBe('image')
    expect(attachmentMedium('https://cdn.example/clip.MP4?token=1')).toBe('video')
    expect(attachmentMedium('https://cdn.example/voice.m4a#t=3')).toBe('audio')
  })

  it('treats an unknown extension, or none, as a document', () => {
    expect(attachmentMedium('https://cdn.example/spec.pdf')).toBe('document')
    expect(attachmentMedium('https://cdn.example/spec')).toBe('document')
    expect(attachmentMedium('https://cdn.example/folder.v2/')).toBe('document')
  })

  it('prefers a content type when the caller has one', () => {
    expect(attachmentMedium('https://cdn.example/blob', 'image/webp')).toBe('image')
    expect(attachmentMedium('https://cdn.example/x.png', 'application/pdf')).toBe('document')
  })
})

describe('featuredPresentation', () => {
  const rows = [
    resource({ url: 'https://tracker.dev/1', name: 'Ticket' }),
    resource({
      url: '/blueprint-images/intake-portal/step-05.png',
      kind: 'attachment',
      placementId: 'placement-1',
      featured: true,
    }),
    resource({
      url: 'https://www.figma.com/design/W0/intake-portal',
      placementId: 'placement-1',
      featured: true,
    }),
    resource({ url: 'https://youtu.be/walkthrough', name: 'Walkthrough', featured: true }),
    resource({
      url: 'https://www.figma.com/design/other',
      placementId: 'placement-2',
      featured: true,
    }),
  ]

  it('leads with the placement’s featured attachment', () => {
    const { preview } = featuredPresentation({ placementId: 'placement-1', resources: rows })
    expect(preview).toEqual({
      url: '/blueprint-images/intake-portal/step-05.png',
      name: 'Intake portal',
      medium: 'image',
    })
  })

  it('makes a button of every featured link — the placement’s first, then the cell’s', () => {
    const { buttons } = featuredPresentation({ placementId: 'placement-1', resources: rows })
    expect(buttons.map((button) => button.label)).toEqual([
      'Open in Figma',
      'Watch on YouTube',
    ])
  })

  it('shows another placement’s featured link nowhere on this one', () => {
    const { buttons, preview } = featuredPresentation({ placementId: 'placement-2', resources: rows })
    expect(preview).toBeNull()
    expect(buttons.map((button) => button.url)).toEqual([
      'https://www.figma.com/design/other',
      'https://youtu.be/walkthrough',
    ])
  })

  it('ignores an unfeatured resource, whoever owns it', () => {
    const { preview, buttons } = featuredPresentation({
      placementId: 'placement-1',
      resources: [
        resource({ url: '/img.png', kind: 'attachment', placementId: 'placement-1' }),
        resource({ url: 'https://tracker.dev/1' }),
      ],
    })
    expect(preview).toBeNull()
    expect(buttons).toEqual([])
  })
})
