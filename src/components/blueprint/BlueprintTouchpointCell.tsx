import { BlueprintCellButton } from '@/components/blueprint/BlueprintCellButton'
import { TouchpointCellFace } from '@/components/blueprint/TouchpointCellFace'
import type { EntityStatus } from '@/lib/entityStatus'
import {
  buildTouchpointSelection,
  type BlueprintCellSelectionContext,
} from '@/lib/blueprintCellSelection'
import {
  TOUCHPOINT_ITEM_HEIGHT,
  TOUCHPOINT_ITEM_HEIGHT_COMPACT,
} from '@/lib/blueprintLayout'
import { getTouchpointTone } from '@/lib/touchpointColors'
import { cn } from '@/lib/utils'
import type { CSSProperties } from 'react'

type BlueprintTouchpointCellProps = {
  item: string
  /**
   * What clicking this opens. Omitted on a read-only surface — print, the
   * compare grid's unselectable side, the dependency lists in the panel —
   * and its absence is what makes the cell a face rather than a control.
   */
  selectionContext?: BlueprintCellSelectionContext
  stepIndex?: number
  compact?: boolean
  opacity?: number
  style?: CSSProperties
  className?: string
  /** Touchpoints share their cell id — only the first carries the badge. */
  sliceSequenceBadge?: boolean
  /** Passed through so an unbuilt touchpoint does not read as a live one. */
  status?: EntityStatus | null
  /**
   * A placement whose touchpoint the registry lacks (#112): the same face,
   * dashed, so a reader sees the name is the author's and not the catalog's.
   */
  nameOnly?: boolean
  /**
   * Render a `<span>` rather than a button, for a surface that supplies its
   * own control around it (the panel's dependency lists) or has none at all
   * (print). Only meaningful without a `selectionContext`.
   */
  asSpan?: boolean
  /** Compact prose/list treatment; the canvas keeps a deterministic height. */
  inline?: boolean
  'aria-describedby'?: string
}

/**
 * One touchpoint inside a touchpoint-lane cell — A CELL WITH A SHAPE VARIANT.
 *
 * It is the same `BlueprintCellButton` every other cell face is, asking for
 * `variant="touchpoint"`, which is a corner radius and a padding scale and
 * nothing else. The read-only face is `TouchpointCellFace` and this hands
 * `asSpan` straight to it rather than drawing a second one: one shape, two
 * surfaces, and no duplicate `Button` variant of its own.
 *
 * Touchpoints share their cell's id, so only the first carries the slice
 * sequence badge.
 */
export function BlueprintTouchpointCell({
  item,
  selectionContext,
  stepIndex = -1,
  compact = false,
  opacity,
  style,
  className,
  sliceSequenceBadge = false,
  status,
  nameOnly = false,
  asSpan = false,
  inline = false,
  'aria-describedby': ariaDescribedBy,
}: BlueprintTouchpointCellProps) {
  const tone = getTouchpointTone(item)
  const fixedHeight = compact
    ? TOUCHPOINT_ITEM_HEIGHT_COMPACT
    : TOUCHPOINT_ITEM_HEIGHT
  const sizedStyle = {
    ...(inline
      ? undefined
      : { height: fixedHeight, minHeight: fixedHeight, maxHeight: fixedHeight }),
    ...style,
  } as CSSProperties

  if (asSpan) {
    return (
      <TouchpointCellFace
        item={item}
        compact={compact}
        className={className}
        style={style}
        opacity={opacity}
        asSpan
        status={status}
        nameOnly={nameOnly}
        inline={inline}
        aria-describedby={ariaDescribedBy}
      />
    )
  }

  return (
    <BlueprintCellButton
      status={status}
      fill="frontstage-touchpoint"
      tone={tone}
      selection={
        selectionContext
          ? buildTouchpointSelection(selectionContext, item)
          : undefined
      }
      cellId={selectionContext?.cellId}
      stepIndex={stepIndex}
      variant="touchpoint"
      compact={compact}
      opacity={opacity}
      style={sizedStyle}
      aria-label={item}
      aria-describedby={ariaDescribedBy}
      sliceSequenceBadge={sliceSequenceBadge}
      nameOnly={nameOnly}
      className={cn('min-w-0 shrink-0 break-words', nameOnly && 'border-dashed', className)}
      data-blueprint-touchpoint={item}
    >
      <span className="line-clamp-2 break-words" title={item}>
        {item}
      </span>
    </BlueprintCellButton>
  )
}
