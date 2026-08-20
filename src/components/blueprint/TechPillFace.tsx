import { BlueprintCellButton } from '@/components/blueprint/BlueprintCellButton'
import { buttonVariants } from '@/components/ui/button'
import {
  blueprintCellButtonClassName,
  blueprintToneAttrs,
} from '@/lib/blueprintCellStyle'
import {
  PILL_ITEM_HEIGHT,
  PILL_ITEM_HEIGHT_COMPACT,
} from '@/lib/blueprintLayout'
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
  /** Compact prose/list treatment; canvas pills keep deterministic height. */
  inline?: boolean
  'aria-describedby'?: string
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
  inline = false,
  'aria-describedby': ariaDescribedBy,
}: TechPillFaceProps) {
  const tone = getTouchpointTone(item)
  const fixedHeight = compact ? PILL_ITEM_HEIGHT_COMPACT : PILL_ITEM_HEIGHT
  const resolvedStyle = {
    ...(!inline
      ? {
          height: fixedHeight,
          minHeight: fixedHeight,
          maxHeight: fixedHeight,
        }
      : undefined),
    ...styleProp,
  } as CSSProperties

  if (asSpan) {
    const style = {
      ...(opacity != null && opacity < 1 ? { opacity } : undefined),
      ...resolvedStyle,
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
        title={item}
        aria-label={item}
        aria-describedby={ariaDescribedBy}
        {...blueprintToneAttrs(tone)}
      >
        <span className="line-clamp-2 break-words">{item}</span>
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
      style={resolvedStyle}
      aria-label={item}
      aria-describedby={ariaDescribedBy}
    >
      <span className="line-clamp-2 break-words" title={item}>
        {item}
      </span>
    </BlueprintCellButton>
  )
}
