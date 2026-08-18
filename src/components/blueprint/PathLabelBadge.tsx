import type { CSSProperties, MouseEvent } from 'react'
import { X } from 'lucide-react'
import { PathDescriptionTooltip } from '@/components/blueprint/PathDescriptionTooltip'
import { Badge } from '@/components/ui/badge'
import { getPathBadgeStyle } from '@/lib/pathColorTheme'
import { cn } from '@/lib/utils'
import type { PathType } from '@/types/database'

type PathLabelBadgeProps = {
  name: string
  description: string | null | undefined
  pathType: PathType
  compact?: boolean
  className?: string
  style?: CSSProperties
  side?: 'top' | 'bottom' | 'left' | 'right'
  /** When set, shows a dismiss control that removes this path from the active set. */
  onRemove?: () => void
  /**
   * Path descriptions are scenario-specific — set false on overview/phase chrome.
   * Defaults to true.
   */
  showTooltip?: boolean
}

/** Path name pill with shadcn Badge styling, path-type color, and description tooltip. */
export function PathLabelBadge({
  name,
  description,
  pathType,
  compact = false,
  className,
  style,
  side = 'top',
  onRemove,
  showTooltip = true,
}: PathLabelBadgeProps) {
  const handleRemove = (event: MouseEvent<HTMLButtonElement>) => {
    event.preventDefault()
    event.stopPropagation()
    onRemove?.()
  }

  const badge = (
    <Badge
      // Fill AND its derived ink come from this one attribute (blueprint.css).
      data-blueprint-fill
      className={cn(
        'max-w-full cursor-default border-transparent font-semibold',
        onRemove ? 'gap-0.5 pl-1' : 'gap-1',
        compact ? 'h-5 px-2 py-0.5 text-xs' : 'h-auto px-2.5 py-1 text-sm',
        className,
      )}
      style={{
        ...getPathBadgeStyle({ path_type: pathType, name }),
        ...style,
      }}
    >
      {onRemove ? (
        <button
          type="button"
          className={cn(
            'inline-flex size-3 shrink-0 items-center justify-center rounded-sm',
            // Inherit the badge's paired ink, and wash the hover with it —
            // a fixed white/20 is invisible on the light fills dark mode uses.
            'transition-colors hover:bg-current/20',
            'focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-current/70',
          )}
          aria-label={`Remove ${name}`}
          onClick={handleRemove}
          onPointerDown={(event) => event.stopPropagation()}
        >
          <X className="size-2.5" strokeWidth={2.75} aria-hidden />
        </button>
      ) : null}
      <span className="truncate leading-none tracking-tight">{name}</span>
    </Badge>
  )

  if (!showTooltip) return badge

  return (
    <PathDescriptionTooltip
      description={description}
      pathName={name}
      side={side}
    >
      {badge}
    </PathDescriptionTooltip>
  )
}
