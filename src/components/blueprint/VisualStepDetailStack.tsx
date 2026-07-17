import type { VisualStepPictureEntry } from '@/lib/visualWalkthrough'
import { cn } from '@/lib/utils'

const PICTURE_FRAME_CLASS =
  'relative aspect-[4/3] w-full max-w-full shrink-0 overflow-hidden rounded-lg bg-muted/20'
const PICTURE_CLASS =
  'absolute inset-0 h-full w-full object-contain object-center'

type VisualStepDetailStackProps = {
  entries: VisualStepPictureEntry[]
  className?: string
}

export function VisualStepDetailStack({
  entries,
  className,
}: VisualStepDetailStackProps) {
  if (entries.length === 0) {
    return null
  }

  return (
    <div className={cn('flex flex-col gap-5', className)}>
      {entries.map((entry) => (
        <div key={entry.layerName} className="flex flex-col gap-2.5">
          <div className={PICTURE_FRAME_CLASS}>
            <img src={entry.picture} alt="" className={PICTURE_CLASS} />
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
