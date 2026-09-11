// @vitest-environment jsdom
/**
 * The slide sheet is a sidebar turned on its side: the reader sets its
 * height with the divider, and everything inside fits that height by
 * scrolling rather than by being cut off.
 *
 * Three ways it used to fail, one case each:
 * - the divider set a MAXIMUM, so dragging past the tallest card did
 *   nothing and the sheet did not feel draggable at all;
 * - a card taller than the sheet clipped its images and caption with no way
 *   to reach them;
 * - the sideways scroll bar was the only way across for a mouse wheel.
 */
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { SliceSlideEditor } from '@/components/editor/SliceSlideEditor'
import { TooltipProvider } from '@/components/ui/tooltip'
import { SLIDE_SHEET_DEFAULT_HEIGHT } from '@/lib/slideSheetHeight'
import type { DraftSlide } from '@/lib/sliceValidation'

vi.mock('@/components/editor/SlideImagesField', () => ({
  SlideImagesField: () => null,
}))

afterEach(cleanup)

const slides: DraftSlide[] = [
  { cells: ['cell-1', 'cell-2', 'cell-3'], title: 'First', caption: '' },
  { cells: ['cell-4'], title: 'Second', caption: '' },
]

/**
 * The open sheet and its sideways strip.
 *
 * @returns {{ strip: HTMLElement, cards: HTMLElement[] }} The strip and its slide cards.
 */
function mountSheet() {
  const { container } = render(
    <TooltipProvider>
      <SliceSlideEditor
        slides={slides}
        activeSlide={0}
        problems={[]}
        sliceId="slice-1"
        savedSlideFor={() => null}
        onActivate={() => {}}
        onChange={() => {}}
      />
    </TooltipProvider>,
  )
  const cards = [
    ...container.querySelectorAll<HTMLElement>('[data-slide-card]'),
  ]
  const strip = cards[0].parentElement as HTMLElement
  return { strip, cards }
}

/**
 * Give an element a scroll geometry jsdom does not compute.
 *
 * @param {HTMLElement} element The element to shape.
 * @param {Record<string, number>} geometry Scroll properties to pin.
 * @returns {void}
 */
function shape(element: HTMLElement, geometry: Record<string, number>) {
  for (const [key, value] of Object.entries(geometry)) {
    Object.defineProperty(element, key, { value, writable: true })
  }
}

describe('the slide sheet takes the height the reader gives it', () => {
  it('sizes the strip to the divider, not up to it', () => {
    const { strip } = mountSheet()
    expect(strip.style.height).toBe(`${SLIDE_SHEET_DEFAULT_HEIGHT}px`)
    expect(strip.style.maxHeight).toBe('')
  })

  it('has a divider to drag', () => {
    mountSheet()
    expect(
      screen.getByRole('separator', { name: 'Resize the slides' }),
    ).toBeTruthy()
  })
})

describe('a card taller than the sheet scrolls inside itself', () => {
  it('scrolls a card vertically instead of clipping it', () => {
    const { cards } = mountSheet()
    for (const card of cards) {
      expect(card.className).toMatch(/\boverflow-y-auto\b/)
      expect(card.className).not.toMatch(/\boverflow-hidden\b/)
    }
  })

  it('gives the cited cells no scroll box of their own inside the card', () => {
    // One vertical scroller per card. A capped list inside a scrolling card
    // is two nested boxes that both answer the same wheel.
    const { cards } = mountSheet()
    const list = cards[0].querySelector('ul') as HTMLElement
    expect(list.className).not.toMatch(/\bmax-h-/)
    expect(list.className).not.toMatch(/\boverflow-y-auto\b/)
  })
})

describe('the strip scrolls sideways without a scroll bar', () => {
  it('hides the sideways scroll bar', () => {
    const { strip } = mountSheet()
    expect(strip.className).toMatch(/\bblueprint-scroll\b/)
    expect(strip.className).toMatch(/\boverflow-x-auto\b/)
  })

  it('turns a vertical wheel sideways over a card with nowhere to go', () => {
    const { strip, cards } = mountSheet()
    shape(strip, { scrollLeft: 0 })
    shape(cards[1], { scrollHeight: 120, clientHeight: 120, scrollTop: 0 })

    fireEvent.wheel(cards[1], { deltaY: 90, deltaX: 0 })

    expect(strip.scrollLeft).toBe(90)
  })

  it('leaves a vertical wheel to a card that can still scroll', () => {
    const { strip, cards } = mountSheet()
    shape(strip, { scrollLeft: 0 })
    shape(cards[0], { scrollHeight: 400, clientHeight: 200, scrollTop: 0 })

    fireEvent.wheel(cards[0], { deltaY: 90, deltaX: 0 })

    expect(strip.scrollLeft).toBe(0)
  })

  it('hands the wheel to the strip once the card reaches its end', () => {
    const { strip, cards } = mountSheet()
    shape(strip, { scrollLeft: 0 })
    shape(cards[0], { scrollHeight: 400, clientHeight: 200, scrollTop: 200 })

    fireEvent.wheel(cards[0], { deltaY: 90, deltaX: 0 })

    expect(strip.scrollLeft).toBe(90)
  })

  it('leaves a sideways gesture to the browser', () => {
    // A trackpad swipe already scrolls the strip natively; adding the delta
    // again would move it twice.
    const { strip, cards } = mountSheet()
    shape(strip, { scrollLeft: 0 })

    fireEvent.wheel(cards[1], { deltaY: 4, deltaX: 60 })

    expect(strip.scrollLeft).toBe(0)
  })
})
