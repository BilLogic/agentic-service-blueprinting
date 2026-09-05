import type { MouseEvent as ReactMouseEvent } from 'react'
import {
  BlueprintDividerRailLabelLine,
} from '@/components/blueprint/BlueprintDividerBadge'
import { LaneCollapseToggle } from '@/components/blueprint/LaneCollapseToggle'
import { IconTooltip } from '@/components/editor/IconTooltip'
import {
  BLUEPRINT_DIVIDER_ROW_HEIGHT,
  BLUEPRINT_DIVIDER_LINE_END_INSET,
  BLUEPRINT_OVERHEAD_RAIL_CORRIDOR_MARGIN,
  BLUEPRINT_IN_LANE_LOOP_CORRIDOR_MARGIN,
  BLUEPRINT_WRAP_CORRIDOR_MARGIN,
} from '@/lib/blueprintLayout'
import {
  BLUEPRINT_LANE_COLLAPSE_ENABLED,
} from '@/lib/blueprintLaneCollapse'
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
import type { BlueprintLane } from '@/types/blueprint'
import type { CSSProperties } from 'react'

export type { BlueprintLabelRowSpec }

/** Opaque rail behind sticky labels so scrolled content cannot show through row gaps. */
export function BlueprintStickyLabelBackdrop({
  rowCount,
  rowStart = 1,
  bleedTop = 0,
  bleedBottom = 0,
  bleedLeft = 0,
}: {
  rowCount: number
  rowStart?: number
  /**
   * Extend the rail past the row tracks (px) so it meets the section
   * frame's INNER edges (stop short of the border — the rail must never
   * paint over it) instead of leaving white L-gaps inside the frame — the
   * band's rows do not include the frame insets.
   */
  bleedTop?: number
  bleedBottom?: number
  bleedLeft?: number
}) {
  return (
    <div
      aria-hidden
      className="pointer-events-none sticky z-[35]"
      style={{
        gridColumn: 1,
        gridRow: `${rowStart} / ${rowCount + rowStart}`,
        width: COMPARE_LABEL_WIDTH + bleedLeft,
        alignSelf: 'stretch',
        left: bleedLeft > 0 ? -bleedLeft : 0,
        marginLeft: bleedLeft > 0 ? -bleedLeft : undefined,
        marginTop: bleedTop > 0 ? -bleedTop : undefined,
        marginBottom: bleedBottom > 0 ? -bleedBottom : undefined,
        // The frame's inner corner is rounded; a square gray corner poking
        // into it reads as a laneing bug.
        borderBottomLeftRadius: bleedLeft > 0 && bleedBottom > 0 ? 9 : undefined,
        backgroundColor: blueprintPanelLabelRailColor(),
      }}
    />
  )
}

