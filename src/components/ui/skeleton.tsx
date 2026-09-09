import { cn } from "@/lib/utils"

/**
 * The loading placeholder.
 *
 * No `animate-pulse`: the pulse lives in animations.css keyed off
 * `[data-slot=skeleton]`, on the structural ease and a narrower opacity range,
 * so every skeleton in the app breathes at one rhythm and a reduced-motion
 * reader gets a still bar rather than none at all.
 */
function Skeleton({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="skeleton"
      className={cn("rounded-md bg-muted", className)}
      {...props}
    />
  )
}

export { Skeleton }
