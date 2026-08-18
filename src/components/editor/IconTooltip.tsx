import type { ReactElement, ReactNode } from 'react'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'

/**
 * The app's one wrapper for "this button is only an icon, so it has to say
 * what it does".
 *
 * Before this there were five local re-implementations of the identical four
 * lines (`RailButton`, `ToolButton`, `StrokeWeightButton`,
 * `ShapeToolbarTooltip`, the sidebar's row action) and roughly fifty icon
 * buttons with no tooltip at all — a dozen of them making do with a native
 * `title`, which arrives after a second, in the browser's font, and cannot be
 * styled or positioned.
 *
 * Two rules, both non-optional:
 *
 * 1. **The child keeps its own `aria-label`.** A tooltip is not an accessible
 *    name — it is not read by a screen reader in place of one, and it never
 *    appears for a keyboard user who has not hovered. This wrapper adds the
 *    sighted-mouse half of the affordance; the label is the other half and
 *    stays on the button.
 * 2. **Say what it does, not what it is.** "Start a new session", not
 *    "Plus". The existing copy sets the register: "New scenario in
 *    Post-session" or a control's accessible name — action phrases,
 *    never a restated label.
 *
 * No `TooltipProvider` is needed — one is mounted app-wide in `App.tsx` at a
 * 200 ms delay. Wrap in a local provider only to change that delay, the way
 * the annotation toolbar deliberately slows its View/Edit switch down.
 */
export function IconTooltip({
  label,
  side = 'top',
  sideOffset,
  className,
  children,
}: {
  /** What the button does. Also belongs on the child as `aria-label`. */
  label: ReactNode
  side?: 'top' | 'right' | 'bottom' | 'left'
  sideOffset?: number
  /**
   * Only for surfaces that are not the app surface — the floating annotation
   * bars sit on their own dark plane and repaint the popup AND its arrow to
   * match (`**:` selectors). Everywhere else, leave it: one tooltip look.
   */
  className?: string
  /** Exactly one element — it becomes the trigger, not a wrapper around it. */
  children: ReactElement
}) {
  return (
    <Tooltip>
      <TooltipTrigger render={children} />
      <TooltipContent
        side={side}
        sideOffset={sideOffset}
        className={cn('text-xs', className)}
      >
        {label}
      </TooltipContent>
    </Tooltip>
  )
}
