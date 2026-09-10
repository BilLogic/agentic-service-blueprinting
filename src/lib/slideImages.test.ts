import { describe, expect, it } from 'vitest'
import {
  imageSetCarriedOntoReplacedSlide,
  imagesThisSlideShows,
} from '@/lib/slideImages'
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

  it('untouched shows each cited cell id, not a strip companion', () => {
    const withStoryboard = {
      ...blueprint,
      lanes: [
        { id: 'l-1', name: 'Lane', role: null, position: 0 },
        { id: 'l-story', name: 'Storyboard', role: 'storyboard', position: 1 },
      ],
      cells: [
        ...blueprint.cells,
        {
          id: 'c-story',
          lane_id: 'l-story',
          step_id: 'st-1',
          content: 'storyboard',
          frame: '/storyboards/companion.png',
          summary: null,
          links: [],
        },
      ],
    } as unknown as BlueprintData
    const shown = imagesThisSlideShows(withStoryboard, slide())
    expect(shown.map((image) => image.src)).toEqual([
      '/storyboards/one.png',
      '/storyboards/two.png',
    ])
    expect(shown.map((image) => image.cellId)).toEqual(['c-1', 'c-2'])
  })

  it('first tick materialises exactly the images the untouched view showed', () => {
    const shown = imagesThisSlideShows(blueprint, slide())
    expect(
      shown.map((image) => ({ cell_id: image.cellId, image_url: image.imageUrl })),
    ).toEqual([
      { cell_id: 'c-1', image_url: null },
      { cell_id: 'c-2', image_url: null },
    ])
  })
})

describe('the image set a replaced slide keeps', () => {
  it('defaults a new slide to showing every cited frame', () => {
    expect(imageSetCarriedOntoReplacedSlide(undefined, ['c-1'])).toEqual({
      showsAllImages: true,
      members: [],
    })
  })

  it('leaves an untouched slide untouched when its citations change', () => {
    expect(
      imageSetCarriedOntoReplacedSlide(slide({ shows_all_images: true }), ['c-1']),
    ).toEqual({ showsAllImages: true, members: [] })
  })

  it('drops an uncited cell and leaves the other members, including uploads', () => {
    const carried = imageSetCarriedOntoReplacedSlide(
      slide({
        shows_all_images: false,
        slide_images: [
          {
            id: 'a',
            slide_id: 'slide-1',
            position: 0,
            cell_id: 'c-1',
            image_url: null,
          },
          {
            id: 'b',
            slide_id: 'slide-1',
            position: 1,
            cell_id: null,
            image_url: 'https://example.com/upload.png',
          },
          {
            id: 'c',
            slide_id: 'slide-1',
            position: 4,
            cell_id: 'c-2',
            image_url: null,
          },
        ],
      }),
      ['c-1'],
    )
    expect(carried.showsAllImages).toBe(false)
    expect(carried.members).toEqual([
      { position: 0, cell_id: 'c-1', image_url: null },
      { position: 1, cell_id: null, image_url: 'https://example.com/upload.png' },
    ])
  })

  it('keeps an authored empty set empty, not untouched', () => {
    expect(
      imageSetCarriedOntoReplacedSlide(
        slide({ shows_all_images: false, slide_images: [] }),
        ['c-1'],
      ),
    ).toEqual({ showsAllImages: false, members: [] })
  })
})
