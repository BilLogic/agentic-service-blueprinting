import * as React from "react"

import { cn } from "@/lib/utils"

/*
 * DIVERGENCE from the vendored source (ADR 0014), colour jobs only: the sunk
 * `bg-field` plate and the hint-grey placeholder, for the reasons `input.tsx`
 * states. A long placeholder on caption grey is the worst case of the defect —
 * it reads as a paragraph somebody wrote.
 */
function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        "flex field-sizing-content min-h-16 w-full rounded-lg border border-input hover:border-control-hover bg-field px-2.5 py-2 text-lg transition-colors outline-none placeholder:text-tertiary-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:bg-input/50 disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 md:text-sm dark:disabled:bg-input/80 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40",
        className
      )}
      {...props}
    />
  )
}

export { Textarea }
