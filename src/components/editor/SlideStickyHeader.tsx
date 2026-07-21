import type { CSSProperties } from 'react'
import type { PathOption } from '@/components/blueprint/PathMultiSelect'
import { PhaseMenubarHeader } from '@/components/editor/PhaseMenubarHeader'
import {
  getSlideDisplayLabel,
  isSubslide,
  type NavItem,
} from '@/types/nav'
import { cn } from '@/lib/utils'

type SlideHeaderContentProps = {
  slide: NavItem
  slides: NavItem[]
  paths: PathOption[]
  selectedPathIds: string[]
  onTogglePath?: (pathId: string) => void
  /** When true, title and description share one row inside a menubar. */
  inlineDescription?: boolean
}

function resolveScenarioDescription(
  slide: NavItem,
  paths: PathOption[],
  selectedPathIds: string[],
): string | null | undefined {
  if (slide.description?.trim()) return slide.description

  const selectedPath = paths.find((path) => selectedPathIds.includes(path.id))
  return selectedPath?.description ?? paths[0]?.description ?? null
}

function SlideHeaderContent({
  slide,
  slides,
  paths,
  selectedPathIds,
  onTogglePath,
  inlineDescription = false,
}: SlideHeaderContentProps) {
  if (inlineDescription) {
    return (
      <PhaseMenubarHeader
        slide={slide}
        slides={slides}
        paths={paths}
        selectedPathIds={selectedPathIds}
        onTogglePath={onTogglePath}
        showFilters
      />
    )
  }

  const label = getSlideDisplayLabel(slide, slides)
  const isScenario = isSubslide(slide)

  const description = isScenario
    ? resolveScenarioDescription(slide, paths, selectedPathIds)
    : slide.description ??
      paths[0]?.description ??
      'Scenarios in this phase and how they connect.'

  return (
    <div
      className={cn(
        'rounded-2xl border border-border/80 bg-card shadow-sm',
        'px-4 py-3',
      )}
    >
      <div className="flex items-start gap-2">
        <div className="min-w-0 flex-1">
          <div className="flex min-w-0 items-center gap-1.5">
            <h1 className="text-base font-semibold tracking-tight text-foreground">
              {label}
            </h1>
          </div>
          {description ? (
            <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
              {description}
            </p>
          ) : null}
        </div>
      </div>
    </div>
  )
}

type SlideStickyHeaderProps = SlideHeaderContentProps & {
  className?: string
}

/** Fixed overlay header for stack view. */
export function SlideStickyHeader({
  className,
  ...contentProps
}: SlideStickyHeaderProps) {
  return (
    <div
      data-slide-sticky-header
      className={cn(
        'pointer-events-none absolute inset-x-0 top-0 z-20 px-4 pt-4',
        className,
      )}
      onPointerDown={(e) => e.stopPropagation()}
    >
      <div className="pointer-events-auto w-full">
        <SlideHeaderContent {...contentProps} inlineDescription />
      </div>
    </div>
  )
}

type CanvasSlideHeaderProps = SlideHeaderContentProps & {
  style: CSSProperties
  className?: string
}

/** Header anchored above an artboard on the pannable canvas. */
export function CanvasSlideHeader({
  style,
  className,
  ...contentProps
}: CanvasSlideHeaderProps) {
  return (
    <div
      data-slide-sticky-header
      className={cn('pointer-events-none absolute z-10', className)}
      style={style}
      onPointerDown={(e) => e.stopPropagation()}
    >
      <div className="pointer-events-auto w-full">
        <SlideHeaderContent {...contentProps} />
      </div>
    </div>
  )
}
