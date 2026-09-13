// @vitest-environment jsdom
import { cleanup, render } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { FeaturedButtons } from '@/components/blueprint/FeaturedResources'
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

describe('the buttons a placement shows', () => {
  it('draws a button per featured link named by host, and nothing for an attachment', () => {
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
        <FeaturedButtons buttons={shown.buttons} />
      </>,
    )
    expect(container.querySelector('img')).toBeNull()
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

  it('renders nothing for a cell with no featured link', () => {
    const { container } = render(<FeaturedButtons buttons={[]} />)
    expect(container.innerHTML).toBe('')
  })
})
