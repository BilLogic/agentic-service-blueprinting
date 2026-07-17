import type { CSSProperties } from 'react'
import { PathDescriptionTooltip } from '@/components/blueprint/PathDescriptionTooltip'
import { Badge } from '@/components/ui/badge'
import {
  PATH_TYPE_BADGE_CLASSES,
  PATH_TYPE_LABELS,
  PATH_TYPE_SHORT_LABELS,
} from '@/lib/pathTypeTheme'
import { cn } from '@/lib/utils'
import type { PathType } from '@/types/database'

type PathTypeBadgeProps = {
  pathType: PathType
  description?: string | null
  compact?: boolean
  className?: string
  style?: CSSProperties
  side?: 'top' | 'bottom' | 'left' | 'right'
}

/** Compact badge showing path type (Happy, Unhappy, etc.) on overview path frames. */
export function PathTypeBadge({
  pathType,
  description,
  compact = false,
  className,
  style,
  side = 'top',
}: PathTypeBadgeProps) {
  const label = PATH_TYPE_SHORT_LABELS[pathType]

  return (
    <PathDescriptionTooltip
      description={description}
      pathName={PATH_TYPE_LABELS[pathType]}
      side={side}
    >
      <Badge
        className={cn(
          'h-auto max-w-full cursor-default border-transparent px-2.5 py-1 font-semibold',
          PATH_TYPE_BADGE_CLASSES[pathType],
          compact ? 'text-xs' : 'text-sm',
          className,
        )}
        style={style}
      >
        <span className="truncate leading-none tracking-tight">{label}</span>
      </Badge>
    </PathDescriptionTooltip>
  )
}