/** Full-width 1px rule at the bottom of a swim-lane grid row.
 * Starts at column 2 so it stays inside path boards and does not leak
 * across the label rail / card-gap gutter outside the section frame.
 */
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
        gridColumn: '2 / -1',
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
  lineStyle: 'dashed' | 'dotted' | 'solid'
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

  const dividerKind =
    lineStyle === 'dashed'
      ? 'interaction'
      : lineStyle === 'dotted'
        ? 'internal-interaction'
        : 'visibility'

  return (
    <div
      role="separator"
      aria-label={label}
      data-blueprint-divider={dividerKind}
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
        className="sticky left-0 top-0 z-0"
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

import { EntityPropertiesButton } from '@/components/blueprint/EntityPropertiesButton'
import { LaneHeaderAffordance } from '@/components/blueprint/LaneHeaderAffordance'
import { useCanvasModeValue } from '@/contexts/canvasModeContext'
import { useCellPick } from '@/contexts/cellPickContext'
import { cellsInLane } from '@/lib/canvasCellQuery'

/** One row of the left label column — a lane name plus its collapse toggle. */
export function BlueprintLabelRow({
  row,
  lanes,
  style,
  compact,
  onToggleLane,
}: {
  row: BlueprintLabelRowSpec
  lanes: BlueprintLane[]
  style?: CSSProperties
  compact?: boolean
  onToggleLane?: (laneId: string) => void
}) {
  // Hooks first: this component returns early for divider rows, and a hook
  // after that return would run in a different order between row kinds.
  //
  // In Design mode the lane label becomes a selection handle — clicking takes
  // the whole lane, shift-clicking adds it to what is already picked. Inert in
  // View, so reading the blueprint is untouched.
  const canvasMode = useCanvasModeValue()
  const pick = useCellPick()
  const laneId = row.kind === 'lane' ? (row.lane?.id ?? null) : null
  const laneSelectable =
    canvasMode === 'design' && pick !== null && laneId !== null
  const selectLane = (event: ReactMouseEvent<HTMLElement>) => {
    if (!laneSelectable || laneId === null) return
    const cells = cellsInLane(laneId)
    if (cells.length === 0) return
    event.stopPropagation()
    // Add, not toggle: a lane that is already half-picked should end up wholly
    // picked. Shift takes the lane back out.
    pick.pickMany(cells, event.shiftKey ? 'toggle' : 'add')
  }

  const isDivider =
    row.kind === 'interaction' ||
    row.kind === 'visibility' ||
    row.kind === 'internalInteraction'
  if (isDivider) return null

  const corridorAbove = row.wrapCorridorAbove
    ? BLUEPRINT_OVERHEAD_RAIL_CORRIDOR_MARGIN
    : 0
  const corridorBelow = row.wrapCorridorBelow
    ? BLUEPRINT_WRAP_CORRIDOR_MARGIN
    : 0
  const inLaneLoopCorridorAbove = row.inLaneLoopCorridorAbove
    ? BLUEPRINT_IN_LANE_LOOP_CORRIDOR_MARGIN
    : 0

  const labelColor =
    row.lane != null
      ? getBlueprintLabelTextColor(getBlueprintLabelSection(row.lane, lanes))
      : BLUEPRINT_THEME.headerText

  return (
    <div
      className={cn(
        'sticky left-0 isolate flex h-full min-h-0 flex-col overflow-hidden',
        'z-40 border-r ',
      )}
      style={{
        ...style,
        width: COMPARE_LABEL_WIDTH,
        backgroundColor: blueprintPanelLabelRailColor(),
        borderColor: BLUEPRINT_THEME.laneDivider,
      }}
    >
      {corridorAbove > 0 && (
        <div
          aria-hidden
          className="shrink-0"
          style={{
            height: corridorAbove,
            backgroundColor: blueprintPanelLabelRailColor(),
          }}
        />
      )}
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
          'group/lane-header relative flex min-h-0 flex-1 items-start gap-2 pl-5 pr-3',
          compact ? 'pt-3' : 'pt-4',
        )}
      >
        {laneSelectable ? (
          <IconTooltip label={`Select the ${row.label} lane`}>
            <button
              type="button"
              onClick={selectLane}
              data-blueprint-row-header=""
              className="group/lane relative min-w-0 flex-1 cursor-pointer rounded-sm text-left text-sm font-bold leading-snug tracking-tight whitespace-normal break-words underline-offset-4 hover:underline"
              style={{ color: labelColor }}
            >
              {row.label}
            </button>
          </IconTooltip>
        ) : row.kind === 'lane' && row.lane ? (
          // View mode: the label is inert prose, so the whole block becomes
          // the way into the lane's properties.
          <LaneHeaderAffordance
            laneId={row.lane.id}
            laneName={row.label}
            color={labelColor}
          />
        ) : (
          <span
            data-blueprint-row-header=""
            className="relative min-w-0 flex-1 text-left text-sm font-bold leading-snug tracking-tight whitespace-normal break-words"
            style={{ color: labelColor }}
          >
            {row.label}
          </span>
        )}
        {/* Design mode only, and beside the selection handle rather than
            inside it: there the label already means "select every cell in
            this lane", and the two readings have to stay visibly separate.
            In View mode the block itself opens the panel, so a second control
            would be a duplicate. */}
        {laneSelectable && row.lane ? (
          <EntityPropertiesButton
            kind="lane"
            id={row.lane.id}
            name={row.label}
          />
        ) : null}
        {BLUEPRINT_LANE_COLLAPSE_ENABLED &&
          row.kind === 'lane' &&
          row.lane &&
          onToggleLane && (
            <LaneCollapseToggle
              laneName={row.label}
              collapsed={row.collapsed ?? false}
              onToggle={() => onToggleLane(row.lane!.id)}
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
