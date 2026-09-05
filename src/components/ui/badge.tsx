import { mergeProps } from "@base-ui/react/merge-props"
import { useRender } from "@base-ui/react/use-render"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "group/badge inline-flex w-fit shrink-0 items-center justify-center gap-1 overflow-hidden rounded-4xl border border-transparent font-medium whitespace-nowrap transition-all focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 has-data-[icon=inline-end]:pr-1.5 has-data-[icon=inline-start]:pl-1.5 aria-invalid:border-destructive aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 [&>svg]:pointer-events-none [&>svg]:size-3!",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground [a]:hover:bg-primary/80",
        secondary:
          "bg-secondary text-secondary-foreground [a]:hover:bg-secondary/80",
        destructive:
          "bg-destructive/10 text-destructive focus-visible:ring-destructive/20 dark:bg-destructive/20 dark:focus-visible:ring-destructive/40 [a]:hover:bg-destructive/20",
        /*
          Supabase's own badge formula for this role, verbatim from their
          `shadcn/ui/badge.tsx`: `bg-warning/10 text-warning-600 border
          border-warning-500`. Added because two call sites were hand-rolling a
          tinted amber chip straight off the PRIMITIVE amber ramp — a tier-1
          leak that also had to restate its own dark mode.

          The ink is step 600, not `text-warning`. That is the whole trick: the
          mid role colour (oklch L 0.68) on its own 10% wash measures ~2.3:1,
          while step 600 measures ~3.4:1 — still under AA for body copy, and
          what Supabase ships. It replaces a chip that measured ~1.9:1.
        */
        warning:
          "border border-warning-500 bg-warning/10 text-warning-600 focus-visible:ring-warning-500/40 [a]:hover:bg-warning/20",
        outline:
          "border-border text-foreground [a]:hover:bg-muted [a]:hover:text-muted-foreground",
        ghost:
          "hover:bg-muted hover:text-muted-foreground dark:hover:bg-muted/50",
        link: "text-primary underline-offset-4 hover:underline",
      },
      /*
        THE BADGE'S GEOMETRY, WRITTEN HERE AND NOWHERE ELSE.

        Every value spells out all four utilities — height, both paddings and
        the type scale — rather than leaning on the base string for the ones it
        keeps. That is the point of the variant: a reader comparing two sizes
        reads two lines, not one line and a subtraction, and a wrapper that
        wants a shape has a name to ask for instead of a class string to
        re-derive. Three wrappers used to derive it, and the padding they
        arrived at for the same word ("compact") was not the same padding.

        The set is closed on purpose. A fifth shape is a design decision, and
        it is made in this file — where the other four are visible — rather
        than in the wrapper that happens to want it.
      */
      size: {
        /** The badge: a chip held at 20px however short its label is. */
        default: "h-5 px-2 py-0.5 text-xs",
        /** The same chip, sized to its text rather than held at 20px. */
        fitted: "h-auto px-2 py-0.5 text-xs",
        /** Roomier, at the chip's type scale. */
        roomy: "h-auto px-2.5 py-1 text-xs",
        /** Roomier, one step up the type scale. */
        comfortable: "h-auto px-2.5 py-1 text-sm",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

function Badge({
  className,
  variant = "default",
  size = "default",
  render,
  ...props
}: useRender.ComponentProps<"span"> & VariantProps<typeof badgeVariants>) {
  return useRender({
    defaultTagName: "span",
    props: mergeProps<"span">(
      {
        className: cn(badgeVariants({ variant, size }), className),
      },
      props
    ),
    render,
    state: {
      slot: "badge",
      variant,
    },
  })
}

export { Badge, badgeVariants }
