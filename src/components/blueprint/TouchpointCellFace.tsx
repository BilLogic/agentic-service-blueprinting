import { BlueprintCellButton } from '@/components/blueprint/BlueprintCellButton'
import { buttonVariants } from '@/components/ui/button'
import {
  blueprintCellButtonClassName,
  blueprintToneAttrs,
} from '@/lib/blueprintCellStyle'
import type { EntityStatus } from '@/lib/entityStatus'
import {
  TOUCHPOINT_ITEM_HEIGHT,
  TOUCHPOINT_ITEM_HEIGHT_COMPACT,
} from '@/lib/blueprintLayout'
import { getTouchpointTone } from '@/lib/touchpointColors'
import { cn } from '@/lib/utils'
import type { CSSProperties } from 'react'

type TouchpointCellFaceProps = {
  item: string
  compact?: boolean
  className?: string
  style?: CSSProperties
  opacity?: number
  asSpan?: boolean
  /** Passed through so an unbuilt touchpoint does not read as a live one. */
  status?: EntityStatus | null
  /**
   * A placement whose touchpoint the registry lacks (#112): the same face,
   * dashed, so a reader sees the name is the author's and not the catalog's.
   */
  nameOnly?: boolean
  /** Compact prose/list treatment; the canvas keeps a deterministic height. */
  inline?: boolean
  'aria-describedby'?: string
}

/**
 * Presentational half of a touchpoint cell — the same face without the button
 * behaviour, for read-only surfaces (`asSpan`) and for print.
 */
export function TouchpointCellFace({
  item,
  compact = false,
  className,
  style: styleProp,
  opacity,
  asSpan = false,
  status,
  nameOnly = false,
  inline = false,
  'aria-describedby': ariaDescribedBy,
}: TouchpointCellFaceProps) {
  const tone = getTouchpointTone(item)
  const fixedHeight = compact
    ? TOUCHPOINT_ITEM_HEIGHT_COMPACT
    : TOUCHPOINT_ITEM_HEIGHT
  const sizedStyle = {
    ...(inline
      ? undefined
      : { height: fixedHeight, minHeight: fixedHeight, maxHeight: fixedHeight }),
    ...styleProp,
  } as CSSProperties

  if (asSpan) {
    return (
      <span
        className={cn(
          buttonVariants({ variant: 'blueprint' }),
          blueprintCellButtonClassName({ compact, variant: 'touchpoint' }),
          'pointer-events-none min-w-0 shrink-0 cursor-default break-words',
          nameOnly && 'border-dashed',
          className,
        )}
        {...(nameOnly ? { 'data-name-only': '' } : {})}
        style={{
          ...(opacity != null && opacity < 1 ? { opacity } : undefined),
          ...sizedStyle,
        }}
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
      status={status}
      fill="frontstage-touchpoint"
      tone={tone}
      variant="touchpoint"
      compact={compact}
      opacity={opacity}
      className={cn('min-w-0 shrink-0 break-words', nameOnly && 'border-dashed', className)}
      style={sizedStyle}
      aria-label={item}
      aria-describedby={ariaDescribedBy}
      nameOnly={nameOnly}
    >
      <span className="line-clamp-2 break-words" title={item}>
        {item}
      </span>
    </BlueprintCellButton>
  )
}
