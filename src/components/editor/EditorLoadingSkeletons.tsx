import { EDITOR_RAIL_WIDTH_CLASS } from '@/components/editor/EditorRail'
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
  /**
   * The real panel size for this phase, once its blueprints have landed.
   *
   * `getBlueprintArtboardSize` computes a panel from step and layer counts
   * with fixed constants, so this is the finished size rather than an
   * estimate — and the camera pre-fits against these rectangles. Absent
   * while the blueprints are still in flight; the flat fallback below is
   * only for that window.
   */
  panelWidth?: number
  panelHeight?: number
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
              Math.max(1, phase.scenarioCount) *
                (phase.panelWidth ?? SKELETON_PANEL_WIDTH) +
              (Math.max(1, phase.scenarioCount) - 1) * OVERVIEW_SCENARIO_GAP,
            height: phase.panelHeight ?? COMPARE_MIN_PANEL_HEIGHT,
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
      // The real band's own container classes (SliceHeaderBand), so the
      // header/content boundary sits at the same pixel in both states.
      className="flex w-full shrink-0 items-center gap-3 border-b border-border bg-sidebar px-4 py-2"
    >
      <div className="min-w-0 flex-1">
        {/*
          Title row: an `h2 text-sm font-semibold` line box (20px) beside a
          `Badge` — which is a real chip with its own height and radius, not
          a bar. Skeletoning the badge as a plain rectangle was what made
          this band read as an empty container rather than as chrome with
          content in it.
        */}
        <div className="flex min-w-0 items-center gap-2">
          <Skeleton className="h-5 w-48 max-w-full rounded" />
          <Skeleton className="h-5 w-16 shrink-0 rounded-md" />
        </div>
        {/* Caption row: `text-xs` line box (16px), inset by the 2px the
            real row carries. */}
        <div className="mt-0.5 flex min-w-0 items-baseline gap-2">
          <Skeleton className="h-4 w-72 max-w-full rounded" />
        </div>
      </div>
      {/* Primary action — `size="sm"` is h-8, and it has an icon before its
          label, so the skeleton carries both rather than one flat pill. */}
      <div className="flex h-8 shrink-0 items-center gap-1.5 rounded-md border border-border px-3">
        <Skeleton className="size-3 shrink-0 rounded-sm" />
        <Skeleton className="h-3.5 w-14" />
      </div>
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
export function SliceTabLoadingSkeleton({
  children,
}: {
  /**
   * Rendered inside the CANVAS rectangle, not over the whole tab — the
   * progress bar's home for every phase of the slice waterfall.
   *
   * It used to be centred over band + canvas at the first phase and over
   * the canvas alone at the next, so it slid up by half a band height
   * partway through a load. One rectangle for the whole chain is the same
   * rule the workspace canvas follows: the bar is the one thing on screen,
   * and it must never move while it is the one thing on screen.
   */
  children?: React.ReactNode
}) {
  return (
    <div className="flex h-full min-h-0 min-w-0 flex-col">
      <SliceHeaderBandSkeleton />
      <div
        className="relative min-h-0 min-w-0 flex-1 overflow-hidden"
        style={{ backgroundColor: BLUEPRINT_THEME.viewportPad }}
      >
        <PendingCanvasLoadingSkeleton />
        {children}
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
/**
 * Row-label widths for the boot skeleton. Not decoration: a column of
 * identical bars reads as a progress meter, a ragged one reads as a list.
 */
const PHASE_SKELETON_ROWS = [
  '5.5rem',
  '6rem',
  '5.25rem',
  '5rem',
  '5.75rem',
  '9rem',
] as const
const SESSION_TODAY_SKELETON_ROWS = ['6rem'] as const
const SESSION_EARLIER_SKELETON_ROWS = [
  '11rem',
  '6rem',
  '10rem',
  '6rem',
  '6rem',
] as const

/**
 * One collapsible nav section — header plus rows — at the real component's
 * measured geometry, so nothing moves when the boot layer lifts.
 *
 * The numbers are `SidebarNav`'s: a 29px header (a 16px chevron slot at
 * `pl-1`, then the title's line box), and 32px rows whose label starts 24px
 * in, past the chevron column. Both the phases nav and the agent's session
 * groups are built from this same section, which is why one shape serves
 * both — the old hand-drawn placeholder matched neither.
 */
function BootNavSectionSkeleton({ rows }: { rows: readonly string[] }) {
  return (
    <div>
      <div className="flex h-[29px] items-center gap-1 px-1">
        <Skeleton className="size-4 shrink-0 rounded-sm" />
        <Skeleton className="h-2.5 w-12" />
      </div>
      <div className="flex flex-col gap-0.5 pb-1">
        {rows.map((width, index) => (
          <div key={index} className="flex h-8 items-center pl-6">
            <Skeleton className="h-4 rounded-sm" style={{ width }} />
          </div>
        ))}
      </div>
    </div>
  )
}

/** A rail icon: the 16px glyph, centred in its real hit area. */
function BootRailIconSkeleton({ hit }: { hit: string }) {
  return (
    <div className={cn('flex shrink-0 items-center justify-center', hit)}>
      <Skeleton className="size-4 rounded-sm" />
    </div>
  )
}

/**
 * The whole sidebar while the canvas stages behind its loading bar.
 *
 * An OVERLAY, not a per-section placeholder. The sidebar used to skeleton
 * only its two row lists, which left the rail's icons, the PHASES and
 * SESSIONS headers, the section chevrons and every control painted and
 * live over a screen that was still loading — a half-built panel beside a
 * progress bar. And because each list ran its own swap, the two halves
 * resolved on their own clocks. One opaque layer over the real sidebar
 * fixes both by construction: everything behind it is covered, and it
 * lifts in a single fade, so every part of the sidebar resolves on exactly
 * the same beat as the canvas's first layer.
 *
 * Every box here is the real component's, measured: the rail's paddings and
 * its 24/36/28px hit areas, `SidebarContent`'s `px-2 pt-1 pb-1`, the dock's
 * 24px grab bar and 36px sessions header, and the dock's own height ratio.
 * A skeleton at invented proportions makes the swap read as a jump, which
 * is exactly what the first cut of this did.
 *
 * The three regions carry the shell's entrance rungs (see EditorShell), so
 * the skeleton itself arrives as a ladder: rail, panel, dock.
 */
export function EditorSidebarBootSkeleton({
  showAgent,
  dockRatio,
}: {
  /** Whether the agent dock has a region in this sidebar. */
  showAgent: boolean
  /** The dock's share of the panel column, so the seam lands where it will. */
  dockRatio: number
}) {
  return (
    <div className="flex h-full min-h-0 flex-row" aria-hidden>
      <div
        data-shell-entrance-part="rail"
        className={cn(
          'flex h-full shrink-0 flex-col items-center gap-1',
          'border-r border-muted px-1.5 py-2',
          EDITOR_RAIL_WIDTH_CLASS,
        )}
      >
        <BootRailIconSkeleton hit="size-6" />
        <div className="my-0.5 h-px w-6 shrink-0 bg-border/60" />
        <BootRailIconSkeleton hit="size-9" />
        <BootRailIconSkeleton hit="size-9" />
        <div className="flex-1" />
        {showAgent ? <BootRailIconSkeleton hit="size-9" /> : null}
        <div className="my-0.5 h-px w-6 shrink-0 bg-border/60" />
        <BootRailIconSkeleton hit="size-7" />
        <BootRailIconSkeleton hit="size-9" />
      </div>

      <div className="flex min-h-0 min-w-0 flex-1 flex-col">
        <div
          data-shell-entrance-part="panel"
          className="flex min-h-0 flex-1 flex-col overflow-hidden px-2 pt-1 pb-1"
        >
          <BootNavSectionSkeleton rows={PHASE_SKELETON_ROWS} />
        </div>

        {showAgent ? (
          <>
            {/* AgentDockDivider's own 4px, then the dock at its real share. */}
            <div className="h-1 shrink-0" />
            <div
              data-shell-entrance-part="agent"
              className="flex min-h-0 shrink-0 flex-col overflow-hidden border-t border-muted"
              style={{ height: `${dockRatio * 100}%` }}
            >
              {/* Grab bar: grip, title, close. */}
              <div className="flex h-6 shrink-0 items-center gap-1 border-b border-muted pl-1.5 pr-2">
                <Skeleton className="size-3 shrink-0 rounded-sm" />
                <Skeleton className="h-2.5 w-10" />
                <div className="flex-1" />
                <div className="flex size-6 shrink-0 items-center justify-center">
                  <Skeleton className="size-3 rounded-sm" />
                </div>
              </div>
              {/* Sessions header: title, filter, new. */}
              <div className="flex h-9 shrink-0 items-center gap-1 px-2">
                <Skeleton className="ml-1 h-2.5 w-12" />
                <div className="flex-1" />
                <div className="flex size-6 shrink-0 items-center justify-center">
                  <Skeleton className="size-3.5 rounded-sm" />
                </div>
                <div className="flex size-6 shrink-0 items-center justify-center">
                  <Skeleton className="size-3.5 rounded-sm" />
                </div>
              </div>
              <div className="min-h-0 flex-1 overflow-hidden px-2 pb-2">
                <BootNavSectionSkeleton rows={SESSION_TODAY_SKELETON_ROWS} />
                <BootNavSectionSkeleton rows={SESSION_EARLIER_SKELETON_ROWS} />
              </div>
            </div>
          </>
        ) : null}
      </div>
    </div>
  )
}

/**
 * The agent panel's session list while it hydrates.
 *
 * Extracted from AgentPanel so it can go through `DeferredSkeleton` on the
 * shared boot session like every other sidebar surface: the list used to be
 * a bare `hydrating ? … : …` ternary, which meant it painted its rows the
 * moment the DB merge landed regardless of what the rest of the screen was
 * doing.
 */
export function AgentSessionsLoadingSkeleton() {
  return (
    <div className="flex flex-col gap-3 pl-6 pr-2 pt-2" aria-hidden>
      <Skeleton className="h-3.5 w-40" />
      <Skeleton className="h-3.5 w-28" />
      <Skeleton className="h-3.5 w-36" />
      <Skeleton className="h-3.5 w-32" />
    </div>
  )
}

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
            <div className="ml-3 flex flex-col gap-1 border-l border-muted pl-2">
              <Skeleton className="h-6 w-[85%] rounded-md" />
              <Skeleton className="h-6 w-[70%] rounded-md" />
            </div>
          ) : null}
        </div>
      ))}
    </div>
  )
}
