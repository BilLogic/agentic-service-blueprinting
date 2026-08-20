import { BlueprintCellButton } from '@/components/blueprint/BlueprintCellButton'
import {
  buildTechPillSelection,
  type BlueprintCellSelectionContext,
} from '@/lib/blueprintCellSelection'
import {
  PILL_ITEM_HEIGHT,
  PILL_ITEM_HEIGHT_COMPACT,
} from '@/lib/blueprintLayout'
import { getTouchpointTone } from '@/lib/techPillColors'
import type { CSSProperties } from 'react'

type BlueprintTechPillProps = {
  item: string
  selectionContext: BlueprintCellSelectionContext
  stepIndex: number
  compact?: boolean
  opacity?: number
  style?: CSSProperties
  className?: string
  /** Pills share their cell id — only the first pill carries the badge. */
  sliceSequenceBadge?: boolean
  'aria-describedby'?: string
}

/**
 * One tech/tool pill inside a Tech-layer cell. Pills share their cell's id, so
 * only the first carries the slice sequence badge.
 */
export function BlueprintTechPill({
  item,
  selectionContext,
  stepIndex,
  compact = false,
  opacity,
  style,
  className,
  sliceSequenceBadge = false,
  'aria-describedby': ariaDescribedBy,
}: BlueprintTechPillProps) {
  const fixedHeight = compact ? PILL_ITEM_HEIGHT_COMPACT : PILL_ITEM_HEIGHT
  return (
    <BlueprintCellButton
      fill="frontstage-tech"
      tone={getTouchpointTone(item)}
      selection={buildTechPillSelection(selectionContext, item)}
      cellId={selectionContext.cellId}
      stepIndex={stepIndex}
      variant="pill"
      compact={compact}
      opacity={opacity}
      style={{
        ...style,
        height: fixedHeight,
        minHeight: fixedHeight,
        maxHeight: fixedHeight,
      }}
      aria-label={item}
      aria-describedby={ariaDescribedBy}
      sliceSequenceBadge={sliceSequenceBadge}
      className={`min-w-0 shrink-0 break-words${className ? ` ${className}` : ''}`}
      data-blueprint-tech-pill={item}
    >
      <span className="line-clamp-2 break-words" title={item}>
        {item}
      </span>
    </BlueprintCellButton>
  )
}
