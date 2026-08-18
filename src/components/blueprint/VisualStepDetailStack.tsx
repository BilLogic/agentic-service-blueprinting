import {
  hasEmbeddedVisualFrame,
  type VisualStepPictureEntry,
} from '@/lib/visualWalkthrough'
import { cn } from '@/lib/utils'
import type { CSSProperties } from 'react'

const PICTURE_FRAME_CLASS =
  'relative aspect-[4/3] w-full max-w-full shrink-0 overflow-hidden rounded-lg bg-muted/20'
const PICTURE_CLASS =
  'absolute inset-0 h-full w-full object-contain object-center'

type VisualStepDetailStackProps = {
  entries: VisualStepPictureEntry[]
  /** Side panel stacks vertically; presentation view lays cards out in a row. */
  orientation?: 'vertical' | 'horizontal'
  className?: string
}

/** The screenshots for one step, stacked for the side panel or laid out in a row for presentation. */
export function VisualStepDetailStack({
  entries,
  orientation = 'vertical',
  className,
}: VisualStepDetailStackProps) {
  if (entries.length === 0) {
    return null
  }

  if (orientation === 'horizontal') {
    // Shared rows keep image tops, titles, and descriptions aligned across users.
    const gridStyle = {
      gridTemplateColumns: `repeat(${entries.length}, minmax(0, 1fr))`,
      gridTemplateRows: 'minmax(0, 1fr) auto auto',
    } as CSSProperties

    return (
      <div
        className={cn('grid h-full min-h-0 gap-x-4 gap-y-2.5', className)}
        style={gridStyle}
      >
        {entries.map((entry, index) => (
          <div
            key={`picture-${entry.layerName}`}
            className="relative min-h-0 w-full overflow-hidden rounded-lg bg-muted/20"
            style={{ gridColumn: index + 1, gridRow: 1 }}
          >
            <img
              src={entry.picture}
              alt=""
              loading="lazy"
              decoding="async"
              className={cn(
                PICTURE_CLASS,
                hasEmbeddedVisualFrame(entry.picture) && 'scale-[1.08]',
              )}
            />
          </div>
        ))}

        {entries.map((entry, index) => (
          <p
            key={`label-${entry.layerName}`}
            className="self-start text-xs font-semibold leading-snug text-foreground/90"
            style={{ gridColumn: index + 1, gridRow: 2 }}
          >
            {entry.label}
          </p>
        ))}

        {entries.map((entry, index) => (
          <p
            key={`description-${entry.layerName}`}
            className="line-clamp-3 self-start overflow-hidden text-sm leading-relaxed whitespace-pre-wrap text-foreground"
            style={{ gridColumn: index + 1, gridRow: 3 }}
          >
            {entry.description || (
              <span className="text-muted-foreground">No description</span>
            )}
          </p>
        ))}
      </div>
    )
  }

  return (
    <div className={cn('flex flex-col gap-5', className)}>
      {entries.map((entry) => (
        <div key={entry.layerName} className="flex flex-col gap-2.5">
          <div className={PICTURE_FRAME_CLASS}>
            <img
              src={entry.picture}
              alt=""
              loading="lazy"
              decoding="async"
              className={cn(
                PICTURE_CLASS,
                hasEmbeddedVisualFrame(entry.picture) && 'scale-[1.08]',
              )}
            />
          </div>
          <p className="text-xs font-semibold leading-snug text-foreground/90">
            {entry.label}
          </p>
          <p className="text-sm leading-relaxed whitespace-pre-wrap text-foreground">
            {entry.description || (
              <span className="text-muted-foreground">No description</span>
            )}
          </p>
        </div>
      ))}
    </div>
  )
}
