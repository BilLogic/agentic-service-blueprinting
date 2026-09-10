import { describe, expect, it } from 'vitest'
import { imagesThisSlideShows } from '@/lib/slideImages'
import type { BlueprintData } from '@/types/blueprint'
import type { Slide } from '@/types/database'

const blueprint = {
  path: { id: 'p-1', name: 'Happy', summary: null, note: null, kind: 'happy' },
  lanes: [{ id: 'l-1', name: 'Lane', role: null, position: 0 }],
  steps: [
    { id: 'st-1', name: 'One', position: 1 },
    { id: 'st-2', name: 'Two', position: 2 },
    { id: 'st-3', name: 'Three', position: 3 },
    { id: 'st-4', name: 'Four', position: 4 },
  ],
  cells: [
    {
      id: 'c-1',
      lane_id: 'l-1',
      step_id: 'st-1',
      content: 'first',
      frame: '/storyboards/one.png',
      summary: null,
      links: [],
    },
    {
      id: 'c-2',
      lane_id: 'l-1',
      step_id: 'st-2',
      content: 'second',
      frame: '/storyboards/two.png',
      summary: null,
      links: [],
    },
    {
      id: 'c-3',
      lane_id: 'l-1',
      step_id: 'st-3',
      content: 'third',
      frame: '/storyboards/three.png',
      summary: null,
      links: [],
    },
    {
      id: 'c-4',
      lane_id: 'l-1',
      step_id: 'st-4',
      content: 'fourth',
      frame: '/storyboards/four.png',
      summary: null,
      links: [],
    },
  ],
  dependencies: [],
} as unknown as BlueprintData

/**
 * @param {Partial<Slide>} extra - Fields this case varies.
 * @returns {Slide} An untouched slide citing c-1 and c-2 unless overridden.
 */
function slide(extra: Partial<Slide> = {}): Slide {
  return {
    id: 'slide-1',
    slice_id: 'slice-1',
    position: 1,
    cell_ids: ['c-1', 'c-2'],
    cell_keys: ['k-1', 'k-2'],
    title: null,
    caption: null,
    created_by: null,
    shows_all_images: true,
    slide_images: [],
    created_at: '',
    updated_at: '',
    ...extra,
  }
}

describe('what images does this slide show', () => {
  it('untouched (shows_all_images true, no rows) shows every cited cell frame in cell order', () => {
    const shown = imagesThisSlideShows(blueprint, slide())
    expect(shown.map((image) => image.src)).toEqual([
      '/storyboards/one.png',
      '/storyboards/two.png',
    ])
  })

  it('untouched picks up a newly cited cell', () => {
    const shown = imagesThisSlideShows(
      blueprint,
      slide({ cell_ids: ['c-1', 'c-2', 'c-3'], cell_keys: ['k-1', 'k-2', 'k-3'] }),
    )
    expect(shown.map((image) => image.src)).toEqual([
      '/storyboards/one.png',
      '/storyboards/two.png',
      '/storyboards/three.png',
    ])
  })

  it('shows_all_images false shows exactly the rows, including empty', () => {
    expect(
      imagesThisSlideShows(blueprint, slide({ shows_all_images: false, slide_images: [] })),
    ).toEqual([])

    const one = imagesThisSlideShows(
      blueprint,
      slide({
        shows_all_images: false,
        slide_images: [
          {
            id: 'row-1',
            slide_id: 'slide-1',
            position: 0,
            cell_id: 'c-2',
            image_url: null,
          },
        ],
      }),
    )
    expect(one.map((image) => image.src)).toEqual(['/storyboards/two.png'])
  })

  it('preserves mixed member order', () => {
    const shown = imagesThisSlideShows(
      blueprint,
      slide({
        shows_all_images: false,
        slide_images: [
          {
            id: 'a',
            slide_id: 'slide-1',
            position: 0,
            cell_id: null,
            image_url: 'https://example.com/upload.png',
          },
          {
            id: 'b',
            slide_id: 'slide-1',
            position: 1,
            cell_id: 'c-1',
            image_url: null,
          },
          {
            id: 'c',
            slide_id: 'slide-1',
            position: 2,
            cell_id: 'c-2',
            image_url: null,
          },
        ],
      }),
    )
    expect(shown.map((image) => image.src)).toEqual([
      'https://example.com/upload.png',
      '/storyboards/one.png',
      '/storyboards/two.png',
    ])
  })

  it('does not cap the list at 3', () => {
    const shown = imagesThisSlideShows(
      blueprint,
      slide({
        cell_ids: ['c-1', 'c-2', 'c-3', 'c-4'],
        cell_keys: ['k-1', 'k-2', 'k-3', 'k-4'],
      }),
    )
    expect(shown).toHaveLength(4)
  })
})
