import { BlueprintCellButton } from '@/components/blueprint/BlueprintCellButton'
import { buttonVariants } from '@/components/ui/button'
import {
  blueprintCellButtonClassName,
  getBlueprintCellInteractionStyle,
} from '@/lib/blueprintCellStyle'
import { getTechPillStyle } from '@/lib/techPillTheme'
import { cn } from '@/lib/utils'
import type { CSSProperties } from 'react'

type TechPillFaceProps = {
  item: string
  compact?: boolean
  className?: string
  opacity?: number
  asSpan?: boolean
}

export function TechPillFace({
  item,
  compact = false,
  className,
  opacity,
  asSpan = false,
}: TechPillFaceProps) {
  const fill = getTechPillStyle(item).backgroundColor

  if (asSpan) {
    const style = {
      ...getBlueprintCellInteractionStyle(fill),
      ...(opacity != null && opacity < 1 ? { opacity } : undefined),
    } as CSSProperties

    return (
      <span
        className={cn(
          buttonVariants({ variant: 'blueprintPill' }),
          blueprintCellButtonClassName({ compact, variant: 'pill' }),
          'pointer-events-none min-w-0 shrink-0 cursor-default break-words',
          className,
        )}
        style={style}
      >
        {item}
      </span>
    )
  }

  return (
    <BlueprintCellButton
      fill={fill}
      variant="pill"
      compact={compact}
      opacity={opacity}
      className={cn('min-w-0 shrink-0 break-words', className)}
    >
      {item}
    </BlueprintCellButton>
  )
}
