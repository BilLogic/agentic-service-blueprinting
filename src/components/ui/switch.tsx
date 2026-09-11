"use client"

import { Switch as SwitchPrimitive } from "@base-ui/react/switch"

import { cn } from "@/lib/utils"

/*
 * DIVERGENCE from the vendored source (ADR 0014), colour jobs only:
 *
 *  - the off track is `bg-control-raised`, the named control wash, in place of
 *    `black/[0.14]` and a dark-mode `white/20`. Raw black and raw white are a
 *    hole punched through the page: they ignore the theme's own surface ramp,
 *    so the track darkens or lightens independently of everything around it.
 *  - the thumb's hairline is `ring-border` rather than `black/5`, for the same
 *    reason.
 *
 * On stays `bg-primary`: a switch that is on is a filled control, and filled
 * controls in this system are primary, not brand (ADR 0008).
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
        "peer inline-flex h-4 w-7 shrink-0 cursor-pointer items-center rounded-full border border-transparent bg-control-raised p-px transition-colors outline-none",
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
