import type { CSSProperties } from 'react'
import { PathSummaryTooltip } from '@/components/blueprint/PathSummaryTooltip'
import { Badge } from '@/components/ui/badge'
import { getBlueprintFillStyle, PATH_TYPE_COLORS } from '@/lib/pathColorTheme'
import { PATH_TYPE_LABELS, PATH_TYPE_SHORT_LABELS } from '@/lib/pathTypeTheme'
import { cn } from '@/lib/utils'
import type { PathKind } from '@/types/database'

type PathTypeBadgeProps = {
  pathKind: PathKind
  summary?: string | null
  compact?: boolean
  className?: string
  style?: CSSProperties
  side?: 'top' | 'bottom' | 'left' | 'right'
}

/** Compact badge showing path type (Happy, Unhappy, etc.) on overview path frames. */
export function PathKindBadge({
  pathKind,
  summary,
  compact = false,
  className,
  style,
  side = 'top',
}: PathTypeBadgeProps) {
  const label = PATH_TYPE_SHORT_LABELS[pathKind]

  return (
    <PathSummaryTooltip
      summary={summary}
      pathName={PATH_TYPE_LABELS[pathKind]}
      side={side}
    >
      <Badge
        data-blueprint-fill
        className={cn(
          'h-auto max-w-full cursor-default border-transparent px-2.5 py-1 font-semibold',
          compact ? 'text-xs' : 'text-sm',
          className,
        )}
        // Keyed on path *type*, not a path name: this badge labels an archetype
        // and has no name to look up. Reading the type map directly is what the
        // deleted Tailwind-class map did, minus the duplicate source of truth —
        // going through `getPathColor` would need a name, and a fabricated one
        // misses PATH_COLOR_REGISTRY and falls into the hash branch for
        // `alternative` and `named`.
        style={{
          ...getBlueprintFillStyle(PATH_TYPE_COLORS[pathKind]),
          ...style,
        }}
      >
        <span className="truncate leading-none tracking-tight">{label}</span>
      </Badge>
    </PathSummaryTooltip>
  )
}
