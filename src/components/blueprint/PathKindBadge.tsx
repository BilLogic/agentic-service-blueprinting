import type { CSSProperties } from 'react'
import { PathSummaryTooltip } from '@/components/blueprint/PathSummaryTooltip'
import { Badge } from '@/components/ui/badge'
import { getBlueprintFillStyle, PATH_KIND_COLORS } from '@/lib/pathColorTheme'
import { PATH_KIND_LABELS, PATH_KIND_SHORT_LABELS } from '@/lib/pathKindTheme'
import { cn } from '@/lib/utils'
import type { PathKind } from '@/types/database'

type PathKindBadgeProps = {
  pathKind: PathKind
  summary?: string | null
  compact?: boolean
  className?: string
  style?: CSSProperties
  side?: 'top' | 'bottom' | 'left' | 'right'
}

/** Compact badge showing path kind (Happy, Variant, Exception) on overview path frames. */
export function PathKindBadge({
  pathKind,
  summary,
  compact = false,
  className,
  style,
  side = 'top',
}: PathKindBadgeProps) {
  const label = PATH_KIND_SHORT_LABELS[pathKind]

  return (
    <PathSummaryTooltip
      summary={summary}
      pathName={PATH_KIND_LABELS[pathKind]}
      side={side}
    >
      <Badge
        data-blueprint-fill
        // Both shapes take the roomier padding — a type archetype is read at
        // canvas zoom — so `compact` moves only the type scale. Which is why
        // this badge's compact is NOT `PathLabelBadge`'s.
        size={compact ? 'roomy' : 'comfortable'}
        className={cn(
          'max-w-full cursor-default border-transparent font-semibold',
          className,
        )}
        // Keyed on path *type*, not a path name: this badge labels an archetype
        // and has no name to look up. Reading the type map directly is what the
        // deleted Tailwind-class map did, minus the duplicate source of truth —
        // going through `getPathColor` would need a name, and a fabricated one
        // misses PATH_COLOR_REGISTRY and falls into the hash branch for
        // `alternative` and `named`.
        style={{
          ...getBlueprintFillStyle(PATH_KIND_COLORS[pathKind]),
          ...style,
        }}
      >
        <span className="truncate leading-none tracking-tight">{label}</span>
      </Badge>
    </PathSummaryTooltip>
  )
}
