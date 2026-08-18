import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const alertVariants = cva(
  "group/alert relative grid w-full gap-0.5 rounded-lg border px-2.5 py-2 text-left text-sm has-data-[slot=alert-action]:relative has-data-[slot=alert-action]:pr-18 has-[>svg]:grid-cols-[auto_1fr] has-[>svg]:gap-x-2 *:[svg]:row-span-2 *:[svg]:translate-y-0.5 *:[svg]:text-current *:[svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        default: "bg-card text-card-foreground",
        // Supabase's own recipe: tint the surface and the border, keep the copy
        // at `--foreground`, and let the icon carry the status as a filled chip.
        // Step 600 is a fill weight, not a text weight — reading body copy off
        // it measures 2.96:1 on the step-200 surface.
        destructive:
          "border-destructive-400 bg-destructive-200 text-foreground *:[svg]:rounded-sm *:[svg]:bg-destructive-600 *:[svg]:p-0.5 *:[svg]:text-destructive-200",
        warning:
          "border-warning-400 bg-warning-200 text-foreground *:[svg]:rounded-sm *:[svg]:bg-warning-600 *:[svg]:p-0.5 *:[svg]:text-warning-200",
        // Same recipe, different mechanism: `info` and `success` have no
        // numeric ramp, so the tinted surface is a 15% alpha of the role and
        // the edge is the `--border-{role}` token, which is that role at 30%.
        // The icon chip still takes the solid fill and its own on-colour.
        info: "border-border-info bg-info/15 text-foreground *:[svg]:rounded-sm *:[svg]:bg-info *:[svg]:p-0.5 *:[svg]:text-info-foreground",
        success:
          "border-border-success bg-success/15 text-foreground *:[svg]:rounded-sm *:[svg]:bg-success *:[svg]:p-0.5 *:[svg]:text-success-foreground",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

function Alert({
  className,
  variant,
  ...props
}: React.ComponentProps<"div"> & VariantProps<typeof alertVariants>) {
  return (
    <div
      data-slot="alert"
      role="alert"
      className={cn(alertVariants({ variant }), className)}
      {...props}
    />
  )
}

function AlertTitle({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="alert-title"
      className={cn(
        "font-medium group-has-[>svg]/alert:col-start-2 [&_a]:underline [&_a]:underline-offset-3 [&_a]:hover:text-foreground",
        className
      )}
      {...props}
    />
  )
}

function AlertDescription({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="alert-description"
      className={cn(
        "text-sm text-balance text-muted-foreground md:text-pretty [&_a]:underline [&_a]:underline-offset-3 [&_a]:hover:text-foreground [&_p:not(:last-child)]:mb-4",
        className
      )}
      {...props}
    />
  )
}

function AlertAction({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="alert-action"
      className={cn("absolute top-2 right-2", className)}
      {...props}
    />
  )
}

export { Alert, AlertTitle, AlertDescription, AlertAction }
