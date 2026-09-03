import { BlueprintCellButton } from '@/components/blueprint/BlueprintCellButton'
import {
  buildTouchpointSelection,
  type BlueprintCellSelectionContext,
} from '@/lib/blueprintCellSelection'
import { getTouchpointTone } from '@/lib/touchpointColors'
import { cn } from '@/lib/utils'
import type { CSSProperties } from 'react'

type BlueprintTouchpointCellProps = {
  item: string
  selectionContext: BlueprintCellSelectionContext
  stepIndex: number
  compact?: boolean
  opacity?: number
  style?: CSSProperties
  /** Touchpoints share their cell id — only the first carries the badge. */
  sliceSequenceBadge?: boolean
  /**
   * A placement the registry lacks (#112): the name is the author's, not
   * the catalog's. Drawn dashed; the panel offers "Link to registry".
   */
  nameOnly?: boolean
}

/**
 * One touchpoint inside a touchpoints-lane cell. Touchpoints share their
 * cell's id, so only the first carries the slice sequence badge.
 */
export function BlueprintTouchpointCell({
  item,
  selectionContext,
  stepIndex,
  compact = false,
  opacity,
  style,
  sliceSequenceBadge = false,
  nameOnly = false,
}: BlueprintTouchpointCellProps) {
  return (
    <BlueprintCellButton
      fill="frontstage-touchpoint"
      tone={getTouchpointTone(item)}
      selection={buildTouchpointSelection(selectionContext, item)}
      cellId={selectionContext.cellId}
      stepIndex={stepIndex}
      variant="touchpoint"
      compact={compact}
      opacity={opacity}
      style={style}
      sliceSequenceBadge={sliceSequenceBadge}
      nameOnly={nameOnly}
      className={cn('min-w-0 shrink-0 break-words', nameOnly && 'border-dashed')}
      data-blueprint-touchpoint={item}
    >
      {item}
    </BlueprintCellButton>
  )
}
