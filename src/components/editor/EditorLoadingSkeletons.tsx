import { Skeleton } from '@/components/ui/skeleton'
import { BLUEPRINT_THEME } from '@/lib/blueprintTheme'
import {
  OVERVIEW_CANVAS_PADDING_X,
  OVERVIEW_CANVAS_PADDING_Y,
  OVERVIEW_PHASE_ROW_GAP,
  OVERVIEW_SCENARIO_GAP,
} from '@/lib/overviewLayout'
import { COMPARE_MIN_PANEL_HEIGHT } from '@/lib/sideBySideCompareLayout'
import { cn } from '@/lib/utils'

type BlueprintPanelLoadingSkeletonProps = {
  className?: string
  /** Approximate panel height (defaults to compare min). */
  height?: number
  /**
   * Fixed width in px. Pass `null` for fluid/`w-full` (pair with className).
   * Defaults to 640.
   */
  width?: number | null
  /** Show a title chip above the panel. */
  showTitle?: boolean
}

/** Single scenario/blueprint panel placeholder. */
export function BlueprintPanelLoadingSkeleton({
  className,
  height = COMPARE_MIN_PANEL_HEIGHT,
  width = 640,
  showTitle = true,
}: BlueprintPanelLoadingSkeletonProps) {
  const isFluid = width == null

  return (
    <div
      className={cn('flex shrink-0 flex-col gap-2', className)}
      aria-hidden
    >
      {showTitle ? <Skeleton className="h-5 w-40 rounded-full" /> : null}
      <Skeleton
        className={cn('rounded-2xl', isFluid && 'w-full min-h-[320px]')}
        style={{
          height,
          ...(isFluid ? {} : { width }),
        }}
      />
    </div>
  )
}

/** Width of one scenario placeholder panel, matching the loaded artboards. */
const SKELETON_PANEL_WIDTH = 640

/** A phase row's shape, taken from nav metadata before blueprints load. */
export type OverviewSkeletonPhase = {
  id: string
  /** Scenarios in this phase — one placeholder artboard each. */
  scenarioCount: number
}

/**
 * Neutral shape used only when nav metadata has not arrived within the
 * skeleton hold — a cold boot where even the phase list is still in flight.
 * Every other case is shaped from the real lifecycle.
 */
const UNKNOWN_SHAPE: OverviewSkeletonPhase[] = [
  { id: 'unknown', scenarioCount: 2 },
]

/**
 * Service-overview canvas placeholder, shaped from the real phase and
 * scenario counts. It carries `data-canvas-fit` and mounts *inside* the
 * viewport, so the camera frames these placeholder artboards and the first
 * content paint is already at the fitted transform.
 *
 * Deliberately not progressive: this is one flat placeholder that swaps to
 * the real canvas in a single commit, never a frame that fills in.
 *
 * INVISIBLE since the determinate progress bar landed (decided 2026-08-17):
 * the bar is the only visible loading signal — a ghost grid under it read
 * as clutter. The skeleton still mounts because its dimensions are what
 * the camera pre-fits against; only its ink is gone.
 */
export function ServiceOverviewCanvasSkeleton({
  phases,
  loopChannelOffset = 0,
}: {
  phases: OverviewSkeletonPhase[]
  /** Extra left padding when the lifecycle loop arrow has a channel. */
  loopChannelOffset?: number
}) {
  const rows = phases.length > 0 ? phases : UNKNOWN_SHAPE

  return (
    // Nothing here paints — every visual element is deleted (decided
    // 2026-08-17: the progress bar is the ONLY visible loading signal).
    // What remains is pure geometry: one spacer per phase row at the loaded
    // board's dimensions, so the camera pre-fit still frames the right
    // rectangle and the content swap lands at the final transform.
    <div
      data-canvas-fit
      aria-hidden
      className="invisible relative inline-flex w-max flex-col items-start"
      style={{
        paddingTop: OVERVIEW_CANVAS_PADDING_Y,
        paddingBottom: OVERVIEW_CANVAS_PADDING_Y,
        paddingRight: OVERVIEW_CANVAS_PADDING_X,
        paddingLeft: OVERVIEW_CANVAS_PADDING_X + loopChannelOffset,
      }}
    >
      {rows.map((phase, phaseIndex) => (
        <div
          key={phase.id}
          style={{
            width:
              Math.max(1, phase.scenarioCount) * SKELETON_PANEL_WIDTH +
              (Math.max(1, phase.scenarioCount) - 1) * OVERVIEW_SCENARIO_GAP,
            height: COMPARE_MIN_PANEL_HEIGHT,
            marginBottom:
              phaseIndex < rows.length - 1 ? OVERVIEW_PHASE_ROW_GAP : undefined,
          }}
        />
      ))}
    </div>
  )
}

/**
 * Placeholder for a canvas surface whose viewport has not mounted yet (a
 * slice tab still resolving which scenario owns its cells). Positioned at
 * the viewport's own fit insets so it occupies the same rectangle the
 * camera-fitted skeleton will, and the hand-off reads as one placeholder.
 */
export function PendingCanvasLoadingSkeleton({
  className,
}: {
  className?: string
}) {
  return (
    // Geometry only, no ink — same rule as the overview skeleton: the
    // progress bar is the one visible loading signal.
    <div
      className={cn(
        'invisible absolute inset-x-12 bottom-12 top-[104px]',
        className,
      )}
      aria-hidden
    />
  )
}

