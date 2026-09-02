import { parseCellContentItems } from '@/lib/parseCellContent'
import {
  BACKSTAGE_ACTIONS_ROLE,
  BACKSTAGE_TECH_ROLE,
  CUSTOMER_ACTIONS_ROLE,
  FRONTSTAGE_ACTIONS_ROLE,
  FRONTSTAGE_TECH_ROLE,
  getLaneRole,
  STEP_VISUAL_ROLE,
  SUPPORT_SYSTEMS_ROLE,
  VISUAL_ROLE,
} from '@/lib/laneRoles'
import type { BlueprintData, BlueprintLane } from '@/types/blueprint'

/** Minimal lane shape for role-driven layout checks. */
type LaneRoleSource = { name: string; role?: string | null }

/** Roles whose cells list multiple items as inline pills (newline-separated content). */
export const PILL_CELL_LANE_ROLES = [
  FRONTSTAGE_TECH_ROLE,
  BACKSTAGE_TECH_ROLE,
  SUPPORT_SYSTEMS_ROLE,
] as const

/** Roles rendered as frame rows instead of text cells. */
export const VISUAL_LANE_ROLES = [VISUAL_ROLE, STEP_VISUAL_ROLE] as const

export const VISUAL_ROW_MIN_HEIGHT = 132
export const VISUAL_ROW_MIN_HEIGHT_COMPACT = 108

/** Max height for the visual cell button inside a swimlane row (excludes shell padding). */
export function getVisualCellButtonMaxHeight(compact = false): number {
  const rowHeight = compact ? VISUAL_ROW_MIN_HEIGHT_COMPACT : VISUAL_ROW_MIN_HEIGHT
  const shellVerticalPad = compact ? 24 : 32
  return rowHeight - shellVerticalPad
}

export function shouldUsePillCellContent(lane: LaneRoleSource): boolean {
  const role = getLaneRole(lane)
  return (
    role !== null && (PILL_CELL_LANE_ROLES as readonly string[]).includes(role)
  )
}

/** Which face a lane's cells wear — pill stack, step visual, or plain cell. */
export type BlueprintCellVariant = 'default' | 'pills' | 'visual'

/**
 * Whether a cell has anything to draw for its lane's variant. A visual cell
 * is decided by its frames upstream, a pill cell by having at least one
 * parsable item, a plain cell by non-blank content.
 */
export function hasBlueprintCellContent(
  content: string | undefined,
  variant: BlueprintCellVariant,
): boolean {
  if (variant === 'visual') return true
  if (!content?.trim()) return false
  if (variant === 'pills') {
    return parseCellContentItems(content).length > 0
  }
  return true
}

export function shouldUseVisualContent(lane: LaneRoleSource): boolean {
  const role = getLaneRole(lane)
  return (
    role !== null && (VISUAL_LANE_ROLES as readonly string[]).includes(role)
  )
}

/** The standard service-blueprint interaction line follows the spine actor. */
export function shouldShowInteractionLineAfter(lane: BlueprintLane): boolean {
  return getLaneRole(lane) === CUSTOMER_ACTIONS_ROLE
}

/** The visibility line is drawn after frontstage lanes (above backstage lanes). */
export function shouldShowVisibilityLineAfter(
  lane: BlueprintLane,
  lanes?: BlueprintLane[],
): boolean {
  const role = getLaneRole(lane)
  if (role !== FRONTSTAGE_ACTIONS_ROLE && role !== FRONTSTAGE_TECH_ROLE) {
    return false
  }

  // Frontstage tech can sit above frontstage actions — the visibility line
  // follows the actions lane, not the tech lane.
  if (role === FRONTSTAGE_TECH_ROLE && lanes) {
    const index = lanes.findIndex((entry) => entry.id === lane.id)
    const next = lanes[index + 1]
    if (next && getLaneRole(next) === FRONTSTAGE_ACTIONS_ROLE) {
      return false
    }
  }

  return true
}

/**
 * Support handoff lanes that sit below backstage actions. `support_systems`
 * (e.g. Computer Systems) is the canonical role; a board may also carry a
 * null-role "Support Actions" swimlane, which must still anchor the divider
 * without picking up support_systems pill-cell rendering.
 */
