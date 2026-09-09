import { mergeProps } from "@base-ui/react/merge-props"
import { useRender } from "@base-ui/react/use-render"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

/*
  A BADGE DESCRIBES THE THING IT SITS ON, and never reacts to the pointer.

  One per thing, not drawn from a set, never interactive — that is what
  separates it from a TAG, which is one value out of a set and is selectable
  or removable. The owner control is the only tag in this app.

  So there is no hover state here, and that is the load-bearing part rather
  than an omission. Every variant used to carry an `[a]:hover:` rule for the
  case where a badge was rendered as a link, and two more variants existed
  (`ghost`, `link`) whose whole content was a hover state. Nothing used them,
  and what they taught was worse than the duplication: a surface that
  repaints under the pointer reads as clickable, so a badge that did it was
  promising a click that never came.

  What a badge keeps instead is the FOCUS RING below, a `cursor-help` at the
  call sites that carry a definition, and the tooltip itself. A control that
  needs a hover state is a button; use one.
*/
const badgeVariants = cva(
  "group/badge inline-flex w-fit shrink-0 items-center justify-center gap-1 overflow-hidden rounded-4xl border border-transparent font-medium whitespace-nowrap transition-all focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 has-data-[icon=inline-end]:pr-1.5 has-data-[icon=inline-start]:pl-1.5 aria-invalid:border-destructive aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 [&>svg]:pointer-events-none [&>svg]:size-3!",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground",
        secondary: "bg-secondary text-secondary-foreground",
        destructive:
          "bg-destructive/10 text-destructive focus-visible:ring-destructive/20 dark:bg-destructive/20 dark:focus-visible:ring-destructive/40",
        /*
          Supabase's badge formula for this role, said in the role vocabulary:
          the resting tint, the edge that belongs to that tint, and the ink
          tuned for it. Added because two call sites were hand-rolling a tinted
          amber badge straight off the PRIMITIVE amber ramp — a tier-1 leak
          that also had to restate its own dark mode.

          The ink is `text-on-surface-warning` — ink for a colour sitting on
          its own tint — and NOT `text-warning`, which still resolves to the
          solid fill: the fill on this tint measures 2.47:1 in light, which is
          why an ink had to be named at all. The formula this replaces reached
          for a ramp step instead, and that step read 2.77:1 in light and
          5.24:1 in dark against the wash it sat on — legible enough to ship,
          never enough for AA. The named ink reads 13.18:1 and 9.21:1, and this
          badge is the one place in the app where that shows: amber body copy
          becomes a dark amber word on a pale amber tint.

          The tint is opaque, and that is what makes any of those numbers real.
          The ten-percent wash this replaces composited against whatever
          happened to be behind the badge, so the ink on it had no ground to be
          measured against — the defect the vocabulary exists to end.
        */
        warning:
          "border border-border-warning bg-surface-warning text-on-surface-warning focus-visible:ring-border-warning/40",
        outline: "border-border text-foreground",
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
        /** The default: held at 20px however short its label is. */
        default: "h-5 px-2 py-0.5 text-xs",
        /** The same shape, sized to its text rather than held at 20px. */
        fitted: "h-auto px-2 py-0.5 text-xs",
        /** Roomier, at the default's type scale. */
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