/**
 * SliceHeaderBand placeholder — the container classes are the real band's
 * (`SliceHeaderBand.tsx`), so the header→content boundary sits at the same
 * pixel when the slice detail lands: title row (text-sm line + type badge),
 * subtitle line, primary action (`size="sm"` → h-7) on the far right.
 */
export function SliceHeaderBandSkeleton() {
  return (
    <div
      aria-hidden
      className="flex w-full shrink-0 items-center gap-3 border-b border-border bg-sidebar px-4 py-2"
    >
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <Skeleton className="h-5 w-44 max-w-full" />
          <Skeleton className="h-5 w-14 rounded-full" />
        </div>
        <div className="mt-0.5 flex items-center">
          <Skeleton className="h-4 w-64 max-w-full" />
        </div>
      </div>
      <Skeleton className="h-7 w-24 shrink-0" />
    </div>
  )
}

/**
 * Slice focus tab, stage 0 of its loading waterfall — before the slice
 * detail has landed, so even SliceHeaderBand has nothing to paint. Same
 * band + viewport-pad column as the loaded tab, with the canvas rectangle
 * held by PendingCanvasLoadingSkeleton — the later stages (scenario →
 * blueprints) share the tab's hold key and inherit one unbroken placeholder.
 */
export function SliceTabLoadingSkeleton() {
  return (
    <div className="flex h-full min-h-0 min-w-0 flex-col">
      <SliceHeaderBandSkeleton />
      <div
        className="relative min-h-0 min-w-0 flex-1 overflow-hidden"
        style={{ backgroundColor: BLUEPRINT_THEME.viewportPad }}
      >
        <PendingCanvasLoadingSkeleton />
      </div>
    </div>
  )
}

/** Filmstrip frame shapes — varied square counts so the strip reads organic. */
const PRESENTATION_SKELETON_FRAMES = [2, 3, 1]

/**
 * Presentation tab placeholder — header band, stage (frame counter, media
 * area, caption + narrative lines, cell-chip row) and filmstrip, at the
 * loaded stage's own paddings. The root pins `.dark` exactly as the real
 * stage does, so the skeleton paints in stage tokens whatever the app theme.
 */
export function SlicePresentationLoadingSkeleton() {
  return (
    <div
      className="dark flex h-full min-h-0 flex-col bg-background"
      role="status"
      aria-busy="true"
      aria-label="Loading presentation"
    >
      <SliceHeaderBandSkeleton />
      <div className="relative flex min-h-0 flex-1 flex-col" aria-hidden>
        <div className="flex min-h-0 flex-1 items-stretch gap-2 px-4 pt-5">
          {/* Prev/next rails: w-10 + py-6 around a size-5 icon → 68px tall. */}
          <Skeleton className="h-[68px] w-10 shrink-0 self-center" />
          <div className="flex min-w-0 flex-1 flex-col items-center justify-center gap-4 px-2 py-4">
            <Skeleton className="h-3 w-28 rounded-full" />
            <Skeleton className="h-[38vh] w-full max-w-xl rounded-lg" />
            <Skeleton className="h-7 w-80 max-w-full" />
            <Skeleton className="h-4 w-96 max-w-full" />
          </div>
          <Skeleton className="h-[68px] w-10 shrink-0 self-center" />
        </div>
        {/* Cell-chip row at the bottom of the stage. */}
        <div className="flex shrink-0 flex-wrap items-center justify-center gap-2 px-24 pt-3 pb-4">
          <Skeleton className="h-6 w-36 rounded-full" />
          <Skeleton className="h-6 w-28 rounded-full" />
        </div>
      </div>
      <div className="shrink-0 border-t border-border px-6 py-4" aria-hidden>
        <div className="mx-auto flex w-max items-start gap-6">
          {PRESENTATION_SKELETON_FRAMES.map((squares, frame) => (
            <div
              key={frame}
              className="flex shrink-0 flex-col gap-2 border-t-2 border-border pt-2"
            >
              <Skeleton className="h-4 w-24" />
              <div className="flex gap-1.5">
                {Array.from({ length: squares }, (_, square) => (
                  <Skeleton key={square} className="size-10" />
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
      <span className="sr-only">Loading…</span>
    </div>
  )
}

/** Slices list placeholder (drawer/sidebar) — mirrors PathsLoadingRows. */
export function SliceListLoadingSkeleton() {
  return (
    <div className="flex flex-col gap-0.5 px-2" aria-hidden>
      <Skeleton className="my-1 h-3.5 w-16" />
      <Skeleton className="my-1 ml-4 h-3.5 w-40" />
      <Skeleton className="my-1 ml-4 h-3.5 w-28" />
      <Skeleton className="my-1 ml-4 h-3.5 w-36" />
    </div>
  )
}

/** Sidebar phase/scenario list placeholder. */
export function SlideNavLoadingSkeleton({
  rows = 6,
}: {
  rows?: number
}) {
  return (
    <div className="flex flex-col gap-1 px-1" aria-hidden>
      <Skeleton className="mb-1 h-7 w-full rounded-md" />
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className="flex flex-col gap-1">
          <Skeleton
            className="h-7 rounded-md"
            style={{ width: `${72 + ((i * 11) % 28)}%` }}
          />
          {i % 2 === 0 ? (
            <div className="ml-3 flex flex-col gap-1 border-l border-border/50 pl-2">
              <Skeleton className="h-6 w-[85%] rounded-md" />
              <Skeleton className="h-6 w-[70%] rounded-md" />
            </div>
          ) : null}
        </div>
      ))}
    </div>
  )
}
