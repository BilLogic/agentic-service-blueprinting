import { BlueprintCellButton } from '@/components/blueprint/BlueprintCellButton'
import {
  buildTechPillSelection,
  type BlueprintCellSelectionContext,
} from '@/lib/blueprintCellSelection'
import { getTouchpointTone } from '@/lib/techPillColors'
import type { CSSProperties } from 'react'

type BlueprintTechPillProps = {
  item: string
  selectionContext: BlueprintCellSelectionContext
  stepIndex: number
  compact?: boolean
  opacity?: number
  style?: CSSProperties
  /** Pills share their cell id — only the first pill carries the badge. */
  sliceSequenceBadge?: boolean
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
  sliceSequenceBadge = false,
}: BlueprintTechPillProps) {
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
      style={style}
      sliceSequenceBadge={sliceSequenceBadge}
      className="min-w-0 shrink-0 break-words"
      data-blueprint-tech-pill={item}
    >
      {item}
    </BlueprintCellButton>
  )
}
