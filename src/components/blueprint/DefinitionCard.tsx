import type { ReactElement, RefObject } from 'react'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { cn } from '@/lib/utils'

/**
 * One part of a definition: the word, and what it means.
 *
 * `eyebrow` is a category ("Path", "Staff", "Live") or an instance's own name
 * ("Happy Path", "Blueprint owner"). Both are set the same way, which is the
 * whole point — see `DefinitionCard`.
 */
export type DefinitionSection = {
  eyebrow: string
  body: string
  /**
   * True when `body` is the placeholder rather than authored prose. It changes
   * the BODY only; a section never heads itself differently.
   */
  unwritten?: boolean
}

/**
 * A definition, as ONE shape: sections, each an eyebrow above a body,
 * identically typeset and hairline-separated.
 *
 * One section is a term and its meaning. Two is a category then an instance —
 * PATH over what a path is, then this path's name over its own description.
 *
 * The card heads every section the same way: a small-caps eyebrow over a body.
 * One heading treatment, so the card reads as a pattern rather than as a
 * one-off — the category half and the instance half are typeset identically.
 *
 * The `data-definition-*` attributes are the seam `definitionCard.test.tsx`
 * reads: "every section is typeset the same" is a claim about the rendered
 * sections and cannot be checked any other way.
 */
export function DefinitionCard({ sections }: { sections: DefinitionSection[] }) {
  return (
    <div data-definition-card="" className="flex flex-col">
      {sections.map((section, index) => (
        <div
          key={`${index}-${section.eyebrow}`}
          data-definition-section=""
          /* The hairline separates sections; it never heads one. */
          className={cn(
            'flex flex-col gap-1 px-3 py-2.5',
            index > 0 && 'border-t border-border',
          )}
        >
          {/* Small caps, so the word reads as a label on the sentence under it
              and not as another sentence competing with it. */}
          <span
            data-definition-eyebrow=""
            className="text-3xs font-semibold uppercase tracking-wider text-muted-foreground"
          >
            {section.eyebrow}
          </span>
          <span
            data-definition-body=""
            className={cn(
              'text-xs leading-relaxed text-foreground',
              section.unwritten && 'italic opacity-80',
            )}
          >
            {section.body}
          </span>
        </div>
      ))}
    </div>
  )
}

/**
 * The card, hung off the thing it defines.
 *
 * A POPOVER and never a `Tooltip`, and that is a bug fix rather than a
 * preference. Base UI's `Tooltip` is `mouseOnly` with no press to fall back
 * on, so a definition put there is invisible on a phone — and this app has a
 * real phone posture (a full-width bottom sheet). `Popover` takes `openOnHover`
 * for the pointer and keeps its own press for everyone else: one mechanism
 * reaching both readers.
 *
 * The trigger supplies `tabIndex`, so every definition is reachable by
 * keyboard focus. That is what makes the ⓘ removable: the icon was never what
 * made a definition reachable.
 *
 * Uncontrolled and hover-driven by default, which is every caller but the grid
 * headers. Those own the hover themselves — the definition surfaces from a
 * hover ANYWHERE on the header block, not just over the trigger — so they drive
 * `open` and point the card at the block through `anchor` while turning the
 * trigger's own hover off. The touch ⓘ stays the trigger, so a tap and a
 * keyboard press still open the card the ordinary way.
 */
export function DefinitionPopover({
  sections,
  children,
  side = 'top',
  nativeButton = false,
  className,
  open,
  onOpenChange,
  anchor,
  openOnHover = true,
  delay = 200,
}: {
  sections: DefinitionSection[]
  children: ReactElement
  side?: 'top' | 'bottom' | 'left' | 'right'
  /** False for a `<span>` or a `<Badge>` trigger — Base UI warns otherwise. */
  nativeButton?: boolean
  className?: string
  /** Controlled open state. Omit for the default uncontrolled popover. */
  open?: boolean
  onOpenChange?: (open: boolean) => void
  /**
   * Position the card against this element instead of the trigger — for a
   * definition a surrounding block owns the hover of, so the card centres on
   * the block rather than on a corner ⓘ.
   */
  anchor?: RefObject<Element | null> | Element | null
  /** Whether the trigger opens on its own hover. Off when a block owns it. */
  openOnHover?: boolean
  /** Hover open delay in ms. */
  delay?: number
}) {
  return (
    <Popover open={open} onOpenChange={onOpenChange}>
      <PopoverTrigger
        render={children}
        nativeButton={nativeButton}
        openOnHover={openOnHover}
        delay={delay}
        closeDelay={80}
      />
      <PopoverContent
        side={side}
        sideOffset={6}
        anchor={anchor ?? undefined}
        className={cn('w-auto max-w-xs gap-0 p-0 text-left', className)}
      >
        <DefinitionCard sections={sections} />
      </PopoverContent>
    </Popover>
  )
}
