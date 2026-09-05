import { PANEL_TEXT } from '@/lib/panelText'
import { cn } from '@/lib/utils'

/**
 * An ordinary word naming a section, with nothing behind it.
 *
 * `Status`, `Paths`, `Position` — these carried definitions until #244, on the
 * reasoning that a reader who does not know the vocabulary needs help. They
 * are not the vocabulary. A sentence explaining that a field called Status
 * holds a status helps nobody, and eleven of them taught readers that hovering
 * a label is not worth doing — which cost the words that DO need explaining
 * the only affordance they have.
 *
 * The two words that need it — `Touchpoint`, `Storyboard` — are `Field` labels
 * now, carrying their definition on the label's hint popover (#307). This is
 * the shape for everything else, and it is deliberately inert: no popover, no
 * focus ring, nothing to reach, because there is nothing there.
 */
export function PanelSectionLabel({
  children,
  className,
}: {
  children: string
  className?: string
}) {
  return (
    <span className={cn(PANEL_TEXT.sectionLabel, className)}>{children}</span>
  )
}