function isSupportHandoffLane(lane: LaneRoleSource): boolean {
  if (getLaneRole(lane) === SUPPORT_SYSTEMS_ROLE) return true
  return (
    lane.name === 'Support Actions' || lane.name === 'Tech Support Actions'
  )
}

/**
 * The internal interaction line marks the hand-off from backstage actions to
 * support systems / support actions, so it draws after a backstage-actions
 * lane only when a support handoff lane follows.
 */
export function shouldShowInternalInteractionLineAfter(
  lane: BlueprintLane,
  lanes?: BlueprintLane[],
): boolean {
  if (getLaneRole(lane) !== BACKSTAGE_ACTIONS_ROLE) return false
  if (!lanes) return false
  const index = lanes.findIndex((entry) => entry.id === lane.id)
  const next = lanes[index + 1]
  return next !== undefined && isSupportHandoffLane(next)
}

/** Light rule between swim lanes; omitted before interaction/visibility dividers. */
export function shouldShowLaneDividerAfter(
  lane: BlueprintLane,
  laneIndex: number,
  lanes: BlueprintLane[],
): boolean {
  if (laneIndex >= lanes.length - 1) return false
  if (shouldShowInteractionLineAfter(lane)) return false
  if (shouldShowVisibilityLineAfter(lane, lanes)) return false
  if (shouldShowInternalInteractionLineAfter(lane, lanes)) return false
  return true
}

/** Lane row is immediately followed by a blueprint divider band. */
export function lanePrecedesBlueprintDivider(
  lane: BlueprintLane,
  lanes?: BlueprintLane[],
): boolean {
  return (
    shouldShowInteractionLineAfter(lane) ||
    shouldShowVisibilityLineAfter(lane, lanes) ||
    shouldShowInternalInteractionLineAfter(lane, lanes)
  )
}

// Service-blueprint canon: the dividers are the "line of …" boundaries.
export const INTERACTION_LINE_LABEL = 'LINE OF INTERACTION'
export const VISIBILITY_LINE_LABEL = 'LINE OF VISIBILITY'
export const INTERNAL_INTERACTION_LINE_LABEL = 'LINE OF INTERNAL INTERACTION'

export const BLUEPRINT_DIVIDER_ROW_HEIGHT = 28
/** Right inset so interaction / visibility lines stop before the board edge. */
export const BLUEPRINT_DIVIDER_LINE_END_INSET = 16
/** Transparent margin above the interaction line for loop-back arrows. */
export const BLUEPRINT_WRAP_CORRIDOR_MARGIN = 36
/** Space above a lane row for overhead-rail arrows that skip columns in it. */
export const BLUEPRINT_OVERHEAD_RAIL_CORRIDOR_MARGIN = 36
/** Space at the top of a lane row for in-lane loop-back arrows. */
export const BLUEPRINT_IN_LANE_LOOP_CORRIDOR_MARGIN = 32

/**
 * Step column each cell in one lane sits in, keyed by cell id.
 *
 * Both lane corridors are decided by comparing the columns a trigger's two
 * ends occupy, so the shape of that question is the same either way: restrict
 * to the lane, then resolve `step_id` through `steps.position`. Reading
 * the data this way (rather than parsing anything out of an id) is what keeps
 * the rule true for any blueprint.
 */
function getLaneCellColumns(
  data: BlueprintData,
  laneId: string,
): Map<string, number> {
  const columnByStepId = new Map<string, number>()
  for (const step of data.steps) {
    columnByStepId.set(step.id, step.position)
  }

  const columnByCellId = new Map<string, number>()
  for (const cell of data.cells) {
    if (cell.lane_id !== laneId) continue
    const column = columnByStepId.get(cell.step_id)
    if (column === undefined) continue
    columnByCellId.set(cell.id, column)
  }
  return columnByCellId
}

/**
 * Does this blueprint hold a trigger that stays inside `laneId` and whose two
 * step columns satisfy `matches`? Triggers that leave the lane at either end
 * are not the lane's business — they are routed between rows, not around one.
 */
