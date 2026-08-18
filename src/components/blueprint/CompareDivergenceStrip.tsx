import { useEffect, useMemo } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { CompareZoneChip } from '@/components/blueprint/CompareZoneChip'
import { IconTooltip } from '@/components/editor/IconTooltip'
import { Button } from '@/components/ui/button'
import {
  deriveCompareStepGroups,
  deriveCompareZones,
  type CompareStepGroup,
  type CompareZone,
} from '@/lib/compareLedger'
import { useCompareReviewState } from '@/lib/compareReviewStore'
import { jumpToCompareStep } from '@/lib/compareZoneNavigation'
import type { CompareModel } from '@/lib/compareSlots'
import { getPathArrowColor, getPathDashArray } from '@/lib/pathColorTheme'
import { cn } from '@/lib/utils'
import type { BlueprintData } from '@/types/blueprint'

export const COMPARE_STRIP_HEIGHT = 48

/** Vertical center of the braid tracks inside the strip. */
const TRACK_CENTER_Y = 30
/** Per-path vertical spread at a divergent segment. */
const TRACK_SPREAD = 9

type StripSegment = {
  key: string
  kind: 'shared' | 'divergent'
  columnCount: number
  zone: CompareZone | null
}

/**
 * The divergence strip — a ~48px braid narrating the compared paths' fork/
 * rejoin topology, rendered in the compare panel chrome in BOTH modes.
 * NAVIGATION ONLY (locked decision): a neutral 3px spine where the paths
 * agree, per-path colored+dashed 2px tracks where they split, zone chips on
 * divergent segments, and a `◀ step 1/6 ▶` stepper.
 *
 * TWO grains meet here. The SEGMENTS stay run-shaped — that is the topology
 * the braid draws, and a segment is one fork-and-rejoin. The CURSOR is a
 * divergent STEP (`activeStepKey`), which is what the ledger groups by and
 * what ◀/▶ walk: at this data's divergence ratios a run can be six steps
 * wide, and stepping run-by-run skipped five of them. So: activating a
 * segment opens the FIRST step group inside that run, and the segment
 * containing the active step is the highlighted one.
 */
