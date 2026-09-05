import { Columns2, Diff, GitCompareArrows } from 'lucide-react'
import type { PathOption } from '@/components/blueprint/PathMultiSelect'
import { EntityHeader } from '@/components/blueprint/EntityHeader'
import { BLUEPRINT_MENUBAR_HEADER_CLASS } from '@/components/editor/menubarHeaderLayout'
import {
  SegmentedControl,
  SegmentedControlItem,
} from '@/components/editor/SegmentedControl'
import { Menubar } from '@/components/ui/menubar'
import { Button } from '@/components/ui/button'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { useBlueprintCellDetailOptional } from '@/contexts/BlueprintCellDetailContext'
import { useEditor } from '@/contexts/EditorContext'
import { countCompareDifferences } from '@/lib/compareLedger'
import { useCompareReviewState } from '@/lib/compareReviewStore'
import {
  getSlideDisplayLabel,
  isSubslide,
  type NavItem,
  type SlideViewType,
} from '@/types/nav'
import { cn } from '@/lib/utils'

type PhaseMenubarHeaderProps = {
  slide: NavItem
  slides: NavItem[]
  /** Paths still inform the summary fallback; filtering lives in the sidebar. */
  paths?: PathOption[]
  selectedPathIds?: string[]
  className?: string
}

function resolveHeaderSummary(
  slide: NavItem,
  paths: PathOption[],
  selectedPathIds: string[],
): string | null | undefined {
  if (isSubslide(slide)) {
    if (slide.summary?.trim()) return slide.summary

    const selectedPath = paths.find((path) => selectedPathIds.includes(path.id))
    return selectedPath?.summary ?? paths[0]?.summary ?? null
  }

  return (
    slide.summary ?? 'Scenarios in this phase and how they connect.'
  )
}

/**
 * Stacked ⇄ Merged, on the bar that holds the scenario title.
 *
 * Visible only while two or more paths are selected — with one path there
 * is nothing to compare and the control would be a question with no answer.
 * Same track-and-raised-square vocabulary as the View/Edit switch.
 */
function CompareViewToggle({ slide }: { slide: NavItem }) {
  const { getScenarioDisplayViewType, setScenarioDisplayViewType } = useEditor()
  const current = getScenarioDisplayViewType(slide)

  const segments: Array<{
    value: SlideViewType
    label: string
    icon: typeof Columns2
  }> = [
    { value: 'stacked', label: 'Stacked', icon: Columns2 },
    { value: 'merged', label: 'Merged', icon: GitCompareArrows },
  ]

  return (
    <SegmentedControl
      aria-label="Path display"
      value={current}
      onValueChange={(value) => setScenarioDisplayViewType(slide.id, value)}
    >
      {segments.map(({ value, label, icon: Icon }) => (
        <SegmentedControlItem
          key={value}
          value={value}
          className="px-2"
          aria-label={label}
        >
          <Icon className="size-3.5" aria-hidden />
          {/* Narrow shells go icon-only; the aria-label keeps the name. */}
          <span className="max-xl:hidden">{label}</span>
        </SegmentedControlItem>
      ))}
    </SegmentedControl>
  )
}

/**
 * The `[Diff N]` button — the menubar entry to the difference ledger, beside
 * the compare toggles. A real toggle: pressed while the panel is open ON the
 * Differences surface, and clicking it then CLOSES the panel (the panel's own
 * atomic clear, never a second owner of "is the panel open"). Hidden below 2
 * selected paths (the compare cluster gate), disabled at zero because "open
 * the empty ledger" is a dead end.
 *
 * The count is a badge, not prose — it is one of exactly two counts in the
 * app (this and each ledger group's trailing number), so it has to read as a
 * value rather than a label.
 */
function CompareDifferencesCount({ slide }: { slide: NavItem }) {
  const { registration } = useCompareReviewState()
  const cellDetail = useBlueprintCellDetailOptional()
  if (!registration || registration.slideId !== slide.id || !cellDetail) {
    return null
  }
  const count = countCompareDifferences(registration.model)
  const open = cellDetail.panelState?.surface === 'differences'
  const control = (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      disabled={count === 0}
      aria-pressed={open}
      aria-label={
        count === 0
          ? 'No differences between the compared paths'
          : open
            ? 'Close the difference ledger'
            : `Open the difference ledger (${count} differences)`
      }
      className="h-6 gap-1 px-2 text-2xs text-muted-foreground hover:text-foreground"
      onClick={() => (open ? cellDetail.closePanel() : cellDetail.openDifferences())}
    >
      <Diff className="size-3.5" aria-hidden />
      <span className="max-xl:hidden">Diff</span>
      <span
        aria-hidden
        className={cn(
          'ml-0.5 rounded-full px-1.5 py-px font-mono text-3xs leading-none tabular-nums',
          // Resting: neutral. Pressed: brand tint one step stronger than the
          // button's own selected fill, so the count stays legible on it.
          open
            ? 'bg-sidebar-selected-rail/20 text-foreground'
            : 'bg-muted text-foreground',
        )}
      >
        {count}
      </span>
    </Button>
  )
  return (
    <Tooltip>
      <TooltipTrigger render={<span className="inline-flex" />}>
        {control}
      </TooltipTrigger>
      <TooltipContent>
        {count === 0
          ? 'Paths are identical — nothing to list'
          : open
            ? 'Close the difference ledger'
            : 'Open the difference ledger'}
      </TooltipContent>
    </Tooltip>
  )
}

/**
 * The compare controls as ONE right-aligned cluster (Stacked/Merged, Diff) — the navbar composes it beside the path selector so every view
 * control shares one edge and one gap rhythm, instead of toggles floating
 * mid-bar next to the title.
 */
export function CompareControlsCluster({
  slide,
  selectedPathIds,
}: {
  slide: NavItem
  selectedPathIds: string[]
}) {
  if (!isSubslide(slide) || selectedPathIds.length < 2) return null
  return (
    <div
      className="flex shrink-0 items-center gap-1.5"
      onPointerDown={(event) => event.stopPropagation()}
      onClick={(event) => event.stopPropagation()}
    >
      <CompareViewToggle slide={slide} />
      <CompareDifferencesCount slide={slide} />
    </div>
  )
}

/** Phase or scenario title bar using the shadcn Menubar component. */
export function PhaseMenubarHeader({
  slide,
  slides,
  paths = [],
  selectedPathIds = [],
  className,
}: PhaseMenubarHeaderProps) {
  const label = getSlideDisplayLabel(slide, slides)
  const isScenario = isSubslide(slide)
  const summary = resolveHeaderSummary(slide, paths, selectedPathIds)

  return (
    <Menubar
      modal={false}
      data-phase-menubar-header
      className={cn(BLUEPRINT_MENUBAR_HEADER_CLASS, className)}
      onPointerDown={(event) => event.stopPropagation()}
      onClick={(event) => event.stopPropagation()}
    >
      {/*
        Title and summary as one block, the slice header band's shape adapted
        to a 36px bar: identity first, then what this thing is, truncated. The
        summary used to live only inside the title's hover tooltip, which is a
        strange place for the one sentence that says what you are looking at.

        The block itself is `EntityHeader`, shared with the service bar above
        — same shape, same class, one place to change it.
      */}
      <EntityHeader
        kind={isScenario ? 'scenario' : 'phase'}
        id={slide.id}
        label={label}
        summary={summary}
      />
      {/* Compare controls moved to the navbar's right cluster
          (CompareControlsCluster) — the title keeps the left edge to
          itself. */}
    </Menubar>
  )
}
