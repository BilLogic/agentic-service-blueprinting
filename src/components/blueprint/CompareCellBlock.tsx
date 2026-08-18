import { BlueprintCellButton } from '@/components/blueprint/BlueprintCellButton'
import { BlueprintStepVisual } from '@/components/blueprint/BlueprintStepVisual'
import { BlueprintTechPill } from '@/components/blueprint/BlueprintTechPill'
import { TechPillFace } from '@/components/blueprint/TechPillFace'
import {
  STEP_COLUMN_WIDTH,
  getVisualCellButtonMaxHeight,
  type BlueprintCellVariant,
} from '@/lib/blueprintLayout'
import {
  buildBlueprintCellSelection,
  getTechPillItems,
  type BlueprintCellSelectionContext,
} from '@/lib/blueprintCellSelection'
import type { BlueprintLayerStyle } from '@/lib/blueprintTheme'
import { getPathWashStyle } from '@/lib/pathColorTheme'
import { cn } from '@/lib/utils'
import type { BlueprintCell } from '@/types/blueprint'

/**
 * One cell of a compare grid — the same face in every arrangement (stacked
 * bands, overview columns, merged slots), down to its `data-blueprint-cell`
 * anchor, so selection, focus/pulse and arrow geometry behave identically
 * wherever it is drawn.
 */

/**
 * The merged view's path affiliation mark: a low-alpha WASH of the path
 * colour painted on the cell face itself (never a separate box — the wash
 * inherits the face's exact bounds and radius), plus the path's short
 * label. Only sub-cells of a DIVERGENT slot carry them — a fully-shared
 * cell belongs to every path and is drawn bare. A sub-cell shared by a
 * SUBSET of paths carries one mark per member: the wash splits into
 * vertical stripes and the labels line up left-to-right.
 */
export type CompareCellPathRail = {
  color: string
  /** Short label ("HP") — see `buildComparePathShortLabels`. */
  label: string
  /** Full path name, for the label's tooltip/title. */
  pathName: string
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
  pathRails,
  pathWash = true,
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
  /** Member paths of a divergent sub-cell — one wash stripe + label each. */
  pathRails?: readonly CompareCellPathRail[]
  /**
   * Fully-shared cells show every path's LABEL but skip the wash — the
   * wash means "this face belongs to a strict subset of the paths", and
   * tinting cells that belong to everyone would repaint most of the board.
   */
  pathWash?: boolean
}) {
  const shellPadding = cn(
    compact ? 'px-3' : 'px-3.5',
    compact ? 'pt-3' : 'pt-4',
    flushBottom ? 'pb-0' : compact ? 'pb-3' : 'pb-4',
  )
  const width = STEP_COLUMN_WIDTH
  const isVisual = variant === 'visual'
  const shellVerticalPad = compact ? 24 : 32
  const shellStyle = {
    width,
    minWidth: width,
    maxWidth: width,
    ...(isVisual
      ? { maxHeight: getVisualCellButtonMaxHeight(compact) + shellVerticalPad }
      : undefined),
  }
  const shellClassName = cn(
    'relative z-[1] flex shrink-0 items-stretch',
    shellPadding,
    isVisual && 'min-h-0 overflow-hidden',
  )
  // Visual faces are photographs — a colour wash over them reads as a bad
  // scan, so there the labels alone carry the affiliation.
  const washStyle =
    isVisual || !pathWash
      ? undefined
      : getPathWashStyle(pathRails?.map((rail) => rail.color))

  const innerContent =
    variant === 'visual' ? (
      <div className="relative flex h-full min-h-0 max-h-full w-full flex-1 overflow-hidden">
        <BlueprintStepVisual
          compact={compact}
          fill={laneStyle.lane}
          pictures={visualPictures}
          selection={
            selectionContext
              ? buildBlueprintCellSelection(selectionContext)
              : undefined
          }
          cellId={cellId}
          stepIndex={stepIndex}
          className="flex-1"
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
              style={washStyle}
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
            />
          ) : (
            <TechPillFace
              key={`${item}-${index}`}
              item={item}
              compact={compact}
              className="shrink-0"
              style={washStyle}
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
        style={washStyle}
      >
        <p className="w-full whitespace-pre-wrap">{content}</p>
      </BlueprintCellButton>
    )

  return (
    <div className={shellClassName} style={shellStyle}>
      {pathRails && pathRails.length > 0 ? (
        // Affiliation by WASH (plan 2026-08-17-002 U3, revised): the wash
        // rides the cell face's own background (see `getPathWashStyle`), so
        // there is no separate tint box to misalign. The short labels stay —
        // they are the non-color identification the dashed/solid pairing
        // used to carry (SC 1.4.1) — one per member path.
        <span className="pointer-events-none absolute left-2.5 top-0 z-[3] flex gap-1.5">
          {pathRails.map((rail) => (
            <span
              key={rail.label}
              title={rail.pathName}
              className="font-mono text-3xs font-semibold tabular-nums"
              style={{ color: rail.color }}
            >
              {rail.label}
              <span className="sr-only">{` (${rail.pathName})`}</span>
            </span>
          ))}
        </span>
      ) : null}
      {innerContent}
    </div>
  )
}
