import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const alertVariants = cva(
  "group/alert relative grid w-full gap-0.5 rounded-lg border px-2.5 py-2 text-left text-sm has-data-[slot=alert-action]:relative has-data-[slot=alert-action]:pr-18 has-[>svg]:grid-cols-[auto_1fr] has-[>svg]:gap-x-2 *:[svg]:row-span-2 *:[svg]:translate-y-0.5 *:[svg]:text-current *:[svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        // The icon sits on a filled square in every variant — status variants take
        // their role's fill, and `default` takes the INVERTED fill, which is
        // upstream's own recipe (`[&>svg]:bg-foreground [&>svg]:text-background`).
        // Without it `default` was the one alert whose icon was a bare glyph.
        default:
          "bg-card text-card-foreground *:[svg]:rounded-sm *:[svg]:bg-foreground *:[svg]:p-0.5 *:[svg]:text-contrast",
        // Supabase's own recipe, in one mechanism for all four status roles:
        // the role's resting tint as the surface, the edge that belongs to
        // that tint, the copy at `--foreground`, and the status carried by the
        // icon on the role's solid fill with its own on-colour.
        //
        // It was two mechanisms until the roles gained a shared vocabulary.
        // Destructive and warning had a numeric ramp and took a step off it —
        // a 400 edge on a 200 surface; info and success had none, so they drew
        // the same idea as the fill at fifteen percent alpha. Same job, two
        // shapes, because the roles had two shapes. Every role names all four
        // jobs now, so the split is gone.
        //
        // The edge stays quiet on purpose. It sits 1.22–1.28:1 off its own
        // tint in both themes — the interval the ramp steps drew, and about
        // what the neutral hairline beside it draws. An alert says what it is
        // with the tint and the filled square; take the border away and the
        // variant still reads, so aiming this at a 3:1 control floor would
        // turn a hairline into a rule around the box. The alpha edge could not
        // hold that interval at all: composited on its own alpha tint, on a
        // card in dark, it fell to 1.01:1 for info and 1.03:1 for success — an
        // edge that was not there. Both are inside the band now.
        //
        // Body copy on the tint measures 17:1 or better in light and 14:1 or
        // better in dark, and the glyph on its square 4.4:1 or better in both.
        // The square is a FILL and the glyph is what has to be legible on it:
        // the old pairing wrote the tint itself as the glyph colour, which for
        // warning was one colour on another at 2.96:1.
        destructive:
          "border-border-destructive bg-surface-destructive text-foreground *:[svg]:rounded-sm *:[svg]:bg-destructive *:[svg]:p-0.5 *:[svg]:text-destructive-foreground",
        warning:
          "border-border-warning bg-surface-warning text-foreground *:[svg]:rounded-sm *:[svg]:bg-warning *:[svg]:p-0.5 *:[svg]:text-warning-foreground",
        info: "border-border-info bg-surface-info text-foreground *:[svg]:rounded-sm *:[svg]:bg-info *:[svg]:p-0.5 *:[svg]:text-info-foreground",
        success:
          "border-border-success bg-surface-success text-foreground *:[svg]:rounded-sm *:[svg]:bg-success *:[svg]:p-0.5 *:[svg]:text-success-foreground",
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
