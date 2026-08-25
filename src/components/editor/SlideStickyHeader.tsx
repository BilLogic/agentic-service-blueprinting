import type { CSSProperties } from 'react'
import type { PathOption } from '@/components/blueprint/PathMultiSelect'
import { PathSelectorMenu } from '@/components/editor/PathSelectorMenu'
import {
  CompareControlsCluster,
  PhaseMenubarHeader,
} from '@/components/editor/PhaseMenubarHeader'
import {
  BLUEPRINT_MENUBAR_FLAT_CLASS,
  BLUEPRINT_NAVBAR_BAR_CLASS,
} from '@/components/editor/menubarHeaderLayout'
import {
  useCollapsedNavSummary,
  useSidebarCollapsedState,
} from '@/contexts/sidebarCollapsedContext'
import {
  getSlideDisplayLabel,
  isSubslide,
  type NavItem,
} from '@/types/nav'
import { cn } from '@/lib/utils'

type SlideHeaderContentProps = {
  slide: NavItem
  slides: NavItem[]
  /** Paths still inform the summary fallback; filtering lives in the sidebar. */
  paths: PathOption[]
  selectedPathIds: string[]
  /** When true, title and summary share one row inside a menubar. */
  inlineSummary?: boolean
}

function resolveScenarioSummary(
  slide: NavItem,
  paths: PathOption[],
  selectedPathIds: string[],
): string | null | undefined {
  if (slide.summary?.trim()) return slide.summary

  const selectedPath = paths.find((path) => selectedPathIds.includes(path.id))
  return selectedPath?.summary ?? paths[0]?.summary ?? null
}

function SlideHeaderContent({
  slide,
  slides,
  paths,
  selectedPathIds,
  inlineSummary = false,
}: SlideHeaderContentProps) {
  if (inlineSummary) {
    return (
      <PhaseMenubarHeader
        slide={slide}
        slides={slides}
        paths={paths}
        selectedPathIds={selectedPathIds}
      />
    )
  }

  const label = getSlideDisplayLabel(slide, slides)
  const isScenario = isSubslide(slide)

  const summary = isScenario
    ? resolveScenarioSummary(slide, paths, selectedPathIds)
    : slide.summary ??
      paths[0]?.summary ??
      'Scenarios in this phase and how they connect.'

  return (
    <div
      className={cn(
        'rounded-2xl border border-muted bg-card shadow-sm',
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
          {summary ? (
            <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
              {summary}
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

/** Docked horizontal navbar above the canvas (main column only). */
export function SlideStickyHeader({
  className,
  ...contentProps
}: SlideStickyHeaderProps) {
  // Collapsed: the floating pill carries this header's identity instead —
  // one chrome lane at any width. Path filters and the zoom readout are
  // deliberately not folded in; they come back when the sidebar does.
  const { collapsed } = useSidebarCollapsedState()
  useCollapsedNavSummary(
    collapsed
      ? {
          title: getSlideDisplayLabel(contentProps.slide, contentProps.slides),
        }
      : null,
  )
  if (collapsed) return null

  return (
    <div
      data-editor-navbar
      className={cn(
        'relative flex items-center gap-3',
        BLUEPRINT_NAVBAR_BAR_CLASS,
        className,
      )}
      onPointerDown={(e) => e.stopPropagation()}
    >
      <PhaseMenubarHeader
        slide={contentProps.slide}
        slides={contentProps.slides}
        paths={contentProps.paths}
        selectedPathIds={contentProps.selectedPathIds}
        className={cn('min-w-0 flex-1', BLUEPRINT_MENUBAR_FLAT_CLASS)}
      />
      {/* Right cluster in FLOW, not absolute: the title's truncation now
          respects the controls' real width instead of running under them.
          One edge, one gap rhythm for every view control. */}
      <div className="flex shrink-0 items-center gap-2">
        <CompareControlsCluster
          slide={contentProps.slide}
          selectedPathIds={contentProps.selectedPathIds}
        />
        <PathSelectorMenu options={contentProps.paths} />
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