function blueprintHasInLaneTrigger(
  data: BlueprintData,
  laneId: string,
  matches: (sourceColumn: number, targetColumn: number) => boolean,
): boolean {
  const columnByCellId = getLaneCellColumns(data, laneId)
  if (columnByCellId.size === 0) return false

  return data.triggers.some((trigger) => {
    const sourceColumn = columnByCellId.get(trigger.source_cell_id)
    const targetColumn = columnByCellId.get(trigger.target_cell_id)
    if (sourceColumn === undefined || targetColumn === undefined) return false
    return matches(sourceColumn, targetColumn)
  })
}

function anyBlueprintHasInLaneTrigger(
  lane: BlueprintLane,
  data: BlueprintData | readonly BlueprintData[] | undefined,
  matches: (sourceColumn: number, targetColumn: number) => boolean,
): boolean {
  if (!data) return false
  const blueprints = Array.isArray(data) ? data : [data]
  return blueprints.some((blueprint) =>
    blueprintHasInLaneTrigger(blueprint, lane.id, matches),
  )
}

/**
 * A lane needs the overhead rail when one of its own triggers runs FORWARD and
 * clears at least one column on the way (target column >= source + 2). Such a
 * connector cannot travel along the row — the cells it skips are in the way —
 * so it climbs into a strip above the row, runs across, and drops back in.
 *
 * The arrow side asks the same question of the DOM (`isOverheadRailTrigger`);
 * the two must agree or the rail would be drawn where no space was reserved.
 */
export function laneHasOverheadArrowCorridor(
  lane: BlueprintLane,
  data?: BlueprintData | readonly BlueprintData[],
): boolean {
  return anyBlueprintHasInLaneTrigger(
    lane,
    data,
    (sourceColumn, targetColumn) => targetColumn >= sourceColumn + 2,
  )
}

/**
 * A lane needs the in-lane loop corridor when one of its own triggers runs
 * BACKWARD — its target sits in an earlier column than its source. That arrow
 * loops back over the row it started on, so the row reserves a thin strip
 * above itself for the horizontal leg.
 *
 * Mirrored on the arrow side by `isInLaneWrapTrigger`.
 */
export function laneHasInLaneLoopCorridor(
  lane: BlueprintLane,
  data?: BlueprintData | readonly BlueprintData[],
): boolean {
  return anyBlueprintHasInLaneTrigger(
    lane,
    data,
    (sourceColumn, targetColumn) => targetColumn < sourceColumn,
  )
}

export function countInLaneLoopCorridorMargins(
  lanes: BlueprintLane[],
  data?: BlueprintData,
): number {
  if (!data) return 0
  return lanes.filter((lane) => laneHasInLaneLoopCorridor(lane, data)).length
}

export function countOverheadRailCorridorMargins(
  lanes: BlueprintLane[],
  data: BlueprintData,
): number {
  return lanes.filter((lane) => laneHasOverheadArrowCorridor(lane, data))
    .length
}

/**
 * Does a corridor open UNDER this lane row? Only the spine actor's row has
 * one: the standard blueprint already leaves a band between it and the line of
 * interaction, and backward loops on that row are routed through it rather
 * than over the cells.
 */
export function laneHasWrapCorridorBelow(lane: BlueprintLane): boolean {
  return shouldShowInteractionLineAfter(lane)
}

export function countBlueprintDividerRows(lanes: BlueprintLane[]): number {
  return lanes.filter(
    (lane) =>
      shouldShowInteractionLineAfter(lane) ||
      shouldShowVisibilityLineAfter(lane, lanes) ||
      shouldShowInternalInteractionLineAfter(lane, lanes),
  ).length
}

export function countBlueprintWrapCorridorMargins(
  lanes: BlueprintLane[],
): number {
  return lanes.filter(laneHasWrapCorridorBelow).length
}

export const LANE_COLUMN_WIDTH = 220
export const STEP_COLUMN_WIDTH = 220
/** Visible space between step columns where trigger arrows are drawn. */
export const STEP_COLUMN_GAP = 24
/** Left gutter on the white board so the play control clears Visual cells. */
export const VISUAL_PLAY_GUTTER = 28

export function getStepColumnLeft(stepIndex: number): number {
  return LANE_COLUMN_WIDTH + stepIndex * (STEP_COLUMN_WIDTH + STEP_COLUMN_GAP)
}

export function getStepColumnRight(stepIndex: number): number {
  return getStepColumnLeft(stepIndex) + STEP_COLUMN_WIDTH
}

