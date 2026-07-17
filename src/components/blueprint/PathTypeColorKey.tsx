import { PATH_TYPE_COLORS, PATH_TYPE_LABELS } from '@/lib/pathTypeTheme'
import { getPathColor } from '@/lib/pathColorTheme'
import { cn } from '@/lib/utils'
import type { PathType } from '@/types/database'

type PathTypeColorKeyProps = {
  type: PathType
  /** When set, uses the stable path identity color (type + name). */
  name?: string
  className?: string
  size?: 'sm' | 'md'
}

export function PathTypeColorKey({
  type,
  name,
  className,
  size = 'sm',
}: PathTypeColorKeyProps) {
  const backgroundColor = name
    ? getPathColor({ path_type: type, name })
    : PATH_TYPE_COLORS[type]

  return (
    <span
      className={cn(
        'inline-block shrink-0 rounded-full',
        size === 'sm' ? 'size-2.5' : 'size-3',
        className,
      )}
      style={{ backgroundColor }}
      title={name ?? PATH_TYPE_LABELS[type]}
      aria-hidden
    />
  )
}
