import { PATH_KIND_COLORS, PATH_KIND_LABELS } from '@/lib/pathKindTheme'
import { getPathColor } from '@/lib/pathColorTheme'
import { cn } from '@/lib/utils'
import type { PathKind } from '@/types/database'

type PathKindColorKeyProps = {
  type: PathKind
  /** When set, uses the stable path identity color (type + name). */
  name?: string
  className?: string
  size?: 'sm' | 'md'
}

/**
 * The colour swatch in a path legend. Pass `name` to get the stable per-path
 * identity colour; without it the swatch falls back to the type's colour.
 */
export function PathKindColorKey({
  type,
  name,
  className,
  size = 'sm',
}: PathKindColorKeyProps) {
  const backgroundColor = name
    ? getPathColor({ kind: type, name })
    : PATH_KIND_COLORS[type]

  return (
    <span
      className={cn(
        'inline-block shrink-0 rounded-full',
        size === 'sm' ? 'size-2.5' : 'size-3',
        className,
      )}
      style={{ backgroundColor }}
      title={name ?? PATH_KIND_LABELS[type]}
      aria-hidden
    />
  )
}