export function getStepColumnsWidth(stepCount: number): number {
  if (stepCount <= 0) return 0
  const gaps = Math.max(0, stepCount - 1)
  return stepCount * STEP_COLUMN_WIDTH + gaps * STEP_COLUMN_GAP
}

export const BLUEPRINT_ROW_MIN_HEIGHT = 96
/** Used only when fitVertically compresses rows into a fixed artboard. */
export const BLUEPRINT_ROW_MIN_HEIGHT_COMPACT = 60
export const BLUEPRINT_PADDING = 24
export const BLUEPRINT_HEADER_HEIGHT = 48
export const BLUEPRINT_HEADER_HEIGHT_COMPACT = 32
/** Gap between swim lanes and dividers (0 — lane borders handle separation). */
export const BLUEPRINT_LANE_ROW_GAP = 0
/** Padding around the grid body for arrow overlay bleed (matches ARROW_VIEWPORT_PAD). */
export const BLUEPRINT_GRID_VIEWPORT_PAD = 13
/** Artboard inner wrapper (p-2; formerly CanvasBlueprintArtboard). */
export const BLUEPRINT_CANVAS_INNER_PADDING = 16
/** mb-2 below the compact path header row. */
export const BLUEPRINT_COMPACT_HEADER_GAP = 8
/** Scroll container border (1px each side). */
export const BLUEPRINT_CANVAS_SCROLL_BORDER = 2
/** Safety margin for wrapped cell text on canvas artboards. */
export const BLUEPRINT_ARTBOARD_HEIGHT_BUFFER = 32
/** Safety margin for horizontal grid bleed on canvas artboards. */
export const BLUEPRINT_ARTBOARD_WIDTH_BUFFER = 32

/** Outer gutter around each cell (Tailwind p-3 ≈ 12px per side). */
export const BLUEPRINT_CELL_GUTTER = 12
/** Default cell inner content padding (px-4 py-3). */
export const BLUEPRINT_CELL_INNER_X = 16
export const BLUEPRINT_CELL_INNER_Y = 12

const PILL_ITEM_HEIGHT = 44
const PILL_ITEM_HEIGHT_COMPACT = 34
const PILL_STACK_GAP = 10
const PILL_CELL_PADDING = BLUEPRINT_CELL_GUTTER * 2

/** Compare / service grid cell inner width — the box TEXT actually wraps
 * in: column minus the shell's padding AND the cell button's own chrome
 * (its `px-4` + borders). Counting only the shell (todo 026) overstated
 * the text box by ~34px, so the line-count estimate undershot and tall
 * cells overflowed their fixed row tracks. */
export function getBlueprintCellInnerWidth(compact = false): number {
  const shellPadX = compact ? 24 : 28
  const buttonChromeX = compact ? 26 : 34
  return STEP_COLUMN_WIDTH - shellPadX - buttonChromeX
}

/** East-Asian full-width codepoints render ~2× the width of a Latin glyph.
 * Counting them as 1 char makes the line-count estimate undershoot for CJK
 * content, so tall cells overflow their fixed row track and collide with the
 * divider line below. */
function isWideCodePoint(cp: number): boolean {
  return (
    (cp >= 0x1100 && cp <= 0x115f) || // Hangul Jamo
    (cp >= 0x2e80 && cp <= 0x303e) || // CJK radicals, Kangxi, CJK punctuation
    (cp >= 0x3041 && cp <= 0x33ff) || // Hiragana, Katakana, CJK symbols
    (cp >= 0x3400 && cp <= 0x4dbf) || // CJK Ext A
    (cp >= 0x4e00 && cp <= 0x9fff) || // CJK Unified
    (cp >= 0xa000 && cp <= 0xa4cf) || // Yi
    (cp >= 0xac00 && cp <= 0xd7a3) || // Hangul Syllables
    (cp >= 0xf900 && cp <= 0xfaff) || // CJK Compatibility Ideographs
    (cp >= 0xfe30 && cp <= 0xfe4f) || // CJK Compatibility Forms
    (cp >= 0xff00 && cp <= 0xff60) || // Fullwidth Forms
    (cp >= 0xffe0 && cp <= 0xffe6) ||
    (cp >= 0x20000 && cp <= 0x3fffd) // CJK Ext B+
  )
}

