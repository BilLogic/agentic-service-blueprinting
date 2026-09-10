import { isRenderableImageSrc } from '@/lib/sliceCells'
import { isBlueprintStepStoryboardPlaceholder } from '@/lib/blueprintStoryboardPlaceholder'
import { resolveBlueprintCellId } from '@/lib/resolveBlueprintCellId'
import type { BlueprintData } from '@/types/blueprint'
import type { Slide, SlideImage } from '@/types/database'

/** One image a slide currently shows, with the row that produced it. */
export type ShownSlideImage = {
  src: string
  cellId: string | null
  imageUrl: string | null
}

/** A `slides` row with its image-set members embedded, as the resolver reads them. */
export type SlideWithImageSet = Pick<Slide, 'cell_ids' | 'shows_all_images'> & {
  slide_images?: readonly Pick<SlideImage, 'position' | 'cell_id' | 'image_url'>[]
}

/**
 * The frame one cited cell contributes to a slide, or null when it has none.
 *
 * @param {BlueprintData | null} blueprint - The board the cell is drawn on.
 * @param {string} cellId - The cited cell.
 * @returns {string | null} The cell's own frame, if it is a real picture.
 */
export function frameForCitedCell(
  blueprint: BlueprintData | null,
  cellId: string,
): string | null {
  const canonical = resolveBlueprintCellId(cellId)
  const cell = blueprint?.cells.find(
    (candidate) => candidate.id === canonical || candidate.id === cellId,
  )
  const frame = cell?.frame?.trim()
  if (!frame || isBlueprintStepStoryboardPlaceholder(frame)) return null
  return frame
}

/**
 * The cited cells' own frames, in the slide's cell order.
 *
 * This is the rule both the untouched view and the tick model use. It is
 * not a strip: a strip also pulls in the storyboard companion of each
 * cell's step, and that expansion is what made the first tick drop an
 * image the reader had just been shown.
 *
 * @param {BlueprintData | null} blueprint - The board the cells are drawn on.
 * @param {readonly string[]} cellIds - Citations, in the order the slide stores them.
 * @returns {Array<{ src: string; cellId: string }>} Frames a tick can name.
 */
export function framesOfCitedCells(
  blueprint: BlueprintData | null,
  cellIds: readonly string[],
): Array<{ src: string; cellId: string }> {
  const frames: Array<{ src: string; cellId: string }> = []
  for (const cellId of cellIds) {
    const src = frameForCitedCell(blueprint, cellId)
    if (src) frames.push({ src, cellId })
  }
  return frames
}

/**
 * What images does this slide show.
 *
 * An untouched slide (`shows_all_images`) tracks the board: every cited
 * cell's own frame, in the slide's cell order. The first tick or untick
 * makes the set explicit from that same list; from then on the slide shows
 * exactly its rows, including none.
 *
 * @param {BlueprintData | null} blueprint - Cells whose frames fill an untouched slide.
 * @param {SlideWithImageSet} slide - The slide, with `slide_images` embedded.
 * @returns {ShownSlideImage[]} Images in the order a reader meets them. Never truncated.
 */
export function imagesThisSlideShows(
  blueprint: BlueprintData | null,
  slide: SlideWithImageSet,
): ShownSlideImage[] {
  if (slide.shows_all_images) {
    return framesOfCitedCells(blueprint, slide.cell_ids).map(({ src, cellId }) => ({
      src,
      cellId,
      imageUrl: null,
    }))
  }

  const rows = [...(slide.slide_images ?? [])].sort(
    (left, right) => left.position - right.position,
  )
  const shown: ShownSlideImage[] = []
  for (const row of rows) {
    if (row.cell_id) {
      const src = frameForCitedCell(blueprint, row.cell_id)
      if (src) shown.push({ src, cellId: row.cell_id, imageUrl: null })
      continue
    }
    const url = row.image_url?.trim() ?? ''
    if (url && isRenderableImageSrc(url)) {
      shown.push({ src: url, cellId: null, imageUrl: url })
    }
  }
  return shown
}

/**
 * Coerce a slides row (with optional embedded members) into `Slide`.
 *
 * PostgREST types the embed according to generated Relationships, which this
 * repo hand-edits. The runtime payload is always an array.
 *
 * @param {unknown} row - A `slides` row as returned by the client.
 * @returns {Slide} The same row with `slide_images` as an array.
 */
export function asSlideWithImages(row: unknown): Slide {
  const slide = row as Slide & { slide_images?: SlideImage | SlideImage[] | null }
  const members = slide.slide_images
  const list = Array.isArray(members) ? members : members ? [members] : []
  return { ...slide, slide_images: list }
}

/** The image set a replaced slide keeps, once its citations may have changed. */
export type CarriedSlideImageSet = {
  showsAllImages: boolean
  members: Array<{
    position: number
    cell_id: string | null
    image_url: string | null
  }>
}

/**
 * The image set a `replace_slides` rewrite should put back on one slide.
 *
 * Save and the agent tool delete every `slides` row and insert again. The
 * authored set lives on the old row, so it has to travel with the draft's
 * id: an untouched slide stays untouched; an authored slide keeps its
 * members except any cell no longer cited. Positions of what remains are
 * left as they were. A draft with no matching row is a new slide and
 * defaults to showing every cited frame.
 *
 * @param {SlideWithImageSet | undefined} prior - The row about to be deleted, if this draft still names it.
 * @param {readonly string[]} nextCellIds - Citations the replacement will store.
 * @returns {CarriedSlideImageSet} Flag and members to write on the new row.
 */
export function imageSetCarriedOntoReplacedSlide(
  prior: SlideWithImageSet | undefined,
  nextCellIds: readonly string[],
): CarriedSlideImageSet {
  if (!prior || prior.shows_all_images) {
    return { showsAllImages: true, members: [] }
  }
  const cited = new Set(nextCellIds)
  const members = [...(prior.slide_images ?? [])]
    .filter((row) => row.cell_id == null || cited.has(row.cell_id))
    .sort((left, right) => left.position - right.position)
    .map((row) => ({
      position: row.position,
      cell_id: row.cell_id,
      image_url: row.image_url,
    }))
  return { showsAllImages: false, members }
}
