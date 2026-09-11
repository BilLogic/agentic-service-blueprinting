import type { DraftSlide } from '@/lib/sliceValidation'

/**
 * What happens to a slide that loses its last cell.
 *
 * A slide is its cells: with none left it has nothing to show, so it goes.
 * There is no separate "delete slide" gesture — taking the cells out IS the
 * gesture, from the strip or from the canvas. For a slide nobody has written
 * on that is cheap, and it happens without a word. A slide carrying a
 * caption or an uploaded image is different: those are the parts an author
 * made by hand, and the cell that was leaving did not look like it was
 * taking them along. So that change waits for a confirmation.
 */

/** A slide the proposed change would remove, and what goes with it. */
export type SlideRemoval = {
  /** Position in the strip, zero-based: "slide 2" is index 1. */
  index: number
  slide: DraftSlide
  /** Images uploaded to the saved slide. Cited cells' frames do not count. */
  uploads: number
}

/** Whether removing this slide loses something an author wrote or uploaded. */
export function carriesContent(removal: SlideRemoval): boolean {
  return removal.slide.caption.trim() !== '' || removal.uploads > 0
}

/**
 * Settle a change that took cells out of slides: a slide the change emptied
 * goes, and the ones that carry content are reported so the change can be
 * confirmed first.
 *
 * `before` and `next` hold the same slides at the same positions — every
 * caller takes cells out without reordering — and the emptied slides are
 * still in `next`. A slide that was already empty, a fresh "Add slide"
 * waiting for its first cell, is not this change's doing and stays.
 */
export function settleSlides(
  before: DraftSlide[],
  next: DraftSlide[],
  uploadsFor: (slide: DraftSlide) => number,
): { kept: DraftSlide[]; lost: SlideRemoval[] } {
  const kept: DraftSlide[] = []
  const lost: SlideRemoval[] = []
  next.forEach((slide, index) => {
    const emptied =
      slide.cells.length === 0 && (before[index]?.cells.length ?? 0) > 0
    if (!emptied) {
      kept.push(slide)
      return
    }
    const removal = { index, slide, uploads: uploadsFor(slide) }
    if (carriesContent(removal)) lost.push(removal)
  })
  return { kept, lost }
}

/**
 * A click on a cell in the canvas: out of whichever slide holds it, or into
 * the active slide. A slide this empties stays in place for `settleSlides`.
 */
export function toggleSlideCell(
  slides: DraftSlide[],
  cellId: string,
  activeSlide: number,
): DraftSlide[] {
  const owner = slides.findIndex((slide) => slide.cells.includes(cellId))
  if (owner !== -1) {
    return slides.map((slide, index) =>
      index === owner
        ? { ...slide, cells: slide.cells.filter((id) => id !== cellId) }
        : slide,
    )
  }
  // No slides yet (every one was emptied) — the click starts one.
  if (slides.length === 0) return [{ cells: [cellId], title: '', caption: '' }]
  const target = Math.min(activeSlide, slides.length - 1)
  return slides.map((slide, index) =>
    index === target ? { ...slide, cells: [...slide.cells, cellId] } : slide,
  )
}

/** The words of the confirmation, for one slide or several. */
export type SlideRemovalCopy = {
  title: string
  description: string
  remove: string
  keep: string
}

/** "its caption and 2 uploaded images", or the part of that which is true. */
function whatGoesWithOne(removal: SlideRemoval): string {
  const parts: string[] = []
  if (removal.slide.caption.trim() !== '') parts.push('caption')
  if (removal.uploads === 1) parts.push('uploaded image')
  if (removal.uploads > 1) parts.push(`${removal.uploads} uploaded images`)
  return `its ${parts.join(' and ')}`
}

/** "their captions and uploaded images", or the part of that which is true. */
function whatGoesWithSeveral(lost: SlideRemoval[]): string {
  const parts: string[] = []
  if (lost.some((removal) => removal.slide.caption.trim() !== '')) {
    parts.push('captions')
  }
  if (lost.some((removal) => removal.uploads > 0)) parts.push('uploaded images')
  return `their ${parts.join(' and ')}`
}

/**
 * The confirmation's copy.
 *
 * Named by number, and by title when there is one, because the number is
 * what the strip shows and the title is what the author wrote. The buttons
 * say what they do; neither is a bare "OK".
 */
export function slideRemovalCopy(lost: SlideRemoval[]): SlideRemovalCopy {
  if (lost.length === 1) {
    const [removal] = lost
    const title = removal.slide.title.trim()
    const name = title
      ? `slide ${removal.index + 1}, “${title}”`
      : `slide ${removal.index + 1}`
    return {
      title: `Remove ${name}?`,
      description: `With no cells left, this slide will be removed along with ${whatGoesWithOne(removal)}.`,
      remove: 'Remove slide',
      keep: 'Keep slide',
    }
  }
  return {
    title: `Remove ${lost.length} slides?`,
    description: `With no cells left, these ${lost.length} slides will be removed along with ${whatGoesWithSeveral(lost)}.`,
    remove: 'Remove slides',
    keep: 'Keep slides',
  }
}
