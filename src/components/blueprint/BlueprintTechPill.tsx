import { BlueprintCellButton } from '@/components/blueprint/BlueprintCellButton'
import {
  buildTechPillSelection,
  type BlueprintCellSelectionContext,
} from '@/lib/blueprintCellSelection'
import { getTechPillStyle } from '@/lib/techPillTheme'

type BlueprintTechPillProps = {
  item: string
  selectionContext: BlueprintCellSelectionContext
  stepIndex: number
  compact?: boolean
  opacity?: number
}

export function BlueprintTechPill({
  item,
  selectionContext,
  stepIndex,
  compact = false,
  opacity,
}: BlueprintTechPillProps) {
  return (
    <BlueprintCellButton
      fill={getTechPillStyle(item).backgroundColor}
      selection={buildTechPillSelection(selectionContext, item)}
      cellId={selectionContext.cellId}
      stepIndex={stepIndex}
      variant="pill"
      compact={compact}
      opacity={opacity}
      className="min-w-0 shrink-0 break-words"
      data-blueprint-tech-pill={item}
    >
      {item}
    </BlueprintCellButton>
  )
}
