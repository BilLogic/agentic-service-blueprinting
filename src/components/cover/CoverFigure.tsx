import { useState } from 'react'
import { Dialog as DialogPrimitive } from '@base-ui/react/dialog'
import { Expand, X } from 'lucide-react'
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
 *
 * Click to expand. These are dense technical diagrams — cell anatomy, the
 * skill architecture — authored at 880px and then shrunk to fit
 * COVER_MEASURE; small labels are legible in the source and not always in
 * the page. The trigger is the whole image, not a small corner button: a
 * diagram this dense benefits from a big hit target, and the cursor and the
 * corner hint (visible on hover, always-on for touch) are what say it's
 * interactive without adding chrome around every figure on the page.
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
  const [open, setOpen] = useState(false)

  return (
    <DialogPrimitive.Root open={open} onOpenChange={setOpen}>
      <DialogPrimitive.Trigger
        type="button"
        aria-label={`Expand: ${figure.alt}`}
        className={cn(
          'group/cover-figure relative block w-full cursor-zoom-in',
          COVER_MEASURE,
          className,
        )}
      >
        <img
          src={figure.src}
          alt={figure.alt}
          width={figure.width}
          height={figure.height}
          loading={eager ? 'eager' : 'lazy'}
          decoding="async"
          data-cover-figure
          // One measure with the prose and the tables — see COVER_MEASURE.
          // This was `max-w-3xl` against the prose's `max-w-2xl`, so every
          // figure overhung the column it belonged to and the page
          // zig-zagged.
          className="h-auto w-full object-contain"
        />
        <span
          aria-hidden
          className="absolute right-3 bottom-3 flex size-8 items-center justify-center rounded-full bg-foreground/70 text-background opacity-0 backdrop-blur-sm transition-opacity duration-(--motion-fade) ease-out group-hover/cover-figure:opacity-100 group-focus-visible/cover-figure:opacity-100 max-sm:opacity-100"
        >
          <Expand className="size-4" aria-hidden />
        </span>
      </DialogPrimitive.Trigger>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Backdrop className="fixed inset-0 z-50 cursor-zoom-out bg-black/70 transition-opacity duration-200 data-ending-style:opacity-0 data-starting-style:opacity-0" />
        <DialogPrimitive.Popup
          aria-label={figure.alt}
          className="fixed inset-4 z-50 flex items-center justify-center outline-none transition duration-200 data-ending-style:scale-95 data-ending-style:opacity-0 data-starting-style:scale-95 data-starting-style:opacity-0 sm:inset-10"
        >
          <DialogPrimitive.Close
            aria-label="Close"
            className="absolute inset-0 cursor-zoom-out"
            render={<button type="button" tabIndex={-1} />}
          />
          <img
            src={figure.src}
            alt={figure.alt}
            width={figure.width}
            height={figure.height}
            className="pointer-events-none relative max-h-full max-w-full rounded-xl object-contain shadow-2xl"
          />
          <DialogPrimitive.Close
            aria-label="Close"
            className="absolute top-4 right-4 flex size-9 items-center justify-center rounded-full bg-background text-foreground shadow-lg transition-colors duration-(--motion-structural) ease-structural hover:bg-muted focus-visible:outline-2 focus-visible:outline-ring"
          >
            <X className="size-4" aria-hidden />
          </DialogPrimitive.Close>
        </DialogPrimitive.Popup>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  )
}
