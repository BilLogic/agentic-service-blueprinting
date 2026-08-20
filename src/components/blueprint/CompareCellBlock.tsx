import { BlueprintCellButton } from '@/components/blueprint/BlueprintCellButton'
import { BlueprintStepVisual } from '@/components/blueprint/BlueprintStepVisual'
import { BlueprintTechPill } from '@/components/blueprint/BlueprintTechPill'
import { TechPillFace } from '@/components/blueprint/TechPillFace'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import {
  STEP_COLUMN_WIDTH,
  NARRATIVE_CELL_HEIGHT,
  NARRATIVE_CELL_HEIGHT_COMPACT,
  getVisualCellButtonMaxHeight,
  type BlueprintCellVariant,
} from '@/lib/blueprintLayout'
import {
  buildBlueprintCellSelection,
  getTechPillItems,
  type BlueprintCellSelectionContext,
} from '@/lib/blueprintCellSelection'
import type { BlueprintLayerStyle } from '@/lib/blueprintTheme'
import { cn } from '@/lib/utils'
import type { BlueprintCell } from '@/types/blueprint'
import { useId, useState, type CSSProperties } from 'react'

/**
 * One cell of a compare grid — the same face in every arrangement (stacked
 * bands, overview columns, merged slots), down to its `data-blueprint-cell`
 * anchor, so selection, focus/pulse and arrow geometry behave identically
 * wherever it is drawn.
 */

/**
 * One segment of the merged view's path-membership outline. The outline sits
 * on the cell edge without repainting its lane fill; exact membership is
 * disclosed with full path names on hover and keyboard focus.
 */
export type CompareCellPathMembership = {
  color: string
  /** Full path name shown in the membership tooltip. */
  pathName: string
}

function membershipOutlineBackground(
  memberships: readonly CompareCellPathMembership[],
): string {
  if (memberships.length === 1) return memberships[0].color

  const slice = 100 / memberships.length
  const stops = memberships.flatMap((membership, index) => {
    const start = (slice * index).toFixed(3)
    const end = (slice * (index + 1)).toFixed(3)
    return [`${membership.color} ${start}%`, `${membership.color} ${end}%`]
  })
  return `conic-gradient(from -45deg, ${stops.join(', ')})`
}

