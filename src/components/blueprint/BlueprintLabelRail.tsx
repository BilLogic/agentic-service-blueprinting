import {
  BlueprintDividerRailLabelLine,
} from '@/components/blueprint/BlueprintDividerTag'
import { LayerCollapseToggle } from '@/components/blueprint/LayerCollapseToggle'
import {
  BLUEPRINT_DIVIDER_ROW_HEIGHT,
  BLUEPRINT_DIVIDER_LINE_END_INSET,
  BLUEPRINT_IN_LANE_LOOP_CORRIDOR_MARGIN,
  BLUEPRINT_WRAP_CORRIDOR_MARGIN,
} from '@/lib/blueprintLayout'
import {
  BLUEPRINT_LAYER_COLLAPSE_ENABLED,
} from '@/lib/blueprintLayerCollapse'
import {
  COMPARE_LABEL_WIDTH,
  type BlueprintLabelRowSpec,
} from '@/lib/sideBySideCompareLayout'
import {
  BLUEPRINT_THEME,
  blueprintPanelLabelRailColor,
  getBlueprintLabelSection,
  getBlueprintLabelTextColor,
} from '@/lib/blueprintTheme'
import { cn } from '@/lib/utils'
import type { BlueprintLayer } from '@/types/blueprint'
import type { CSSProperties } from 'react'

export type { BlueprintLabelRowSpec }

/** Opaque rail behind sticky labels so scrolled content cannot show through row gaps. */
export function BlueprintStickyLabelBackdrop({
  rowCount,
  rowStart = 1,
}: {
  rowCount: number
  rowStart?: number
}) {
  return (
    <div
      aria-hidden
      className="pointer-events-none sticky left-0 z-[35] blueprint-panel-label-surface"
      style={{
        gridColumn: 1,
        gridRow: `${rowStart} / ${rowCount + rowStart}`,
        width: COMPARE_LABEL_WIDTH,
        alignSelf: 'stretch',
        backgroundColor: blueprintPanelLabelRailColor(),
      }}
    />
  )
}

/** Full-width 1px rule at the bottom of a swim-lane grid row. */
export function BlueprintSwimLaneDivider({
  rowIndex,
}: {
  rowIndex: number
}) {
  return (
    <div
      aria-hidden
      className="pointer-events-none relative z-[5] justify-self-stretch"
      style={{
        gridColumn: '1 / -1',
        gridRow: rowIndex + 1,
        alignSelf: 'end',
        height: 1,
        backgroundColor: BLUEPRINT_THEME.laneDivider,
      }}
    />
  )
}

/** Interaction / visibility row — label and rule share one row so the line meets the text. */
export function BlueprintDividerRow({
  rowIndex,
  label,
  lineStyle,
  compact,
  labelWidth = COMPARE_LABEL_WIDTH,
  labelRailBg = blueprintPanelLabelRailColor(BLUEPRINT_THEME.dividerBg),
  className,
  style,
}: {
  rowIndex?: number
  label: string
  lineStyle: 'dashed' | 'solid'
  compact?: boolean
  labelWidth?: number
  labelRailBg?: string
  className?: string
  style?: CSSProperties
}) {
  const gridPlacement: CSSProperties =
    rowIndex != null
      ? { gridColumn: '1 / -1', gridRow: rowIndex + 1 }
      : {}

  return (
    <div
      role="separator"
      aria-label={label}
      data-blueprint-divider={lineStyle === 'dashed' ? 'interaction' : 'visibility'}
      className={cn('relative z-[45] min-w-0', className)}
      style={{
        ...gridPlacement,
        ...style,
        height: BLUEPRINT_DIVIDER_ROW_HEIGHT,
        paddingRight: BLUEPRINT_DIVIDER_LINE_END_INSET,
      }}
    >
      <div
        aria-hidden
        className="sticky left-0 top-0 z-0 blueprint-panel-label-surface"
        style={{
          width: labelWidth,
          height: BLUEPRINT_DIVIDER_ROW_HEIGHT,
          backgroundColor: labelRailBg,
        }}
      />
      <div className="absolute inset-y-0 left-0 right-0 z-10 flex items-center pl-5">
        <BlueprintDividerRailLabelLine
          label={label}
          lineStyle={lineStyle}
          compact={compact}
          className="min-w-0 flex-1"
        />
      </div>
    </div>
  )
}

export function BlueprintLabelRow({
  row,
  layers,
  style,
  compact,
  onToggleLayer,
}: {
  row: BlueprintLabelRowSpec
  layers: BlueprintLayer[]
  style?: CSSProperties
  compact?: boolean
  onToggleLayer?: (layerId: string) => void
}) {
  const isDivider =
    row.kind === 'interaction' ||
    row.kind === 'visibility' ||
    row.kind === 'internalInteraction'
  if (isDivider) return null

  const corridorBelow = row.wrapCorridorBelow
    ? BLUEPRINT_WRAP_CORRIDOR_MARGIN
    : 0
  const inLaneLoopCorridorAbove = row.inLaneLoopCorridorAbove
    ? BLUEPRINT_IN_LANE_LOOP_CORRIDOR_MARGIN
    : 0

  const labelColor =
    row.layer != null
      ? getBlueprintLabelTextColor(getBlueprintLabelSection(row.layer, layers))
      : BLUEPRINT_THEME.headerText

  return (
    <div
      className={cn(
        'sticky left-0 isolate flex h-full min-h-0 flex-col overflow-hidden',
        'z-40 border-r blueprint-panel-label-surface',
      )}
      style={{
        ...style,
        width: COMPARE_LABEL_WIDTH,
        backgroundColor: blueprintPanelLabelRailColor(),
        borderColor: BLUEPRINT_THEME.laneDivider,
      }}
    >
      {inLaneLoopCorridorAbove > 0 && (
        <div
          aria-hidden
          className="shrink-0"
          style={{
            height: inLaneLoopCorridorAbove,
            backgroundColor: blueprintPanelLabelRailColor(),
          }}
        />
      )}
      <div
        className={cn(
          'relative flex min-h-0 flex-1 items-start gap-2 pl-5 pr-3',
          compact ? 'pt-3' : 'pt-4',
        )}
      >
        <span
          className="min-w-0 flex-1 text-left text-sm font-bold leading-snug tracking-tight whitespace-normal break-words"
          style={{ color: labelColor }}
        >
          {row.label}
        </span>
        {BLUEPRINT_LAYER_COLLAPSE_ENABLED &&
          row.kind === 'layer' &&
          row.layer &&
          onToggleLayer && (
            <LayerCollapseToggle
              layerName={row.label}
              collapsed={row.collapsed ?? false}
              onToggle={() => onToggleLayer(row.layer!.id)}
              className="size-6 shrink-0"
            />
          )}
      </div>
      {corridorBelow > 0 && (
        <div
          aria-hidden
          className="shrink-0"
          style={{
            height: corridorBelow,
            backgroundColor: blueprintPanelLabelRailColor(),
          }}
        />
      )}
    </div>
  )
}
