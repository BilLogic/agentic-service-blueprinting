import { Button as ButtonPrimitive } from "@base-ui/react/button"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "group/button inline-flex shrink-0 items-center justify-center rounded-lg border border-transparent bg-clip-padding text-sm font-medium whitespace-nowrap transition-all duration-200 outline-none select-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 active:not-aria-[haspopup]:translate-y-px disabled:pointer-events-none disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:bg-primary/80",
        outline:
          "border-border/80 bg-background shadow-sm hover:bg-muted hover:text-foreground hover:shadow aria-expanded:bg-muted aria-expanded:text-foreground dark:border-input dark:bg-input/30 dark:hover:bg-input/50",
        secondary:
          "bg-secondary text-secondary-foreground hover:bg-[color-mix(in_oklch,var(--secondary),var(--foreground)_5%)] aria-expanded:bg-secondary aria-expanded:text-secondary-foreground aria-pressed:bg-[color-mix(in_oklch,var(--secondary),var(--foreground)_8%)] aria-pressed:text-secondary-foreground aria-pressed:shadow-sm aria-pressed:ring-2 aria-pressed:ring-ring/40",
        ghost:
          "hover:bg-muted hover:text-foreground aria-expanded:bg-muted aria-expanded:text-foreground dark:hover:bg-muted/50",
        destructive:
          "bg-destructive/10 text-destructive hover:bg-destructive/20 focus-visible:border-destructive/40 focus-visible:ring-destructive/20 dark:bg-destructive/20 dark:hover:bg-destructive/30 dark:focus-visible:ring-destructive/40",
        link: "text-primary underline-offset-4 hover:underline",
        blueprint:
          "border-transparent text-foreground shadow-none ring-offset-0 transition-[box-shadow,transform,opacity] duration-150 ease-out [background-color:var(--blueprint-cell-bg-panel,var(--blueprint-cell-bg-origin,var(--blueprint-cell-bg,var(--secondary))))] hover:[background-color:var(--blueprint-cell-bg-hover,var(--blueprint-cell-bg-panel,var(--blueprint-cell-bg-origin,var(--blueprint-cell-bg))))] aria-pressed:[background-color:var(--blueprint-cell-bg-pressed,var(--blueprint-cell-bg-hover))] aria-pressed:text-foreground aria-pressed:shadow-sm aria-pressed:ring-2 aria-pressed:ring-[color:var(--blueprint-cell-ring-soft,var(--ring))] focus-visible:border-[color:var(--blueprint-cell-ring-soft,var(--ring))] focus-visible:ring-[color:var(--blueprint-cell-ring-soft,var(--ring))] focus-visible:ring-offset-0",
        blueprintPill:
          "border-transparent text-foreground shadow-none ring-offset-0 transition-[box-shadow,transform,opacity] duration-150 ease-out [background-color:var(--blueprint-cell-bg-panel,var(--blueprint-cell-bg-origin,var(--blueprint-cell-bg,var(--secondary))))] hover:[background-color:var(--blueprint-cell-bg-hover,var(--blueprint-cell-bg-panel,var(--blueprint-cell-bg-origin,var(--blueprint-cell-bg))))] aria-pressed:[background-color:var(--blueprint-cell-bg-pressed,var(--blueprint-cell-bg-hover))] aria-pressed:text-foreground aria-pressed:shadow-sm aria-pressed:ring-2 aria-pressed:ring-[color:var(--blueprint-cell-ring-soft,var(--ring))] focus-visible:border-[color:var(--blueprint-cell-ring-soft,var(--ring))] focus-visible:ring-[color:var(--blueprint-cell-ring-soft,var(--ring))] focus-visible:ring-offset-0",
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
