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
  /**
   * A placement the registry lacks (#112): the name is the author's, not
   * the catalog's, and the face says so with a dashed border.
   */
  nameOnly?: boolean
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
  nameOnly = false,
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
          nameOnly && 'border-dashed',
          className,
        )}
        style={style}
        {...blueprintToneAttrs(tone)}
        {...(nameOnly ? { 'data-name-only': '' } : {})}
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
      className={cn('min-w-0 shrink-0 break-words', nameOnly && 'border-dashed', className)}
      style={styleProp}
      nameOnly={nameOnly}
    >
      {item}
    </BlueprintCellButton>
  )
}
