import { Button } from '@/components/ui/button'
import { useBlueprintCellDetailOptional } from '@/contexts/BlueprintCellDetailContext'
import {
  blueprintCellButtonClassName,
  getBlueprintCellInteractionStyle,
} from '@/lib/blueprintCellStyle'
import { isSameBlueprintCellSelection } from '@/lib/blueprintCellSelection'
import { resolveBlueprintCellId } from '@/lib/resolveBlueprintCellId'
import type { BlueprintCellSelection } from '@/types/blueprintCellDetail'
import { cn } from '@/lib/utils'
import type { CSSProperties, MouseEvent, ReactNode } from 'react'

type BlueprintCellButtonProps = {
  /** Layer or pill pastel fill — drives button background while keeping shadcn interaction states. */
  fill: string
  compact?: boolean
  className?: string
  style?: CSSProperties
  selection?: BlueprintCellSelection
  cellId?: string
  stepIndex?: number
  variant?: 'cell' | 'pill' | 'visual'
  opacity?: number
  children: ReactNode
  'aria-label'?: string
  'data-blueprint-tech-pill'?: string
}

export function BlueprintCellButton({
  fill,
  compact = false,
  className,
  style,
  selection,
  cellId,
  stepIndex = -1,
  variant = 'cell',
  opacity,
  children,
  'aria-label': ariaLabel,
  'data-blueprint-tech-pill': techPillLabel,
}: BlueprintCellButtonProps) {
  const detail = useBlueprintCellDetailOptional()
  const isInteractive = Boolean(detail?.enabled && selection && detail)
  const isActive =
    isInteractive &&
    isSameBlueprintCellSelection(detail!.selection, selection!)
  const resolvedCellId = cellId ? resolveBlueprintCellId(cellId) : null
  const isSelectedCell = Boolean(
    detail?.selection &&
      cellId &&
      (detail.selectedCellIds.has(cellId) ||
        (resolvedCellId && detail.selectedCellIds.has(resolvedCellId))),
  )
  const isDirectlyConnected = Boolean(
    detail?.selection &&
      cellId &&
      (detail.directlyConnectedCellIds.has(cellId) ||
        (resolvedCellId &&
          detail.directlyConnectedCellIds.has(resolvedCellId))),
  )
  const preview = detail?.previewHover ?? null
  const previewCellId = preview?.cellId
    ? resolveBlueprintCellId(preview.cellId)
    : null
  const matchesPreviewCell = Boolean(
    preview &&
      cellId &&
      (preview.cellId === cellId ||
        previewCellId === cellId ||
        (resolvedCellId != null &&
          (preview.cellId === resolvedCellId ||
            previewCellId === resolvedCellId))),
  )
  const isPreviewHover = Boolean(
    matchesPreviewCell &&
      (techPillLabel
        ? preview?.techItem === techPillLabel
        : !preview?.techItem),
  )
  const emphasis = !detail?.selection
    ? undefined
    : isActive
      ? 'active'
      : isSelectedCell || isDirectlyConnected
        ? 'connected'
        : 'unrelated'

  const handleClick = (event: MouseEvent<HTMLButtonElement>) => {
    if (!isInteractive) return
    event.stopPropagation()
    detail!.selectCell(selection!)
  }

  const surfaceStyle = {
    ...getBlueprintCellInteractionStyle(fill),
    ...(opacity != null && opacity < 1 ? { opacity } : undefined),
    ...style,
  } as CSSProperties

  const buttonVariant = variant === 'pill' ? 'blueprintPill' : 'blueprint'

  return (
    <Button
      type="button"
      variant={buttonVariant}
      data-blueprint-cell-anchor=""
      {...(cellId ? { 'data-blueprint-cell': cellId } : {})}
      data-step-index={stepIndex}
      {...(techPillLabel ? { 'data-blueprint-tech-pill': techPillLabel } : {})}
      aria-label={ariaLabel}
      aria-pressed={isInteractive ? isActive : undefined}
      data-blueprint-cell-emphasis={emphasis}
      {...(isPreviewHover ? { 'data-blueprint-cell-preview-hover': '' } : {})}
      {...(isInteractive ? { 'data-blueprint-cell-interactive': '' } : {})}
      onClick={isInteractive ? handleClick : undefined}
      tabIndex={isInteractive ? 0 : -1}
      className={cn(
        blueprintCellButtonClassName({ compact, variant, className }),
        variant === 'cell' && 'min-h-[80px]',
        variant === 'visual' &&
          'min-h-0 h-full max-h-full overflow-hidden',
        !isInteractive && 'pointer-events-none cursor-default',
      )}
      style={surfaceStyle}
    >
      {children}
    </Button>
  )
}
