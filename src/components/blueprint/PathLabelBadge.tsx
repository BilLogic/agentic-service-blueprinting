import type { CSSProperties } from 'react'
import { EntityDefinitionPopover } from '@/components/blueprint/EntityDefinitionPopover'
import { Badge } from '@/components/ui/badge'
import { getPathBadgeStyle } from '@/lib/pathColorTheme'
import { cn } from '@/lib/utils'
import type { PathKind } from '@/types/database'

type PathLabelBadgeProps = {
  name: string
  summary: string | null | undefined
  pathKind: PathKind
  compact?: boolean
  className?: string
  style?: CSSProperties
  side?: 'top' | 'bottom' | 'left' | 'right'
  /**
   * Path descriptions are scenario-specific — set false on overview/phase chrome.
   * Defaults to true.
   */
  showTooltip?: boolean
}

/**
 * The path's name as a BADGE: what this band, column or cell belongs to.
 *
 * One per path, drawn from no set the reader picks from, and not clickable —
 * so it takes the badge's geometry, the path-type colour, and what a path IS
 * on hover, on focus and on tap. It carried a dismiss control until #182;
 * nothing ever passed one, and a removable value is a TAG rather than a badge,
 * which is a different component with a different promise (see
 * `OwnerTagSelect`, the only one in the app).
 *
 * The explanation is a POPOVER rather than a tooltip since #140: a tooltip
 * never opens on touch, so on a phone this badge explained nothing at all.
 */
export function PathLabelBadge({
  name,
  summary,
  pathKind,
  compact = false,
  className,
  style,
  side = 'top',
  showTooltip = true,
}: PathLabelBadgeProps) {
  const badge = (
    <Badge
      // Fill AND its derived ink come from this one attribute (blueprint.css).
      data-blueprint-fill
      // The two shapes are `ui/badge.tsx`'s to name; this badge only says
      // which one it is wearing (#149). Compact IS the badge's own size.
      size={compact ? 'default' : 'comfortable'}
      // One cursor whether or not there is an explanation behind it (#243).
      // The help cursor used to be drawn only where the popover was shown,
      // which was the right rule for a mark that promised something; with the
      // mark gone there is nothing to withhold. The popover trigger still
      // supplies `tabIndex`, so the explained case is reachable by keyboard.
      className={cn(
        'max-w-full cursor-default gap-1 border-transparent font-semibold',
        className,
      )}
      style={{
        ...getPathBadgeStyle({ kind: pathKind, name }),
        ...style,
      }}
    >
      <span className="truncate leading-none tracking-tight">{name}</span>
    </Badge>
  )

  if (!showTooltip) return badge

  return (
    <EntityDefinitionPopover
      kind="path"
      description={summary}
      name={name}
      showDescription
      side={side}
    >
      {badge}
    </EntityDefinitionPopover>
  )
}
