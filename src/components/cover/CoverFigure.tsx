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
 * The opened figure has a second zoom step of its own: click it once more
 * to view at its authored pixel size (the popup scrolls if that exceeds the
 * viewport), click again to return to fit. Zoom-in/zoom-out cursors live on
 * the IMAGE for that reason — they describe what clicking the image does.
 * Everywhere else in the popup (the empty margin, the backdrop) closes the
 * whole thing on click, with a plain cursor: closing is a different action
 * from the image's own zoom step and was not read well by reusing the same
 * cursor for both. There is no separate close button — every square inch
 * that is not the diagram already closes it.
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
  const [expanded, setExpanded] = useState(false)

  return (
    <DialogPrimitive.Root
      open={open}
      onOpenChange={(next) => {
        setOpen(next)
        // Every reopen starts fit-to-viewport; the zoomed-in step is a
        // per-visit choice, not a remembered preference.
        if (!next) setExpanded(false)
      }}
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
          aria-label={figure.alt}
          className={cn(
            'fixed inset-4 z-50 flex outline-none transition duration-200 data-ending-style:scale-95 data-ending-style:opacity-0 data-starting-style:scale-95 data-starting-style:opacity-0 sm:inset-10',
            // Fit state centers; the expanded step can exceed the box, so it
            // scrolls instead of clipping or forcing the image back down.
            expanded
              ? 'items-start justify-center overflow-auto'
              : 'items-center justify-center',
          )}
        >
          {/* Fills the popup BEHIND the image. The image sits on top and
              handles its own click (zoom step); every click that lands
              outside the image's own bounds reaches this and closes. */}
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
            onClick={(event) => {
              // Stop here, or the click falls through to the close button
              // beneath it and the zoom step also closes the popup.
              event.stopPropagation()
              setExpanded((value) => !value)
            }}
            aria-label={expanded ? 'Shrink to fit' : 'View at full size'}
            /*
              Expanded size is an inline style, not a utility class, and
              that is load-bearing. `width:auto` should fall back to the
              `width`/`height` HTML attributes (880×N) once `max-width:100%`
              is cleared — but these figures are SVGs authored with a
              `viewBox` and no `width`/`height` on the root `<svg>`, so the
              browser's own intrinsic-size detection reports the UA default
              (300×150) inside this flex popup, and CSS `auto` sizing
              follows THAT, not our attribute. An explicit pixel width here
              is the one way to get the authored size deterministically
              rather than arguing with SVG intrinsic-size edge cases.
            */
            style={expanded ? { width: figure.width, maxWidth: 'none' } : undefined}
            className={cn(
              'relative shrink-0 rounded-xl object-contain shadow-2xl',
              expanded
                ? 'cursor-zoom-out'
                : 'max-h-full max-w-full cursor-zoom-in',
            )}
          />
        </DialogPrimitive.Popup>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  )
}
