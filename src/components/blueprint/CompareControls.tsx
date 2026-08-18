import { Columns2, Diff, GitCompareArrows } from 'lucide-react'
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
import { cn } from '@/lib/utils'
import { isSubslide, type NavItem, type SlideViewType } from '@/types/nav'

/**
 * Stacked ⇄ Merged, on the scenario header.
 *
 * Visible only while two or more paths are selected — with one path there
 * is nothing to compare and the control would be a question with no answer.
 * `'merged'` is session-only (see viewTypeVocabulary): the toggle mutates
 * the EditorContext view override, never a persisted value.
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
    <div
      role="group"
      aria-label="Path display"
      className="flex items-center gap-px rounded-md border border-border bg-muted/60 p-0.5"
    >
      {segments.map(({ value, label, icon: Icon }) => {
        const active = current === value
        return (
          <Button
            key={value}
            type="button"
            variant="ghost"
            size="sm"
            aria-pressed={active}
            aria-label={label}
            className={cn(
              'h-6 gap-1 rounded px-2 text-xs',
              active
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground',
            )}
            onClick={() => setScenarioDisplayViewType(slide.id, value)}
          >
            <Icon className="size-3.5" aria-hidden />
            <span className="max-xl:hidden">{label}</span>
          </Button>
        )
      })}
    </div>
  )
}

/**
 * The `[Diff N]` button — the header entry to the difference ledger, beside
 * the compare toggle. A real toggle: pressed while the panel is open ON the
 * Differences surface, and clicking it then CLOSES the panel (the panel's
 * own atomic clear, never a second owner of "is the panel open"). Hidden
 * below 2 selected paths (the compare cluster gate), disabled at zero
 * because "open the empty ledger" is a dead end.
 */
function CompareDifferencesChip({ slide }: { slide: NavItem }) {
  const { registration } = useCompareReviewState()
  const cellDetail = useBlueprintCellDetailOptional()
  if (!registration || registration.slideId !== slide.id || !cellDetail) {
    return null
  }
  const count = countCompareDifferences(registration.model)
  const open = cellDetail.panelState?.surface === 'differences'
  const chip = (
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
      className="h-6 gap-1 px-2 text-xs text-muted-foreground hover:text-foreground"
      onClick={() =>
        open ? cellDetail.closePanel() : cellDetail.openDifferences()
      }
    >
      <Diff className="size-3.5" aria-hidden />
      <span className="max-xl:hidden">Diff</span>
      <span
        aria-hidden
        className={cn(
          'ml-0.5 rounded-full px-1.5 py-px font-mono text-[10px] leading-none tabular-nums',
          open ? 'bg-primary/15 text-foreground' : 'bg-muted text-foreground',
        )}
      >
        {count}
      </span>
    </Button>
  )
  return (
    <Tooltip>
      <TooltipTrigger render={<span className="inline-flex" />}>
        {chip}
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
 * The compare controls as ONE cluster (Stacked/Merged, Diff) so every view
 * control shares one edge and one gap rhythm.
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
      <CompareDifferencesChip slide={slide} />
    </div>
  )
}
