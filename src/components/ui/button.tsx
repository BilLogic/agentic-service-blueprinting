import { Button as ButtonPrimitive } from "@base-ui/react/button"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  // Weight 400, not 500. Supabase's Button base is `font-regular`, and a
  // filled brand button at 500 is what read as "too bold" — the label was
  // heavier than the body copy around it for no reason the control needed.
  // Weight is now free to mean one thing here: SELECTED (see `ghost` below).
  "group/button inline-flex shrink-0 items-center justify-center rounded-lg border border-transparent bg-clip-padding text-sm font-normal whitespace-nowrap transition-all duration-200 outline-none select-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 active:not-aria-[haspopup]:translate-y-px disabled:pointer-events-none disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        // Supabase's button treatment: flat matcha fill, one shade-darker
        // 1px edge, tighter radius, no drop shadow — the border carries the
        // weight the muted fill gave up. Hover still rides alpha on the
        // resting token; no `--*-hover` state token exists.
        default:
          "rounded-md border-primary-border bg-primary text-primary-foreground shadow-none hover:bg-primary/90",
        outline:
          "border-border bg-background shadow-sm hover:bg-muted hover:text-foreground hover:shadow aria-expanded:bg-muted aria-expanded:text-foreground dark:border-input dark:bg-input/30 dark:hover:bg-input/50",
        secondary:
          "bg-secondary text-secondary-foreground hover:bg-secondary/80 aria-expanded:bg-secondary aria-expanded:text-secondary-foreground aria-pressed:bg-secondary/60 aria-pressed:text-secondary-foreground aria-pressed:shadow-sm aria-pressed:ring-2 aria-pressed:ring-ring/40",
        // Pressed ≠ hover. A ghost toggle's hover fill is `--muted`, the
        // neutral elevation; its PRESSED state is the app's *selected*
        // vocabulary — the `--sidebar-selected` brand tint (semantic.css
        // "Sidebar selection language"), same as `data-active` rows in
        // `sidebar.tsx` and the rail's selected buttons. The
        // `aria-pressed:hover:` pair is the specificity-tie trick from
        // `sidebar.tsx`: a one-variant `hover:` rule ties with a one-variant
        // `aria-pressed:` rule, so without it hovering a pressed toggle
        // collapses it back to the hover fill.
        //
        // `aria-pressed:font-medium` is kept, and only started working when
        // the base dropped to `font-normal`: against a 500 base it resolved
        // 500 → 500 and rendered nothing. It is the same weight-as-selection
        // signal `sidebar.tsx` uses on `data-active`, and it is the reason
        // weight is reserved on this component rather than spent on resting
        // labels.
        ghost:
          "hover:bg-muted hover:text-foreground aria-expanded:bg-muted aria-expanded:text-foreground aria-pressed:bg-sidebar-selected aria-pressed:font-medium aria-pressed:text-foreground aria-pressed:hover:bg-sidebar-selected aria-pressed:hover:text-foreground dark:hover:bg-muted/50",
        destructive:
          "bg-destructive/10 text-destructive hover:bg-destructive/20 focus-visible:border-destructive/40 focus-visible:ring-destructive/20 dark:bg-destructive/20 dark:hover:bg-destructive/30 dark:focus-visible:ring-destructive/40",
        link: "text-primary underline-offset-4 hover:underline",
        blueprint:
          "border-transparent bg-clip-border text-foreground shadow-none ring-offset-0 transition-[box-shadow,transform,opacity] duration-150 ease-out [background-color:var(--background-blueprint-cell-panel,var(--background-blueprint-cell-origin,var(--background-blueprint-cell,var(--secondary))))] hover:[background-color:var(--background-blueprint-cell-hover,var(--background-blueprint-cell-panel,var(--background-blueprint-cell-origin,var(--background-blueprint-cell))))] aria-pressed:[background-color:var(--background-blueprint-cell-pressed,var(--background-blueprint-cell-hover))] aria-pressed:text-foreground aria-pressed:shadow-sm aria-pressed:ring-2 aria-pressed:ring-[color:var(--ring-blueprint-cell-soft,var(--ring))] focus-visible:border-[color:var(--ring-blueprint-cell-soft,var(--ring))] focus-visible:ring-[color:var(--ring-blueprint-cell-soft,var(--ring))] focus-visible:ring-offset-0",
        blueprintPill:
          "border-transparent bg-clip-border text-foreground shadow-none ring-offset-0 transition-[box-shadow,transform,opacity] duration-150 ease-out [background-color:var(--background-blueprint-cell-panel,var(--background-blueprint-cell-origin,var(--background-blueprint-cell,var(--secondary))))] hover:[background-color:var(--background-blueprint-cell-hover,var(--background-blueprint-cell-panel,var(--background-blueprint-cell-origin,var(--background-blueprint-cell))))] aria-pressed:[background-color:var(--background-blueprint-cell-pressed,var(--background-blueprint-cell-hover))] aria-pressed:text-foreground aria-pressed:shadow-sm aria-pressed:ring-2 aria-pressed:ring-[color:var(--ring-blueprint-cell-soft,var(--ring))] focus-visible:border-[color:var(--ring-blueprint-cell-soft,var(--ring))] focus-visible:ring-[color:var(--ring-blueprint-cell-soft,var(--ring))] focus-visible:ring-offset-0",
      },
      size: {
        default:
          "h-8 gap-1.5 px-2.5 has-data-[icon=inline-end]:pr-2 has-data-[icon=inline-start]:pl-2",
        xs: "h-6 gap-1 rounded-[min(var(--radius-md),10px)] px-2 text-xs in-data-[slot=button-group]:rounded-lg has-data-[icon=inline-end]:pr-1.5 has-data-[icon=inline-start]:pl-1.5 [&_svg:not([class*='size-'])]:size-3",
        sm: "h-7 gap-1 rounded-[min(var(--radius-md),12px)] px-2.5 text-[0.8rem] in-data-[slot=button-group]:rounded-lg has-data-[icon=inline-end]:pr-1.5 has-data-[icon=inline-start]:pl-1.5 [&_svg:not([class*='size-'])]:size-3.5",
        lg: "h-9 gap-1.5 px-2.5 has-data-[icon=inline-end]:pr-2 has-data-[icon=inline-start]:pl-2",
        icon: "size-8",
        "icon-xs":
          "size-6 rounded-[min(var(--radius-md),10px)] in-data-[slot=button-group]:rounded-lg [&_svg:not([class*='size-'])]:size-3",
        "icon-sm":
          "size-7 rounded-[min(var(--radius-md),12px)] in-data-[slot=button-group]:rounded-lg",
        "icon-lg": "size-9",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

function Button({
  className,
  variant = "default",
  size = "default",
  ...props
}: ButtonPrimitive.Props & VariantProps<typeof buttonVariants>) {
  return (
    <ButtonPrimitive
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  )
}

export { Button, buttonVariants }
