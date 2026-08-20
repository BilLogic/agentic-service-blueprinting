import { useState } from 'react'
import { Dialog as DialogPrimitive } from '@base-ui/react/dialog'
import { Expand } from 'lucide-react'
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
 * diagram this dense benefits from a big hit target. The cursor stays a
 * plain pointer, not a zoom cursor — the corner hint already says "this
 * expands", and having both say it a second way read as two competing
 * signals for one action rather than reinforcement.
 *
 * The opened figure has ONE state: fit to the viewport. It used to carry a
 * second zoom step — click the opened image again for its authored pixel
 * size, click once more to return — and that step is gone. Two zoom levels
 * behind two identical-looking clicks made the popup a small mode of its
 * own, and the figures are authored to be readable at fit.
 *
 * So every click inside the popup now does the same thing: close. The
 * diagram closes it through its own handler, and the full-bleed catcher
 * underneath takes every click that misses the diagram — one plain pointer
 * cursor over the whole surface, no separate close button, nothing left to
 * hit that is not "close".
 *
 * The image handles its own click rather than being made
 * `pointer-events-none` and letting the catcher have it. Inert was simpler
 * and cost too much: an image that is not hit-testable cannot be
 * right-clicked, so "save image as" and "open image in new tab" silently
 * targeted the invisible button behind it. These are 880px reference
 * diagrams; being able to pull one out is worth a click handler.
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
    <DialogPrimitive.Root
      open={open}
      onOpenChange={setOpen}
    >
      <DialogPrimitive.Trigger
        type="button"
        aria-label={`Expand: ${figure.alt}`}
        className={cn(
          'group/cover-figure relative block w-full cursor-pointer',
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
        <DialogPrimitive.Backdrop className="fixed inset-0 z-50 cursor-pointer bg-black/70 transition-opacity duration-200 data-ending-style:opacity-0 data-starting-style:opacity-0" />
        <DialogPrimitive.Popup
          // Structural, not descriptive: the image's own `alt` carries the
          // description. Both saying `figure.alt` made a screen reader
          // announce it twice to open one figure, three times counting the
          // trigger.
          aria-label="Expanded figure"
          className="fixed inset-4 z-50 flex items-center justify-center outline-none transition duration-200 data-ending-style:scale-95 data-ending-style:opacity-0 data-starting-style:scale-95 data-starting-style:opacity-0 sm:inset-10"
        >
          {/* Takes every click that misses the diagram. The diagram closes
              through its own handler — see the note above about why it is
              not simply inert. */}
          <DialogPrimitive.Close
            aria-label="Close"
            className="absolute inset-0 cursor-pointer"
            render={<button type="button" tabIndex={-1} />}
          />
          <img
            src={figure.src}
            alt={figure.alt}
            width={figure.width}
            height={figure.height}
            onClick={() => setOpen(false)}
            // Same action as everywhere else in the popup, reached its own
            // way. If this ever stops closing, the middle of the popup
            // becomes a dead zone that reads as a stuck dialog.
            className="relative max-h-full max-w-full shrink-0 cursor-pointer rounded-xl object-contain shadow-2xl"
          />
        </DialogPrimitive.Popup>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  )
}