export function CompareDivergenceStrip({
  model,
  blueprints,
  slideId,
}: {
  model: CompareModel
  blueprints: readonly BlueprintData[]
  slideId: string
}) {
  const { activeStepKey } = useCompareReviewState()
  const zones = useMemo(() => deriveCompareZones(model), [model])
  const stepGroups = useMemo(() => deriveCompareStepGroups(model), [model])

  const activeStepIndex = stepGroups.findIndex(
    (group) => group.columnKey === activeStepKey,
  )
  const activeStep = activeStepIndex >= 0 ? stepGroups[activeStepIndex] : null
  /** The segment to highlight: the run the active step sits inside. */
  const activeZone = activeStep?.zoneIndex ?? null

  /** A segment activates its run's FIRST divergent step. */
  const firstStepOfZone = (zoneIndex: number): CompareStepGroup | undefined =>
    stepGroups.find((group) => group.zoneIndex === zoneIndex)

  const segments = useMemo<StripSegment[]>(
    () =>
      model.runs.map((run, index) => {
        const divergent = run.kind === 'divergent'
        // Zone index = how many divergent runs precede-or-include this one —
        // the same left-to-right numbering deriveCompareZones assigns.
        const zoneIndex = model.runs
          .slice(0, index + 1)
          .filter((entry) => entry.kind === 'divergent').length
        return {
          key: `run-${index}`,
          kind: run.kind,
          columnCount: run.columnKeys.length,
          zone: divergent ? (zones[zoneIndex - 1] ?? null) : null,
        }
      }),
    [model.runs, zones],
  )

  const stepTo = useMemo(() => {
    return (direction: 1 | -1) => {
      if (stepGroups.length === 0) return
      const target =
        activeStepIndex < 0
          ? direction === 1
            ? 0
            : stepGroups.length - 1
          : Math.min(
              Math.max(activeStepIndex + direction, 0),
              stepGroups.length - 1,
            )
      const group = stepGroups[target]
      if (group) void jumpToCompareStep(group, slideId)
    }
  }, [activeStepIndex, slideId, stepGroups])

  /*
    ◀/▶ from the keyboard, but only while the CANVAS has focus — evaluated
    per keydown, never cached: text fields, the drawer (the ledger lives
    there) and other widgets keep their own arrow keys.
  */
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return
      if (event.defaultPrevented || event.metaKey || event.ctrlKey || event.altKey)
        return
      const active = document.activeElement
      if (active instanceof HTMLElement) {
        if (
          active.isContentEditable ||
          active.tagName === 'INPUT' ||
          active.tagName === 'TEXTAREA' ||
          active.tagName === 'SELECT'
        )
          return
        // Suppressed while the drawer (ledger/details) holds focus.
        if (active.closest('[data-cell-detail-panel]')) return
        if (
          active !== document.body &&
          !active.closest('[data-zoom-pan-root]')
        )
          return
      }
      event.preventDefault()
      stepTo(event.key === 'ArrowRight' ? 1 : -1)
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [stepTo])

  if (zones.length === 0) {
    // S7 — zero differences: one unbroken segment IS the message.
    return (
      <div
        data-compare-divergence-strip
        className="flex shrink-0 items-center gap-3 border-b border-muted px-3"
        style={{ height: COMPARE_STRIP_HEIGHT }}
      >
        <svg
          className="min-w-0 flex-1"
          height={COMPARE_STRIP_HEIGHT}
          aria-hidden
        >
          <line
            x1="0"
            y1={TRACK_CENTER_Y}
            x2="100%"
            y2={TRACK_CENTER_Y}
            stroke="var(--muted-foreground)"
            strokeWidth={3}
            strokeLinecap="round"
          />
        </svg>
        <span className="shrink-0 font-mono text-2xs tabular-nums text-muted-foreground">
          no divergences
        </span>
      </div>
    )
  }

  const totalColumns = Math.max(
    1,
    segments.reduce((sum, segment) => sum + segment.columnCount, 0),
  )

  return (
    <div
      data-compare-divergence-strip
      className="flex shrink-0 items-center gap-3 border-b border-muted px-3"
      style={{ height: COMPARE_STRIP_HEIGHT }}
    >
      <div className="flex h-full min-w-0 flex-1 items-stretch">
        {segments.map((segment) => {
          const widthPct = (segment.columnCount / totalColumns) * 100
          if (segment.kind === 'shared' || !segment.zone) {
            return (
              <div
                key={segment.key}
                className="relative h-full"
                style={{ width: `${widthPct}%` }}
                aria-hidden
              >
                <svg className="absolute inset-0 size-full">
                  <line
                    x1="0"
                    y1={TRACK_CENTER_Y}
                    x2="100%"
                    y2={TRACK_CENTER_Y}
                    stroke="var(--muted-foreground)"
                    strokeWidth={3}
                    strokeLinecap="round"
                  />
                </svg>
              </div>
            )
          }

          const zone = segment.zone
          const isActive = activeZone === zone.index
          const zoneLabel = `Zone ${zone.index}: ${zone.stepRangeLabel} · ${zone.titleLabel}, ${zone.slots.length} differences`
          return (
            <IconTooltip key={segment.key} label={zoneLabel}>
              <button
                type="button"
                aria-label={zoneLabel}
                aria-pressed={isActive}
                className={cn(
                  // ≥44px hit rect: the strip is 48px tall and the segment is
                  // full-height; min-width keeps narrow zones tappable.
                  'relative h-full min-w-11 rounded-sm transition-colors duration-(--motion-micro)',
                  'hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50',
                  isActive && 'bg-(--sidebar-selected)',
                )}
                style={{ width: `${widthPct}%` }}
                onClick={() => {
                  const group = firstStepOfZone(zone.index)
                  if (group) void jumpToCompareStep(group, slideId)
                }}
              >
                <svg
                  className="absolute inset-y-0 left-1 right-1 h-full w-[calc(100%-0.5rem)]"
                  aria-hidden
                >
                  {blueprints.map((blueprint, pathIndex) => {
                    const offset =
                      (pathIndex - (blueprints.length - 1) / 2) * TRACK_SPREAD
                    return (
                      <line
                        key={blueprint.path.id}
                        x1="0"
                        y1={TRACK_CENTER_Y + offset}
                        x2="100%"
                        y2={TRACK_CENTER_Y + offset}
                        stroke={getPathArrowColor(blueprint.path)}
                        strokeWidth={2}
                        strokeDasharray={getPathDashArray(blueprint.path)}
                        strokeLinecap="round"
                      />
                    )
                  })}
                </svg>
                {/* Fork diamond entering the zone, rejoin circle leaving it —
                    strip-only vocabulary, background fill on a neutral stroke. */}
                <span
                  aria-hidden
                  className="absolute left-0 size-1.5 rotate-45 border border-(--muted-foreground) bg-background"
                  style={{ top: TRACK_CENTER_Y - 3, translate: '-50% 0' }}
                />
                <span
                  aria-hidden
                  className="absolute right-0 size-1.5 rounded-full border border-(--muted-foreground) bg-background"
                  style={{ top: TRACK_CENTER_Y - 3, translate: '50% 0' }}
                />
                <CompareZoneChip
                  index={zone.index}
                  active={isActive}
                  className="absolute left-1/2 top-1 -translate-x-1/2"
                />
                {isActive ? (
                  <span
                    aria-hidden
                    className="absolute inset-x-1 bottom-0 h-0.5 rounded-full bg-(--sidebar-selected-rail)"
                  />
                ) : null}
              </button>
            </IconTooltip>
          )
        })}
      </div>
      <div className="flex shrink-0 items-center gap-1">
        <IconTooltip label="Previous divergent step">
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            className="size-6 text-muted-foreground hover:text-foreground"
            aria-label="Previous divergent step"
            disabled={activeStepIndex === 0}
            onClick={() => stepTo(-1)}
          >
            <ChevronLeft className="size-3.5" aria-hidden />
          </Button>
        </IconTooltip>
        <span className="font-mono text-2xs tabular-nums text-muted-foreground">
          step {activeStepIndex >= 0 ? activeStepIndex + 1 : '–'}/
          {stepGroups.length}
        </span>
        <IconTooltip label="Next divergent step">
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            className="size-6 text-muted-foreground hover:text-foreground"
            aria-label="Next divergent step"
            disabled={activeStepIndex === stepGroups.length - 1}
            onClick={() => stepTo(1)}
          >
            <ChevronRight className="size-3.5" aria-hidden />
          </Button>
        </IconTooltip>
      </div>
    </div>
  )
}