export function CompareCellBlock({
  cellId,
  stepIndex,
  content,
  laneStyle,
  variant,
  compact,
  flushBottom,
  selectionContext,
  visualPictures,
  slotCells,
  pathMembership,
}: {
  cellId?: string
  stepIndex: number
  content?: string
  laneStyle: BlueprintLayerStyle
  variant: BlueprintCellVariant
  compact?: boolean
  flushBottom?: boolean
  selectionContext?: BlueprintCellSelectionContext
  visualPictures?: Array<{ picture: string; label: string }>
  /** Every cell in a tech slot — one per touchpoint since the split. */
  slotCells?: BlueprintCell[]
  /** Member paths of this rendered cell — one outline segment each. */
  pathMembership?: readonly CompareCellPathMembership[]
}) {
  const membershipDescriptionId = useId()
  const [membershipTooltipOpen, setMembershipTooltipOpen] = useState(false)
  const hasMembershipOutline = Boolean(
    pathMembership && pathMembership.length > 0,
  )
  const ariaDescribedBy = hasMembershipOutline
    ? membershipDescriptionId
    : undefined
  const shellPadding = cn(
    compact ? 'px-3' : 'px-3.5',
    compact ? 'pt-3' : 'pt-4',
    flushBottom ? 'pb-0' : compact ? 'pb-3' : 'pb-4',
  )
  const width = STEP_COLUMN_WIDTH
  const isVisual = variant === 'visual'
  const narrativeHeight = compact
    ? NARRATIVE_CELL_HEIGHT_COMPACT
    : NARRATIVE_CELL_HEIGHT
  const shellVerticalPad = compact ? 24 : 32
  const shellStyle = {
    width,
    minWidth: width,
    maxWidth: width,
    ...(hasMembershipOutline
      ? {
          '--background-compare-membership-outline':
            membershipOutlineBackground(pathMembership!),
        }
      : undefined),
    ...(isVisual
      ? { maxHeight: getVisualCellButtonMaxHeight(compact) + shellVerticalPad }
      : undefined),
  } as CSSProperties
  const shellClassName = cn(
    'relative z-[1] flex shrink-0 items-stretch',
    shellPadding,
    isVisual && 'min-h-0 overflow-hidden',
  )
  const innerContent =
    variant === 'visual' ? (
      <div className="relative flex h-full min-h-0 max-h-full w-full flex-1 items-center justify-center overflow-hidden">
        <BlueprintStepVisual
          compact={compact}
          className={
            hasMembershipOutline ? 'compare-membership-outline' : undefined
          }
          fill={laneStyle.lane}
          pictures={visualPictures}
          selection={
            selectionContext
              ? buildBlueprintCellSelection(selectionContext)
              : undefined
          }
          cellId={cellId}
          stepIndex={stepIndex}
          aria-describedby={ariaDescribedBy}
        />
      </div>
    ) : variant === 'pills' ? (
      <div
        {...(cellId ? { 'data-blueprint-cell': cellId } : {})}
        data-step-index={stepIndex}
        className={cn(
          'flex w-full flex-1 flex-col items-stretch',
          compact ? 'gap-2' : 'gap-2.5',
        )}
      >
        {(slotCells && slotCells.length > 0
          ? slotCells.flatMap((slotCell) =>
              getTechPillItems(slotCell.content ?? '').map((item) => ({
                item,
                slotCell,
              })),
            )
          : getTechPillItems(content).map((item) => ({
              item,
              slotCell: undefined,
            }))
        ).map(({ item, slotCell }, index, all) =>
          selectionContext ? (
            <BlueprintTechPill
              key={`${slotCell?.id ?? 'anon'}-${item}-${index}`}
              item={item}
              // Identity is the split's point: each pill carries its own
              // cell in the selection it hands to the panel and the picker.
              selectionContext={
                slotCell
                  ? {
                      ...selectionContext,
                      cellId: slotCell.id,
                      cellContent: slotCell.content ?? '',
                      cellPicture: slotCell.picture ?? null,
                      cellDescription: slotCell.description ?? null,
                      cellLinks: slotCell.links,
                    }
                  : selectionContext
              }
              stepIndex={stepIndex}
              compact={compact}
              sliceSequenceBadge={
                index === 0 || slotCell?.id !== all[index - 1]?.slotCell?.id
              }
              className={
                hasMembershipOutline ? 'compare-membership-outline' : undefined
              }
              aria-describedby={ariaDescribedBy}
            />
          ) : (
            <TechPillFace
              key={`${item}-${index}`}
              item={item}
              compact={compact}
              className={cn(
                'shrink-0',
                hasMembershipOutline && 'compare-membership-outline',
              )}
              aria-describedby={ariaDescribedBy}
            />
          ),
        )}
      </div>
    ) : (
      <BlueprintCellButton
        fill={laneStyle.lane}
        compact={compact}
        selection={
          selectionContext
            ? buildBlueprintCellSelection(selectionContext)
            : undefined
        }
        cellId={cellId}
        stepIndex={stepIndex}
        className={cn(
          'flex-none overflow-hidden',
          hasMembershipOutline && 'compare-membership-outline',
          compact ? 'h-24 min-h-24 max-h-24' : 'h-32 min-h-32 max-h-32',
        )}
        style={{
          height: narrativeHeight,
          minHeight: narrativeHeight,
          maxHeight: narrativeHeight,
        }}
        aria-describedby={ariaDescribedBy}
      >
        <p className="line-clamp-4 w-full whitespace-pre-wrap">{content}</p>
      </BlueprintCellButton>
    )

  const shell = (
    <div
      className={shellClassName}
      style={shellStyle}
      onFocusCapture={
        hasMembershipOutline ? () => setMembershipTooltipOpen(true) : undefined
      }
      onBlurCapture={
        hasMembershipOutline
          ? (event) => {
              if (!event.currentTarget.contains(event.relatedTarget)) {
                setMembershipTooltipOpen(false)
              }
            }
          : undefined
      }
    >
      {hasMembershipOutline ? (
        <>
          <span id={membershipDescriptionId} className="sr-only">
            {`Used in paths: ${pathMembership!.map((membership) => membership.pathName).join(', ')}`}
          </span>
        </>
      ) : null}
      {innerContent}
    </div>
  )

  if (!hasMembershipOutline) return shell

  return (
    <Tooltip
      open={membershipTooltipOpen}
      onOpenChange={setMembershipTooltipOpen}
    >
      <TooltipTrigger render={shell} tabIndex={-1} />
      <TooltipContent
        side="top"
        sideOffset={6}
        className="flex max-w-72 flex-col items-start gap-1.5 text-left"
      >
        <span className="text-contrast/70">Used in</span>
        {pathMembership!.map((membership) => (
          <span key={membership.pathName} className="flex items-center gap-2">
            <span
              aria-hidden
              className="size-2 shrink-0 rounded-full ring-1 ring-contrast/25"
              style={{ backgroundColor: membership.color }}
            />
            <span>{membership.pathName}</span>
          </span>
        ))}
      </TooltipContent>
    </Tooltip>
  )
}
