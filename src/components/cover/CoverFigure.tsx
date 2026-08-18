import type { CoverFigure as CoverFigureModel } from '@/components/cover/coverModel'
import { cn } from '@/lib/utils'

/**
 * The figure plate.
 *
 * Every cover figure is authored light — panel fills, text, and strokes are
 * literal hex values inside the file, and an `<img>` seals page CSS out of
 * them. So the plate is deliberately light in both themes: in dark mode it
 * reads as a printed plate in a dark book, which is a convention, rather than
 * as a panel that forgot to theme itself.
 *
 * Not `dark:invert` — that destroys the lane colours the figures encode. Not
 * an opacity dim either, which drops the smallest labels below AA.
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
        'h-auto w-full max-w-3xl rounded-xl border border-border bg-white object-contain p-3 sm:p-4',
        'dark:ring-1 dark:ring-white/10',
        className,
      )}
    />
  )
}
