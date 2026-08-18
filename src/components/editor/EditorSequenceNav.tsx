import { ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useEditor } from '@/contexts/EditorContext'
import {
  getParentSlide,
  getSlideDisplayLabel,
  getSlideSequenceNav,
  isSubslide,
  type NavItem,
} from '@/types/nav'
import { cn } from '@/lib/utils'

type SequenceNavPreviewProps = {
  direction: 'prev' | 'next'
  slide: NavItem
  slides: NavItem[]
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

  // Both buttons always render the same two-line structure so the pair
  // shares one height and baseline: the phase line is reserved (invisible)
  // when the target is a phase itself.
  const label = (
    <span
      className={cn(
        'flex min-w-0 flex-col leading-tight',
        isPrev ? 'items-start text-left' : 'items-end text-right',
      )}
    >
      <span
        className={cn(
          'w-full truncate text-3xs font-normal text-muted-foreground',
          !phaseLabel && 'invisible',
        )}
        aria-hidden={!phaseLabel}
      >
        {phaseLabel ?? '\u00A0'}
      </span>
      <span className="w-full truncate text-xs font-medium">{title}</span>
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
        /*
          Ordinary elevated chrome. This used to pin itself white in both
          themes ("the nav floats over the always-light canvas") on Tailwind's
          default `neutral` ramp — a premise that has been stale since the
          board moved onto the semantic tokens and started following the
          theme with the rest of the app (see `blueprintTheme.ts`, and its
          deleted `canvasDark` / `labelRailDark` keys). A white pill on the
          dark board was the visible cost.
        */
        'border-border bg-card text-foreground shadow-sm',
        'hover:bg-accent hover:text-foreground',
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

/** Previous/next slide controls; renders nothing when the active slide is alone in its sequence. */
export function EditorSequenceNav() {
  const { slides, activeSlideId, openDetail } = useEditor()
  const { prev, next } = getSlideSequenceNav(activeSlideId, slides)

  if (!prev && !next) return null

  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-0 z-30 h-0">
      {prev ? (
        <SequenceNavPreview
          direction="prev"
          slide={prev}
          slides={slides}
          onClick={() => openDetail(prev.id)}
        />
      ) : null}
      {next ? (
        <SequenceNavPreview
          direction="next"
          slide={next}
          slides={slides}
          onClick={() => openDetail(next.id)}
        />
      ) : null}
    </div>
  )
}
