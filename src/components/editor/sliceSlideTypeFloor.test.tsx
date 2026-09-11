// @vitest-environment jsdom
/**
 * Two slice numbers used to live in a circle sized first, then the digit
 * shrunk to fit. A two-digit cited-cell order already overflowed a 16px
 * badge at 9px; a two-digit slide index sat in a 20px badge at 10px. The
 * floor cannot rise to 12px while those boxes still decide the type.
 *
 * The order is a ruler column — right-aligned, fixed-width, mono with
 * tabular figures, at `xs`. The slide badge sizes to its content so one
 * digit stays a circle and two or more grow it. A one-digit fixture
 * would miss both bugs, so every case below is two digits and three.
 */
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { SliceSlideComposer } from '@/components/editor/SliceSlideComposer'
import { SliceSlideEditor } from '@/components/editor/SliceSlideEditor'
import { TooltipProvider } from '@/components/ui/tooltip'
import type { DraftSlide } from '@/lib/sliceValidation'

vi.mock('@/components/editor/SlideImagesField', () => ({
  SlideImagesField: () => null,
}))

afterEach(cleanup)

/** A type-scale class below the 12px floor. */
const BELOW_XS = /\btext-(?:2xs|3xs|4xs|5xs)\b/

const composerSource = readFileSync(
  join(process.cwd(), 'src/components/editor/SliceSlideComposer.tsx'),
  'utf8',
)
const editorSource = readFileSync(
  join(process.cwd(), 'src/components/editor/SliceSlideEditor.tsx'),
  'utf8',
)

/**
 * One draft slide for the composer or the sheet.
 *
 * @param {string[]} cells Cell ids on the slide, in order.
 * @returns {DraftSlide} A title-less, caption-less draft.
 */
function slide(cells: string[]): DraftSlide {
  return { cells, title: '', caption: '' }
}

/**
 * The composer, wrapped in the tooltip provider its icon buttons need.
 *
 * @param {DraftSlide[]} slides The slides under test.
 * @returns {ReturnType<typeof render>} The testing-library view.
 */
function mountComposer(slides: DraftSlide[]) {
  return render(
    <TooltipProvider>
      <SliceSlideComposer slides={slides} onChange={() => {}} />
    </TooltipProvider>,
  )
}

/**
 * The slide sheet, with the illustration field stubbed out.
 *
 * @param {DraftSlide[]} slides The slides under test.
 * @returns {ReturnType<typeof render>} The testing-library view.
 */
function mountEditor(slides: DraftSlide[]) {
  return render(
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
}

/**
 * Expand the storyboard sheet. It starts collapsed; the badges live inside.
 *
 * @returns {void}
 */
function openStoryboard() {
  screen.getByRole('button', { name: 'Storyboard' }).click()
}

describe('cited-cell order is a ruler column', () => {
  it('renders every number of a 105-cell slice at xs, in mono, unclipped', () => {
    const cells = Array.from({ length: 105 }, (_, index) => `cell-${index + 1}`)
    const { container } = mountComposer([slide(cells)])

    const numerals = [
      ...container.querySelectorAll('.font-mono.tabular-nums'),
    ]
    expect(numerals).toHaveLength(105)
    expect(numerals.map((node) => node.textContent)).toEqual(
      cells.map((_, index) => String(index + 1)),
    )

    for (const numeral of [numerals[11], numerals[99], numerals[104]]) {
      expect(numeral.className).toMatch(/\btext-xs\b/)
      expect(numeral.className).toMatch(/\btext-right\b/)
      expect(numeral.className).toMatch(/\btext-muted-foreground\b/)
      expect(numeral.className).not.toMatch(BELOW_XS)
      expect(numeral.className).not.toMatch(/\b(size-4|truncate|overflow-hidden)\b/)
    }
  })

  it('does not author a type rung below xs on the order numeral', () => {
    // The badge this replaced was `text-4xs` inside `size-4`. The lane
    // subtitle and "Slide N" header are labels, not this number.
    expect(composerSource).not.toMatch(/\btext-4xs\b/)
  })
})

describe('the slide badge sizes to its content', () => {
  it('renders two-digit and three-digit indexes in a content-sized badge at xs', () => {
    const slides = Array.from({ length: 100 }, () => slide(['cell-a']))
    const { container } = mountEditor(slides)
    openStoryboard()

    const two = screen.getByLabelText('Slide 12 title')
      .previousElementSibling as HTMLElement
    const three = screen.getByLabelText('Slide 100 title')
      .previousElementSibling as HTMLElement

    expect(two.textContent).toBe('12')
    expect(three.textContent).toBe('100')

    for (const badge of [two, three]) {
      expect(badge.className).toMatch(/\bh-5\b/)
      expect(badge.className).toMatch(/\bmin-w-5\b/)
      expect(badge.className).toMatch(/\bpx-1\b/)
      expect(badge.className).toMatch(/\btext-xs\b/)
      expect(badge.className).toMatch(/\bfont-medium\b/)
      expect(badge.className).not.toMatch(/\bfont-semibold\b/)
      expect(badge.className).not.toMatch(/\bsize-5\b/)
      expect(badge.className).not.toMatch(BELOW_XS)
      expect(badge.className).not.toMatch(/\b(truncate|overflow-hidden)\b/)
    }

    // One digit still has a box to sit in — the badge does not collapse.
    const one = screen.getByLabelText('Slide 1 title')
      .previousElementSibling as HTMLElement
    expect(one.textContent).toBe('1')
    expect(one.className).toMatch(/\bmin-w-5\b/)

    expect(container.querySelector('.size-5')).toBeNull()
  })

  it('does not author a type rung below xs on the slide badge', () => {
    expect(editorSource).not.toMatch(/size-5[\s\S]{0,80}text-3xs/)
  })
})