/** Display width of a line in half-width units (CJK glyphs count as 2). */
function lineDisplayWidth(line: string): number {
  let width = 0
  for (const ch of line) {
    width += isWideCodePoint(ch.codePointAt(0) ?? 0) ? 2 : 1
  }
  return width
}

/** Greedy word-wrap simulation: words move to the next line whole, so a
 * paragraph costs 15-20% more lines than `chars ÷ chars-per-line` claims —
 * the naive division was one of the three undershoots that let tall cells
 * cross their lane band (todo 026). Words longer than a line fill whole
 * lines, matching the browser's overflow-wrap behaviour. */
function countWrappedLines(line: string, charsPerLine: number): number {
  const words = line.split(/\s+/).filter(Boolean)
  if (words.length === 0) return 1
  let lines = 1
  let used = 0
  for (const word of words) {
    let width = lineDisplayWidth(word)
    const separator = used > 0 ? 1 : 0
    if (used + separator + width <= charsPerLine) {
      used += separator + width
      continue
    }
    lines += 1
    while (width > charsPerLine) {
      width -= charsPerLine
      lines += 1
    }
    used = width
  }
  return lines
}

/** Line count including soft-wrap at the blueprint column width. */
export function getEffectiveLineCount(content: string, compact = false): number {
  const innerWidth = getBlueprintCellInnerWidth(compact)
  // 8px average glyph (space included) for text-sm — deliberately a shade
  // conservative: the estimate is a FLOOR under overflow-visible rows, and
  // an undershoot bleeds into the lane below while an overshoot just airs
  // the row out (todo 026, measured against the real 257-char worst case).
  const charWidth = compact ? 6.5 : 8
  const charsPerLine = Math.max(6, Math.floor(innerWidth / charWidth))

  return content.split('\n').reduce((total, line) => {
    if (line.length === 0) return total + 1
    return total + countWrappedLines(line, charsPerLine)
  }, 0)
}

function getTextBlockMinHeight(lineCount: number, compact = false): number {
  const base = compact ? BLUEPRINT_ROW_MIN_HEIGHT : BLUEPRINT_ROW_MIN_HEIGHT - 16
  if (lineCount <= 1) return base

  // Non-compact cells render text-sm at leading-relaxed: 14px × 1.625 =
  // 22.75px per line, not the 20px this assumed (todo 026 — the second
  // half of the undershoot that let tall cells cross their lane band).
  const lineHeight = compact ? 14 : 22.75
  const innerPadding = compact ? 20 : 24
  const wrappedHeight =
    BLUEPRINT_CELL_GUTTER * 2 + innerPadding + lineCount * lineHeight

  return Math.max(base, wrappedHeight)
}

export function getMaxPillCountInLane(
  data: BlueprintData,
  laneId: string,
): number {
  // Summed per *slot*, not maxed per cell: since the split a slot holds one
  // cell per touchpoint, and a row sized to the tallest single cell would be
  // one pill tall over a stack of three.
  const perStep = new Map<string, number>()
  for (const cell of data.cells) {
    if (cell.lane_id === laneId && cell.content?.trim()) {
      const count = parseCellContentItems(cell.content).length
      perStep.set(cell.step_id, (perStep.get(cell.step_id) ?? 0) + count)
    }
  }
  let max = 0
  for (const total of perStep.values()) max = Math.max(max, total)
  return max
}

export function getPillStackMinHeight(
  pillCount: number,
  compact = false,
): number {
  if (pillCount <= 0) return 0
  const itemHeight = compact ? PILL_ITEM_HEIGHT_COMPACT : PILL_ITEM_HEIGHT
  return (
    PILL_CELL_PADDING +
    pillCount * itemHeight +
    Math.max(0, pillCount - 1) * PILL_STACK_GAP
  )
}

function getMaxLineCountInLane(
  data: BlueprintData,
  laneId: string,
  compact = false,
): number {
  let max = 1
  for (const cell of data.cells) {
    if (cell.lane_id === laneId && cell.content?.trim()) {
      max = Math.max(max, getEffectiveLineCount(cell.content, compact))
    }
  }
  return max
}

