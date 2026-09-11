import { describe, expect, it } from 'vitest'
import {
  settleSlides,
  slideRemovalCopy,
  toggleSlideCell,
  type SlideRemoval,
} from '@/lib/slideRemoval'
import type { DraftSlide } from '@/lib/sliceValidation'

/**
 * One draft slide.
 *
 * @param {Partial<DraftSlide>} fields Fields to set; the rest are empty.
 * @returns {DraftSlide} The slide.
 */
function slide(fields: Partial<DraftSlide>): DraftSlide {
  return { cells: [], title: '', caption: '', ...fields }
}

const noUploads = () => 0

describe('a slide goes when its last cell does', () => {
  it('keeps every slide that still has a cell', () => {
    const before = [slide({ cells: ['a', 'x'] }), slide({ cells: ['b'] })]
    const next = [slide({ cells: ['a'] }), before[1]]
    expect(settleSlides(before, next, noUploads)).toEqual({
      kept: next,
      lost: [],
    })
  })

  it('drops a slide the change emptied, without asking when nobody wrote on it', () => {
    const before = [slide({ cells: ['a'] }), slide({ cells: ['b'], title: 'Named only' })]
    const next = [before[0], slide({ title: 'Named only' })]
    const { kept, lost } = settleSlides(before, next, noUploads)
    expect(kept).toEqual([before[0]])
    expect(lost).toEqual([])
  })

  it('keeps a slide that was already empty, waiting for its first cell', () => {
    const fresh = slide({})
    const before = [slide({ cells: ['a', 'b'] }), fresh]
    const next = [slide({ cells: ['a'] }), fresh]
    expect(settleSlides(before, next, noUploads).kept).toEqual(next)
  })

  it('reports an emptied slide that carries a caption', () => {
    const before = [
      slide({ cells: ['a'] }),
      slide({ id: 's2', cells: ['b'], caption: 'What a reader meets' }),
    ]
    const emptied = { ...before[1], cells: [] }
    const { kept, lost } = settleSlides(before, [before[0], emptied], noUploads)
    expect(kept).toEqual([before[0]])
    expect(lost).toEqual([{ index: 1, slide: emptied, uploads: 0 }])
  })

  it('reports an emptied slide that carries an upload', () => {
    const before = [slide({ id: 's1', cells: ['a'] })]
    const emptied = { ...before[0], cells: [] }
    const { lost } = settleSlides(before, [emptied], (s) =>
      s.id === 's1' ? 2 : 0,
    )
    expect(lost).toEqual([{ index: 0, slide: emptied, uploads: 2 }])
  })

  it('does not count a caption of whitespace as content', () => {
    const before = [slide({ cells: ['a'], caption: '   \n' })]
    const { lost } = settleSlides(
      before,
      [{ ...before[0], cells: [] }],
      noUploads,
    )
    expect(lost).toEqual([])
  })
})

describe('a canvas click toggles a cell', () => {
  it('takes a cell out of the slide that holds it and leaves the slide in place', () => {
    const slides = [slide({ cells: ['a'] }), slide({ cells: ['b'] })]
    const next = toggleSlideCell(slides, 'a', 1)
    expect(next.map((s) => s.cells)).toEqual([[], ['b']])
  })

  it('puts a new cell in the active slide', () => {
    const slides = [slide({ cells: ['a'] }), slide({ cells: ['b'] })]
    expect(toggleSlideCell(slides, 'c', 1)[1].cells).toEqual(['b', 'c'])
  })

  it('starts a slide when there are none', () => {
    expect(toggleSlideCell([], 'a', 0)).toEqual([slide({ cells: ['a'] })])
  })
})

describe('the confirmation says what goes', () => {
  const removal = (fields: Partial<DraftSlide>, uploads = 0, index = 1) =>
    ({ index, slide: slide(fields), uploads }) satisfies SlideRemoval

  it('names one slide by number and title, with its caption and uploads', () => {
    expect(
      slideRemovalCopy([
        removal({ title: 'Setup & Help Reminder', caption: 'x' }, 2),
      ]),
    ).toEqual({
      title: 'Remove slide 2, “Setup & Help Reminder”?',
      description:
        'With no cells left, this slide will be removed along with its caption and 2 uploaded images.',
      remove: 'Remove slide',
      keep: 'Keep slide',
    })
  })

  it('names an untitled slide by number alone', () => {
    expect(slideRemovalCopy([removal({ caption: 'x' })]).title).toBe(
      'Remove slide 2?',
    )
  })

  it('says only what is true of the slide', () => {
    expect(slideRemovalCopy([removal({ caption: 'x' })]).description).toMatch(
      /along with its caption\.$/,
    )
    expect(slideRemovalCopy([removal({}, 1)]).description).toMatch(
      /along with its uploaded image\.$/,
    )
  })

  it('counts several slides and says what they take together', () => {
    const copy = slideRemovalCopy([
      removal({ caption: 'x' }, 0, 0),
      removal({}, 3, 2),
    ])
    expect(copy).toEqual({
      title: 'Remove 2 slides?',
      description:
        'With no cells left, these 2 slides will be removed along with their captions and uploaded images.',
      remove: 'Remove slides',
      keep: 'Keep slides',
    })
  })
})
