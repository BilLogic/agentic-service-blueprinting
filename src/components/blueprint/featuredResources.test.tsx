// @vitest-environment jsdom
import { cleanup, render } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import {
  FeaturedButtons,
  FeaturedPreviewFrame,
} from '@/components/blueprint/FeaturedResources'
import { featuredPresentation } from '@/lib/resourcePresentation'
import type { CellResource } from '@/types/blueprint'

afterEach(cleanup)

const row = (over: Partial<CellResource> & { url: string }): CellResource => ({
  id: over.url,
  name: 'Intake portal',
  kind: 'link',
  placementId: 'placement-1',
  featured: true,
  ...over,
})

describe('what a placement leads with', () => {
  it('shows the featured attachment as the preview, and a button per featured link named by host', () => {
    const shown = featuredPresentation({
      placementId: 'placement-1',
      resources: [
        row({ url: '/blueprint-images/intake-portal/step-05.png', kind: 'attachment' }),
        row({ url: 'https://www.figma.com/design/W0/intake-portal' }),
        row({ url: 'https://youtu.be/walkthrough', placementId: null, name: 'Walkthrough' }),
      ],
    })
    const { container, getAllByRole } = render(
      <>
        {shown.preview ? <FeaturedPreviewFrame preview={shown.preview} /> : null}
        <FeaturedButtons buttons={shown.buttons} />
      </>,
    )
    expect(container.querySelector('[data-featured-preview="image"] img')?.getAttribute('src')).toBe(
      '/blueprint-images/intake-portal/step-05.png',
    )
    const links = getAllByRole('link')
    expect(links.map((link) => link.textContent?.trim())).toEqual([
      'Open in Figma',
      'Watch on YouTube',
    ])
    expect(links.map((link) => link.getAttribute('href'))).toEqual([
      'https://www.figma.com/design/W0/intake-portal',
      'https://youtu.be/walkthrough',
    ])
    expect(links.every((link) => link.getAttribute('rel') === 'noopener noreferrer')).toBe(true)
  })

  it('draws a video attachment as a video with a play glyph, not as a broken image', () => {
    const shown = featuredPresentation({
      placementId: 'placement-1',
      resources: [row({ url: 'https://cdn.example/clip.mp4', kind: 'attachment' })],
    })
    const { container } = render(<FeaturedPreviewFrame preview={shown.preview!} />)
    expect(container.querySelector('[data-featured-preview="video"] video')).not.toBeNull()
    expect(container.querySelector('img')).toBeNull()
  })

  it('renders nothing for a cell with no featured link', () => {
    const { container } = render(<FeaturedButtons buttons={[]} />)
    expect(container.innerHTML).toBe('')
  })
})