/** Minimum inner content height for a single cell (excludes compare shell padding). */
export function getCellContentMinHeight(
  lane: BlueprintLane,
  content: string | undefined,
  compact = false,
): number {
  if (shouldUseVisualContent(lane)) {
    return compact
      ? VISUAL_ROW_MIN_HEIGHT_COMPACT
      : VISUAL_ROW_MIN_HEIGHT
  }

  if (!content?.trim()) return 0

  if (shouldUsePillCellContent(lane)) {
    return getPillStackMinHeight(
      parseCellContentItems(content).length,
      compact,
    )
  }

  const lineCount = Math.max(1, getEffectiveLineCount(content, compact))
  return getTextBlockMinHeight(lineCount, compact)
}

function getDefaultCellMinHeight(
  lane: BlueprintLane,
  data: BlueprintData,
  compact = false,
): number {
  const base = compact ? BLUEPRINT_ROW_MIN_HEIGHT : BLUEPRINT_ROW_MIN_HEIGHT - 16
  const lineCount = getMaxLineCountInLane(data, lane.id, compact)
  return Math.max(base, getTextBlockMinHeight(lineCount, compact))
}

export function getLaneRowMinHeight(
  lane: BlueprintLane,
  data: BlueprintData,
  compact = false,
  options?: { fitVertically?: boolean },
): number {
  const fitVertically = options?.fitVertically ?? false
  const base = fitVertically && compact
    ? BLUEPRINT_ROW_MIN_HEIGHT_COMPACT
    : getDefaultCellMinHeight(lane, data, compact)

  if (shouldUseVisualContent(lane)) {
    return compact
      ? VISUAL_ROW_MIN_HEIGHT_COMPACT
      : VISUAL_ROW_MIN_HEIGHT
  }

  if (!shouldUsePillCellContent(lane)) return base

  const pillCount = getMaxPillCountInLane(data, lane.id)
  return Math.max(base, getPillStackMinHeight(pillCount, compact))
}

export function getBlueprintGridMinHeight(
  data: BlueprintData,
  options?: { compact?: boolean; includeHeader?: boolean },
): number {
  const { compact = false, includeHeader = true } = options ?? {}
  const header = compact ? BLUEPRINT_HEADER_HEIGHT_COMPACT : BLUEPRINT_HEADER_HEIGHT
  const dividers =
    countBlueprintDividerRows(data.lanes) * BLUEPRINT_DIVIDER_ROW_HEIGHT
  const wrapCorridorMargins =
    countBlueprintWrapCorridorMargins(data.lanes) *
    BLUEPRINT_WRAP_CORRIDOR_MARGIN
  const overheadRailCorridorMargins =
    countOverheadRailCorridorMargins(data.lanes, data) *
    BLUEPRINT_OVERHEAD_RAIL_CORRIDOR_MARGIN
  const inLaneLoopCorridorMargins =
    countInLaneLoopCorridorMargins(data.lanes, data) *
    BLUEPRINT_IN_LANE_LOOP_CORRIDOR_MARGIN
  const laneRows = data.lanes.reduce(
    (sum, lane) => sum + getLaneRowMinHeight(lane, data, compact),
    0,
  )
  const rowCount =
    data.lanes.length + countBlueprintDividerRows(data.lanes)
  const rowGaps = Math.max(0, rowCount - 1) * BLUEPRINT_LANE_ROW_GAP
  return (
    (includeHeader ? header : 0) +
    laneRows +
    dividers +
    wrapCorridorMargins +
    overheadRailCorridorMargins +
    inLaneLoopCorridorMargins +
    rowGaps
  )
}

/** Gap between side-by-side blueprint grids on canvas. */
export const BLUEPRINT_CANVAS_COMPARE_GAP = 24
/** @deprecated Use BLUEPRINT_CANVAS_COMPARE_GAP */
export const BLUEPRINT_CANVAS_STACK_GAP = BLUEPRINT_CANVAS_COMPARE_GAP
/** PathMultiSelect fieldset + legend on canvas artboards. */
export const BLUEPRINT_PATH_FILTER_HEIGHT = 72
/** Scenario slide header in stack view (title, summary, controls). */
export const BLUEPRINT_SCENARIO_HEADER_HEIGHT = 220
/** Compact scenario header on canvas artboards. */
export const BLUEPRINT_SCENARIO_HEADER_HEIGHT_COMPACT = 200

