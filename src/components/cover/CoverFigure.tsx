import type { CoverFigure as CoverFigureModel } from '@/components/cover/coverModel'
import { COVER_MEASURE } from '@/components/cover/coverMeasure'
import { cn } from '@/lib/utils'

/**
 * A cover figure.
 *
 * No plate, no border, no padding — deliberately. Every figure is authored
 * with a full-bleed rounded background rect across its whole viewBox
 * (`fill="#fafbfc" rx="14"`), so the artwork already IS its own container.
 * Wrapping it in a second bordered, padded, white box drew a frame around a
 * frame, which is what made the page read as boxes inside boxes.
 *
 * That self-plate is also what makes dark mode work without any treatment
 * here: the figures are authored light — panel fills, text and strokes are
 * literal hex inside the file, and an `<img>` seals page CSS out of them —
 * so they read as printed plates in a dark book, which is a convention,
 * rather than as panels that forgot to theme themselves.
 *
 * Not `dark:invert` — that destroys the lane colours the figures encode.
 * Not an opacity dim either, which drops the smallest labels below AA.
 */
export function CoverFigure({
  figure,
  eager = false,
  className,
}: {
  figure: CoverFigureModel
  /** First figure on the page decodes eagerly; everything below it is lazy. */
  eager?: boolean
  className?: string
}) {
  return (
    <img
      src={figure.src}
      alt={figure.alt}
      width={figure.width}
      height={figure.height}
      loading={eager ? 'eager' : 'lazy'}
      decoding="async"
      data-cover-figure
      className={cn(
        // One measure with the prose and the tables — see COVER_MEASURE.
        // This was `max-w-3xl` against the prose's `max-w-2xl`, so every
        // figure overhung the column it belonged to and the page zig-zagged.
        'h-auto w-full object-contain',
        COVER_MEASURE,
        className,
      )}
    />
  )
}
