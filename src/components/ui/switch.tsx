"use client"

import { Switch as SwitchPrimitive } from "@base-ui/react/switch"

import { cn } from "@/lib/utils"

/*
 * DIVERGENCE from the vendored source, allowed only with a stated reason.
 * Colour jobs only:
 *
 *  - the off track is `bg-control-raised`, the named control wash, in place of
 *    `black/[0.14]` and a dark-mode `white/20`. Raw black and raw white are a
 *    hole punched through the page: they ignore the theme's own surface ramp,
 *    so the track darkens or lightens independently of everything around it.
 *  - the thumb's hairline is `ring-border` rather than `black/5`, for the same
 *    reason.
 *
 * On stays `bg-primary`: a switch that is on is a filled control, and filled
 * controls in this system are primary, not brand — a token names a job,
 * and the filled-control job is primary.
 */
/**
 * The on/off track. Sized for the compact settings rows (`h-4`), which is
 * the same vertical rhythm as a `text-xs` label beside it.
 */
function Switch({ className, ...props }: SwitchPrimitive.Root.Props) {
  return (
    <SwitchPrimitive.Root
      data-slot="switch"
      className={cn(
        // The EDGE is what makes off legible. `--control-raised` is a ~2% white
        // wash, which against a 0.995 page is very nearly the page itself — so
        // the named wash alone left an off switch with no visible track,
        // measured on a render rather than assumed. `border-border` gives it
        // one hairline; on it, the primary fill carries the shape and the edge
        // steps aside.
        "peer inline-flex h-4 w-7 shrink-0 cursor-pointer items-center rounded-full border border-border bg-control-raised p-px transition-colors outline-none data-checked:border-transparent",
        "focus-visible:ring-[3px] focus-visible:ring-ring/50",
        "data-checked:bg-primary",
        "data-disabled:cursor-not-allowed data-disabled:opacity-50",
        className
      )}
      {...props}
    >
      <SwitchPrimitive.Thumb
        data-slot="switch-thumb"
        className="block size-3.5 rounded-full bg-background shadow-sm ring-1 ring-border transition-transform data-checked:translate-x-3 data-unchecked:translate-x-0"
      />
    </SwitchPrimitive.Root>
  )
}

export { Switch }