export type ArtboardSize = { width: number; height: number }

export function getBlueprintGridMinWidth(stepCount: number): number {
  return LANE_COLUMN_WIDTH + getStepColumnsWidth(stepCount)
}

/** Pixel width of a compact blueprint grid (excluding artboard wrapper padding). */
export function getBlueprintCompactGridWidth(stepCount: number): number {
  return (
    getBlueprintGridMinWidth(stepCount) +
    BLUEPRINT_GRID_VIEWPORT_PAD * 2 +
    BLUEPRINT_CANVAS_SCROLL_BORDER
  )
}

/** Pixel height of a compact blueprint grid (excluding artboard wrapper padding). */
export function getBlueprintCompactGridHeight(data: BlueprintData): number {
  const header = BLUEPRINT_HEADER_HEIGHT_COMPACT + BLUEPRINT_COMPACT_HEADER_GAP
  const gridBody = getBlueprintGridMinHeight(data, {
    compact: true,
    includeHeader: false,
  })
  const scrollArea =
    gridBody + BLUEPRINT_GRID_VIEWPORT_PAD * 2 + BLUEPRINT_CANVAS_SCROLL_BORDER

  return header + scrollArea
}

/** Canvas artboard size sized to fit the full compact blueprint grid. */
export function getBlueprintArtboardSize(data: BlueprintData): ArtboardSize {
  const width =
    getBlueprintCompactGridWidth(data.steps.length) +
    BLUEPRINT_CANVAS_INNER_PADDING * 2 +
    BLUEPRINT_ARTBOARD_WIDTH_BUFFER
  const height = Math.max(
    480,
    getBlueprintCompactGridHeight(data) +
      BLUEPRINT_CANVAS_INNER_PADDING * 2 +
      BLUEPRINT_ARTBOARD_HEIGHT_BUFFER,
  )
  return { width, height }
}

/** Canvas artboard size for multiple side-by-side compact grids (a path compare). */
export function getStackedCanvasArtboardSize(
  blueprints: BlueprintData[],
  options?: {
    includeScenarioHeader?: boolean
    compact?: boolean
  },
): ArtboardSize {
  if (blueprints.length === 0) {
    return { width: 960, height: 540 }
  }

  const includeScenarioHeader = options?.includeScenarioHeader ?? false
  const compact = options?.compact ?? false
  const headerHeight = includeScenarioHeader
    ? compact
      ? BLUEPRINT_SCENARIO_HEADER_HEIGHT_COMPACT
      : BLUEPRINT_SCENARIO_HEADER_HEIGHT
    : 0
  const gridWidths = blueprints.map(
    (data) =>
      getBlueprintCompactGridWidth(data.steps.length) +
      BLUEPRINT_CANVAS_INNER_PADDING,
  )
  const gridHeights = blueprints.map(
    (data) =>
      getBlueprintCompactGridHeight(data) + BLUEPRINT_CANVAS_INNER_PADDING,
  )

  const width = Math.max(
    ...blueprints.map(
      (data) =>
        getBlueprintCompactGridWidth(data.steps.length) +
        BLUEPRINT_CANVAS_INNER_PADDING +
        BLUEPRINT_ARTBOARD_WIDTH_BUFFER,
    ),
    compact && includeScenarioHeader ? 420 : 0,
  )

  const compareGapTotal =
    Math.max(0, blueprints.length - 1) * BLUEPRINT_CANVAS_COMPARE_GAP
  const stackedGridWidth =
    gridWidths.reduce((sum, gridWidth) => sum + gridWidth, 0) + compareGapTotal

  const totalWidth =
    Math.max(width, stackedGridWidth) +
    BLUEPRINT_CANVAS_INNER_PADDING +
    BLUEPRINT_ARTBOARD_WIDTH_BUFFER

  const filterHeight = headerHeight
  const height = Math.max(
    480,
    filterHeight +
      Math.max(...gridHeights) +
      BLUEPRINT_CANVAS_INNER_PADDING * 2 +
      BLUEPRINT_ARTBOARD_HEIGHT_BUFFER,
  )

  return { width: totalWidth, height }
}
