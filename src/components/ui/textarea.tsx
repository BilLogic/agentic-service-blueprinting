import * as React from "react"

import { cn } from "@/lib/utils"

/*
 * DIVERGENCE from the vendored source, allowed only with a stated reason.
 * Colour jobs only: the sunk `bg-field` plate and the hint-grey
 * placeholder, for the reasons `input.tsx` states. A long placeholder on
 * caption grey is the worst case of the defect — it reads as a paragraph
 * somebody wrote.  The read-only pair rides along for the same reason it
 * is on `input.tsx`: a read-only textarea was byte-identical to an
 * editable one, so a locked field looked like a place to type in the one
 * control where the invitation is largest. `enabled:` gates it because
 * CSS `:read-only` also matches disabled.
 */
function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        "flex field-sizing-content min-h-16 w-full rounded-lg border border-input hover:border-control-hover bg-field px-2.5 py-2 text-lg transition-colors outline-none placeholder:text-tertiary-foreground enabled:read-only:border-border enabled:read-only:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:bg-input/50 disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 md:text-sm dark:disabled:bg-input/80 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40",
        className
      )}
      {...props}
    />
  )
}

export { Textarea }
