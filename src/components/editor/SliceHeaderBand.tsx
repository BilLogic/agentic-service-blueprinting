import type { LucideIcon } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import type { SliceDetail } from '@/hooks/useSlice'
import {
  useCollapsedNavSummary,
  useSidebarCollapsedState,
} from '@/contexts/sidebarCollapsedContext'
import { ground } from '@/lib/ground'
import { cn } from '@/lib/utils'

export type SliceHeaderPrimaryAction = {
  label: string
  icon: LucideIcon
  onClick: () => void
}

/**
 * Slice identity band — one component, two modes. It docks full-width under
 * the tab strip in the slice focus tab and at the top of the presentation
 * stage, so switching between the two reads as a mode change on one object
 * rather than as two unrelated screens.
 *
 * Two rows, non-collapsible: slice identity (◇ title + type badge) with the
 * primary action on the far right, then the slice description as an
 * always-visible subtitle (em-dash when empty — authoring should require a
 * description going forward), with the missing-cells notice beside it when
 * nonzero.
 *
 * Every color is a token, so the band picks up dark tokens for free inside
 * the presentation surface (whose root carries `.dark`).
 */
export function SliceHeaderBand({
  detail,
  missingCellCount = 0,
  primaryAction,
  secondaryAction,
  className,
}: {
  detail: SliceDetail
  missingCellCount?: number
  primaryAction: SliceHeaderPrimaryAction
  /** Ghost action left of the primary — Edit in the focus tab. */
  secondaryAction?: SliceHeaderPrimaryAction
  className?: string
}) {
  const SecondaryIcon = secondaryAction?.icon
  const description = detail.slice.summary?.trim()
  const PrimaryIcon = primaryAction.icon

  // Collapsed: the floating navbar is the only header on screen, so hand it
  // this slice's identity and primary action and draw nothing here.
  const { collapsed } = useSidebarCollapsedState()
  useCollapsedNavSummary(
    collapsed
      ? {
          title: detail.slice.title,
          glyph: '◇',
          action: { label: primaryAction.label, onClick: primaryAction.onClick },
        }
      : null,
  )
  if (collapsed) return null

  return (
    <div
      data-editor-navbar
      {...ground('sidebar')}
      className={cn(
        'flex w-full shrink-0 items-center gap-3 border-b border-border bg-sidebar px-4 py-2',
        className,
      )}
      onPointerDown={(event) => event.stopPropagation()}
      onClick={(event) => event.stopPropagation()}
    >
      <div className="min-w-0 flex-1">
        <div className="flex min-w-0 items-center gap-2">
          {/* No ◇ glyph: the header already says what this is; a decorative
              icon just indents the title away from its own caption. */}
          <h2 className="min-w-0 truncate text-sm font-semibold">
            {detail.slice.title}
          </h2>
          {/* A raw `kind` enum, not a written label — mono so it reads
              as the stored value it is, on a real filled badge. */}
          <Badge
            variant="secondary"
            className="shrink-0 border-muted bg-foreground/5 font-mono text-muted-foreground"
          >
            {detail.slice.kind}
          </Badge>
        </div>
        <div className="mt-0.5 flex min-w-0 items-baseline gap-2">
          <p className="min-w-0 truncate text-xs text-muted-foreground">
            {description || '—'}
          </p>
          {/* Warning reads as a tinted badge rather than amber body copy:
              `--warning` is the solid-fill role and does not clear 4.5:1 as
              text on the card. So the role names its tint and the edge that
              belongs to it, and the copy stays at `--foreground` — 17:1 on
              that tint in light and 14:1 in dark, with the edge a quiet
              1.24–1.27:1 off it. */}
          {missingCellCount > 0 && (
            <span className="shrink-0 rounded-sm border border-border-warning bg-surface-warning px-1.5 py-0.5 text-xs text-foreground">
              {missingCellCount} {missingCellCount === 1 ? 'cell' : 'cells'} no
              longer in the blueprint
            </span>
          )}
        </div>
      </div>

      {secondaryAction && SecondaryIcon ? (
        <Button
          type="button"
          size="sm"
          variant="ghost"
          className="shrink-0 gap-1.5"
          onClick={secondaryAction.onClick}
        >
          <SecondaryIcon className="size-3" aria-hidden />
          {secondaryAction.label}
        </Button>
      ) : null}

      <Button
        type="button"
        size="sm"
        className="shrink-0 gap-1.5"
        onClick={primaryAction.onClick}
      >
        <PrimaryIcon className="size-3" aria-hidden />
        {primaryAction.label}
      </Button>
    </div>
  )
}
