import { BLUEPRINT_THEME } from '@/lib/blueprintTheme'
import { getBlueprintFillStyle } from '@/lib/pathColorTheme'
import { cn } from '@/lib/utils'
import type { CSSProperties } from 'react'

type BlueprintDividerTagProps = {
  label: string
  compact?: boolean
  /** Flat right edge so the rule can meet the pill flush (Figma-style). */
  connected?: boolean
}

/** Light label-rail divider caption — reference blueprint interaction/visibility rows. */
export function BlueprintDividerRailLabel({
  label,
  compact,
}: {
  label: string
  compact?: boolean
}) {
  return (
    <span
      data-blueprint-row-header=""
      className={cn(
        'relative shrink-0 font-medium uppercase leading-none tracking-[0.08em]',
        compact ? 'text-3xs' : 'text-2xs',
      )}
      style={{ color: BLUEPRINT_THEME.dividerLabel }}
    >
      {label}
    </span>
  )
}

/** Figma-style dark pill label for interaction / visibility divider rows. */
export function BlueprintDividerTag({
  label,
  compact,
  connected,
}: BlueprintDividerTagProps) {
  return (
    <span
      data-blueprint-fill
      className={cn(
        'inline-flex shrink-0 items-center px-3 py-1.5 font-semibold uppercase leading-none tracking-[0.06em]',
        compact ? 'text-3xs' : 'text-2xs',
        connected ? 'rounded-l rounded-r-none' : 'rounded',
      )}
      style={getBlueprintFillStyle(BLUEPRINT_THEME.dividerTagBg)}
    >
      {label}
    </span>
  )
}

/** Label + rule in one row — line starts flush at the label's right edge. */
export type BlueprintDividerLineStyle = 'dashed' | 'dotted' | 'solid'

export function BlueprintDividerRailLabelLine({
  label,
  lineStyle,
  compact,
  className,
}: {
  label: string
  lineStyle: BlueprintDividerLineStyle
  compact?: boolean
  className?: string
}) {
  return (
    <div className={cn('flex min-w-0 items-center', className)}>
      <BlueprintDividerRailLabel label={label} compact={compact} />
      <BlueprintDividerRule lineStyle={lineStyle} className="min-w-0 flex-1" />
    </div>
  )
}

type BlueprintDividerRuleProps = {
  lineStyle: BlueprintDividerLineStyle
  className?: string
  style?: CSSProperties
}

const DIVIDER_LINE_COLOR = BLUEPRINT_THEME.divider

/** Horizontal rule extending from a divider tag — background-based so dashes start flush. */
export function BlueprintDividerRule({
  lineStyle,
  className,
  style,
}: BlueprintDividerRuleProps) {
  const lineStyleProps: CSSProperties =
    lineStyle === 'dashed'
      ? {
          backgroundImage: `linear-gradient(to right, ${DIVIDER_LINE_COLOR} 0, ${DIVIDER_LINE_COLOR} 6px, transparent 6px, transparent 12px)`,
          backgroundSize: '12px 1px',
          backgroundRepeat: 'repeat-x',
          backgroundPosition: 'left center',
        }
      : lineStyle === 'dotted'
        ? {
            backgroundImage: `linear-gradient(to right, ${DIVIDER_LINE_COLOR} 0, ${DIVIDER_LINE_COLOR} 2px, transparent 2px, transparent 6px)`,
            backgroundSize: '6px 1px',
            backgroundRepeat: 'repeat-x',
            backgroundPosition: 'left center',
          }
        : { backgroundColor: DIVIDER_LINE_COLOR }

  return (
    <div
      aria-hidden
      className={cn('h-px shrink-0 self-center', className)}
      style={{ ...lineStyleProps, ...style }}
    />
  )
}

type BlueprintDividerLabelLineProps = {
  label: string
  lineStyle: BlueprintDividerLineStyle
  compact?: boolean
  /** Tag + rule as one inline flex cluster (no gap between pill and line). */
  className?: string
}

/** Pill and rule in a single flex row — line starts flush at the tag's right edge. */
export function BlueprintDividerLabelLine({
  label,
  lineStyle,
  compact,
  className,
}: BlueprintDividerLabelLineProps) {
  return (
    <div className={cn('flex min-w-0 items-center', className)}>
      <BlueprintDividerTag label={label} compact={compact} connected />
      <BlueprintDividerRule lineStyle={lineStyle} className="min-w-0 flex-1" />
    </div>
  )
}
