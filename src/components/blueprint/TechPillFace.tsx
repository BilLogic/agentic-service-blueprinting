import { BlueprintCellButton } from '@/components/blueprint/BlueprintCellButton'
import { buttonVariants } from '@/components/ui/button'
import {
  blueprintCellButtonClassName,
  blueprintToneAttrs,
} from '@/lib/blueprintCellStyle'
import { getTouchpointTone } from '@/lib/techPillColors'
import { cn } from '@/lib/utils'
import type { CSSProperties } from 'react'

type TechPillFaceProps = {
  item: string
  compact?: boolean
  className?: string
  style?: CSSProperties
  opacity?: number
  asSpan?: boolean
}

/**
 * Presentational half of a tech pill — the same face without the button
 * behaviour, for read-only surfaces (`asSpan`) and for print.
 */
export function TechPillFace({
  item,
  compact = false,
  className,
  style: styleProp,
  opacity,
  asSpan = false,
}: TechPillFaceProps) {
  const tone = getTouchpointTone(item)

  if (asSpan) {
    const style = {
      ...(opacity != null && opacity < 1 ? { opacity } : undefined),
      ...styleProp,
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
        {...blueprintToneAttrs(tone)}
      >
        {item}
      </span>
    )
  }

  return (
    <BlueprintCellButton
      fill="frontstage-tech"
      tone={tone}
      variant="pill"
      compact={compact}
      opacity={opacity}
      className={cn('min-w-0 shrink-0 break-words', className)}
      style={styleProp}
    >
      {item}
    </BlueprintCellButton>
  )
}
