import * as React from "react"
import { Input as InputPrimitive } from "@base-ui/react/input"

import { cn } from "@/lib/utils"

/*
 * DIVERGENCE from the vendored source, allowed only with a stated reason.
 * Colour jobs only, no geometry and no timing:
 *
 *  - the resting plate is `bg-field`, the sunk well this system derives for
 *    text entry, in place of `bg-transparent` + a dark-mode `input/30` wash.
 *    A field that borrows the page colour reads as a label, not a place to
 *    type.
 *  - the placeholder is `tertiary-foreground` (hint grey), not
 *    `muted-foreground` (caption grey). On caption grey a placeholder reads as
 *    a value somebody already typed, which is the defect this came from.
 *  - a read-only value is caption grey on the ordinary border, so a locked
 *    field looks like a caption rather than an open well. Gated on `enabled:`
 *    because CSS `:read-only` also matches a DISABLED field — ungated, a
 *    disabled input took the locked look on top of its own fade, which is not
 *    what the next paragraph says disabled looks like.
 *
 * Whole-control `opacity-50` on disabled is kept deliberately: upstream fades
 * only the Input's ink while its own textarea fades the plate, and matching
 * that here would make two controls disagree about what disabled looks like.
 */
function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <InputPrimitive
      type={type}
      data-slot="input"
      className={cn(
        "h-8 w-full min-w-0 rounded-lg border border-input transition-colors hover:border-control-hover bg-field px-2.5 py-1 text-lg outline-none file:inline-flex file:h-6 file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-tertiary-foreground enabled:read-only:border-border enabled:read-only:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:cursor-not-allowed disabled:bg-input/50 disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 md:text-sm dark:disabled:bg-input/80 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40",
        className
      )}
      {...props}
    />
  )
}

export { Input }
