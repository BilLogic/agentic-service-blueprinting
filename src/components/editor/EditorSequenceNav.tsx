import { ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useEditor } from '@/contexts/EditorContext'
import {
  getParentSlide,
  getSlideDisplayLabel,
  getSlideSequenceNav,
  isSubslide,
  type Slide,
} from '@/types/slides'
import { cn } from '@/lib/utils'

type SequenceNavPreviewProps = {
  direction: 'prev' | 'next'
  slide: Slide
  slides: Slide[]
  onClick: () => void
}

function SequenceNavPreview({
  direction,
  slide,
  slides,
  onClick,
}: SequenceNavPreviewProps) {
  const isPrev = direction === 'prev'
  const Icon = isPrev ? ChevronLeft : ChevronRight
  const actionLabel = isPrev ? 'Previous' : 'Next'
  const title = getSlideDisplayLabel(slide, slides)
  const parent = isSubslide(slide) ? getParentSlide(slide, slides) : undefined
  const phaseLabel = parent ? getSlideDisplayLabel(parent, slides) : null
  const accessibleLabel = phaseLabel ? `${phaseLabel}, ${title}` : title
  const ariaLabel = `${actionLabel}: ${accessibleLabel}`

  const label = (
    <span
      className={cn(
        'flex min-w-0 flex-col leading-tight',
        isPrev ? 'items-start text-left' : 'items-end text-right',
      )}
    >
      {phaseLabel ? (
        <span className="truncate text-[10px] font-normal text-muted-foreground">
          {phaseLabel}
        </span>
      ) : null}
      <span className="truncate text-xs font-medium">{title}</span>
    </span>
  )

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      onClick={onClick}
      aria-label={ariaLabel}
      data-canvas-nav=""
      className={cn(
        'pointer-events-auto absolute bottom-3 z-30 h-auto max-w-40 gap-1.5 py-1.5',
        isPrev ? 'left-3' : 'right-3',
      )}
    >
      {isPrev ? (
        <>
          <Icon className="size-3.5 shrink-0" aria-hidden />
          {label}
        </>
      ) : (
        <>
          {label}
          <Icon className="size-3.5 shrink-0" aria-hidden />
        </>
      )}
    </Button>
  )
}

export function EditorSequenceNav() {
  const { slides, activeSlideId, setActiveSlideId } = useEditor()
  const { prev, next } = getSlideSequenceNav(activeSlideId, slides)

  if (!prev && !next) return null

  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-0 z-30 h-0">
      {prev ? (
        <SequenceNavPreview
          direction="prev"
          slide={prev}
          slides={slides}
          onClick={() => setActiveSlideId(prev.id)}
        />
      ) : null}
      {next ? (
        <SequenceNavPreview
          direction="next"
          slide={next}
          slides={slides}
          onClick={() => setActiveSlideId(next.id)}
        />
      ) : null}
    </div>
  )
}
