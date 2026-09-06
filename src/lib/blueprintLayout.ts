import { parseCellContentItems } from '@/lib/parseCellContent'
import {
  BACKSTAGE_ACTIONS_ROLE,
  BACKSTAGE_TOUCHPOINTS_ROLE,
  CUSTOMER_ACTIONS_ROLE,
  FRONTSTAGE_ACTIONS_ROLE,
  FRONTSTAGE_TOUCHPOINTS_ROLE,
  getLaneRole,
  STORYBOARD_ROLE,
  SUPPORT_ACTIONS_ROLE,
} from '@/lib/laneRoles'
import type { BlueprintData, BlueprintLane } from '@/types/blueprint'

/** Minimal lane shape for role-driven layout checks. */
type LaneRoleSource = { name: string; role?: string | null }

/** Roles whose cells list each touchpoint as its own inline cell (newline-separated content). */
export const TOUCHPOINT_CELL_LANE_ROLES = [
  FRONTSTAGE_TOUCHPOINTS_ROLE,
  BACKSTAGE_TOUCHPOINTS_ROLE,
] as const

/** Roles rendered as storyboard frame rows instead of text cells. */
export const STORYBOARD_LANE_ROLES = [STORYBOARD_ROLE] as const

/** 192px inner face at 4:3 plus the service/compare shell's vertical padding. */
export const STORYBOARD_ROW_MIN_HEIGHT = 176
export const STORYBOARD_ROW_MIN_HEIGHT_COMPACT = 168

/** Max height for the storyboard cell button inside a swimlane row (excludes shell padding). */
export function getStoryboardCellButtonMaxHeight(compact = false): number {
  const rowHeight = compact
    ? STORYBOARD_ROW_MIN_HEIGHT_COMPACT
    : STORYBOARD_ROW_MIN_HEIGHT
  const shellVerticalPad = compact ? 24 : 32
  return rowHeight - shellVerticalPad
}

export function shouldUseTouchpointCellContent(lane: LaneRoleSource): boolean {
  const role = getLaneRole(lane)
  return (
    role !== null &&
    (TOUCHPOINT_CELL_LANE_ROLES as readonly string[]).includes(role)
  )
}

/** Which face a lane's cells wear — touchpoint stack, storyboard, or plain cell. */
export type BlueprintCellVariant = 'default' | 'touchpoints' | 'storyboard'

/**
 * Whether a cell has anything to draw for its lane's variant. A storyboard
 * cell is decided by its frames upstream, a touchpoint cell by having at least
 * one parsable item, a plain cell by non-blank content.
 */
export function hasBlueprintCellContent(
  content: string | undefined,
  variant: BlueprintCellVariant,
): boolean {
  if (variant === 'storyboard') return true
  if (!content?.trim()) return false
  if (variant === 'touchpoints') {
    return parseCellContentItems(content).length > 0
  }
  return true
}

export function shouldUseStoryboardContent(lane: LaneRoleSource): boolean {
  const role = getLaneRole(lane)
  return (
    role !== null && (STORYBOARD_LANE_ROLES as readonly string[]).includes(role)
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
  if (role !== FRONTSTAGE_ACTIONS_ROLE && role !== FRONTSTAGE_TOUCHPOINTS_ROLE) {
    return false
  }

  // A frontstage-touchpoints lane can sit above frontstage actions — the
  // visibility line follows the actions lane, not the touchpoints lane.
  if (role === FRONTSTAGE_TOUCHPOINTS_ROLE && lanes) {
    const index = lanes.findIndex((entry) => entry.id === lane.id)
    const next = lanes[index + 1]
    if (next && getLaneRole(next) === FRONTSTAGE_ACTIONS_ROLE) {
      return false
    }
  }

  return true
}

/**
 * Support handoff lanes, which sit below backstage actions.
 *
 * This used to compare `lane.name` against two English strings, as a fallback
 * for lanes carrying no role. `lanes.name` is free-form in any language, so
 * renaming or translating one deleted a divider from the board with nothing
 * reporting it — and a template cannot key its layout off the label one
 * deployment happens to use.
 *
 * The role is the whole test now. A board whose rows predate `lane_role`
 * still resolves through `LEGACY_NAME_TO_ROLE`, which every lane in the
 * hand-written fallback blueprints already goes through, so a name can still
 * stand in for a missing role — in exactly one declared place, rather than in
 * a comparison local to this file that no other divider had.
 */
function isSupportHandoffLane(lane: LaneRoleSource): boolean {
  return getLaneRole(lane) === SUPPORT_ACTIONS_ROLE
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
 * Both lane corridors are decided by comparing the columns a dependency's two
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
 * Does this blueprint hold a dependency that stays inside `laneId` and whose
 * two step columns satisfy `matches`? Dependencies that leave the lane at
 * either end are not the lane's business — they are routed between rows, not
 * around one.
 */
function blueprintHasInLaneDependency(
  data: BlueprintData,
  laneId: string,
  matches: (sourceColumn: number, targetColumn: number) => boolean,
): boolean {
  const columnByCellId = getLaneCellColumns(data, laneId)
  if (columnByCellId.size === 0) return false

  return data.dependencies.some((dependency) => {
    const sourceColumn = columnByCellId.get(dependency.source_cell_id)
    const targetColumn = columnByCellId.get(dependency.target_cell_id)
    if (sourceColumn === undefined || targetColumn === undefined) return false
    return matches(sourceColumn, targetColumn)
  })
}

function anyBlueprintHasInLaneDependency(
  lane: BlueprintLane,
  data: BlueprintData | readonly BlueprintData[] | undefined,
  matches: (sourceColumn: number, targetColumn: number) => boolean,
): boolean {
  if (!data) return false
  const blueprints = Array.isArray(data) ? data : [data]
  return blueprints.some((blueprint) =>
    blueprintHasInLaneDependency(blueprint, lane.id, matches),
  )
}

/**
 * A lane needs the overhead rail when one of its own dependencies runs FORWARD
 * and clears at least one column on the way (target column >= source + 2).
 * Such a connector cannot travel along the row — the cells it skips are in the
 * way — so it climbs into a strip above the row, runs across, and drops back
 * in.
 *
 * The arrow engine asks the same question of the rendered grid when it picks a
 * detour lane; the two must agree or the rail would be drawn where no space
 * was reserved.
 */
export function laneHasOverheadArrowCorridor(
  lane: BlueprintLane,
  data?: BlueprintData | readonly BlueprintData[],
): boolean {
  return anyBlueprintHasInLaneDependency(
    lane,
    data,
    (sourceColumn, targetColumn) => targetColumn >= sourceColumn + 2,
  )
}

/**
 * A lane needs the in-lane loop corridor when one of its own dependencies runs
 * BACKWARD — its target sits in an earlier column than its source. That arrow
 * loops back over the row it started on, so the row reserves a thin strip
 * above itself for the horizontal leg.
 */
export function laneHasInLaneLoopCorridor(
  lane: BlueprintLane,
  data?: BlueprintData | readonly BlueprintData[],
): boolean {
  return anyBlueprintHasInLaneDependency(
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
/** Visible space between step columns where dependency arrows are drawn. */
export const STEP_COLUMN_GAP = 24
/** Left gutter on the white board so the play control clears storyboard cells. */
export const STORYBOARD_PLAY_GUTTER = 28

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

/**
 * Half the hit target for an insert affordance, on BOTH axes.
 *
 * The line drawn is 1px; the target is 16. That gap is the whole difference
 * between an affordance people use and one they fight, and it is what Figma's
 * row/column inserts do — the visible mark is a hairline, the thing you have
 * to hit is a finger's width.
 *
 * Declared here because it was declared separately in BlueprintColumnHandles
 * and BlueprintLaneHandles, same name and same value in two files — so a
 * column insert 8px wide beside a lane insert 10px tall was a bug nothing
 * would have caught.
 */
export const BLUEPRINT_INSERT_HIT_HALF = 8

/** Outer gutter around each cell (Tailwind p-3 ≈ 12px per side). */
export const BLUEPRINT_CELL_GUTTER = 12
/** Default cell inner content padding (px-4 py-3). */
export const BLUEPRINT_CELL_INNER_X = 16
export const BLUEPRINT_CELL_INNER_Y = 12

/** Stable canvas face for narrative cells; complete prose lives in detail. */
export const NARRATIVE_CELL_HEIGHT = 128
export const NARRATIVE_CELL_HEIGHT_COMPACT = 96
/** Stable technology face; two label lines fit without changing row geometry. */
export const TOUCHPOINT_ITEM_HEIGHT = 52
export const TOUCHPOINT_ITEM_HEIGHT_COMPACT = 42
const TOUCHPOINT_STACK_GAP = 10
const TOUCHPOINT_CELL_PADDING = BLUEPRINT_CELL_GUTTER * 2

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

export function getMaxTouchpointCountInLane(
  data: BlueprintData,
  laneId: string,
): number {
  // Summed per *slot*, not maxed per cell: since the split a slot holds one
  // cell per touchpoint, and a row sized to the tallest single cell would be
  // one touchpoint tall over a stack of three.
  //
  // Placements where the cell has them, the text where it does not — the same
  // reading `getTouchpointNames` does, because this count has to agree with
  // the list that gets drawn. A name-only placement (#112) is a face the text
  // never names, and a stack sized from the text alone would clip it.
  const perStep = new Map<string, number>()
  for (const cell of data.cells) {
    if (cell.lane_id !== laneId) continue
    const count = cell.touchpoints?.length
      ? cell.touchpoints.length
      : cell.content?.trim()
        ? parseCellContentItems(cell.content).length
        : 0
    if (count > 0) perStep.set(cell.step_id, (perStep.get(cell.step_id) ?? 0) + count)
  }
  let max = 0
  for (const total of perStep.values()) max = Math.max(max, total)
  return max
}

export function getTouchpointStackMinHeight(
  touchpointCount: number,
  compact = false,
): number {
  if (touchpointCount <= 0) return 0
  const itemHeight = compact ? TOUCHPOINT_ITEM_HEIGHT_COMPACT : TOUCHPOINT_ITEM_HEIGHT
  return (
    TOUCHPOINT_CELL_PADDING +
    touchpointCount * itemHeight +
    Math.max(0, touchpointCount - 1) * TOUCHPOINT_STACK_GAP
  )
}

/** Minimum inner content height for a single cell (excludes compare shell padding). */
export function getCellContentMinHeight(
  lane: BlueprintLane,
  content: string | undefined,
  compact = false,
): number {
  if (shouldUseStoryboardContent(lane)) {
    return compact
      ? STORYBOARD_ROW_MIN_HEIGHT_COMPACT
      : STORYBOARD_ROW_MIN_HEIGHT
  }

  if (!content?.trim()) return 0

  if (shouldUseTouchpointCellContent(lane)) {
    return getTouchpointStackMinHeight(
      parseCellContentItems(content).length,
      compact,
    )
  }

  return compact ? NARRATIVE_CELL_HEIGHT_COMPACT : NARRATIVE_CELL_HEIGHT
}

function getDefaultCellMinHeight(
  _lane: BlueprintLane,
  _data: BlueprintData,
  compact = false,
): number {
  const faceHeight = compact
    ? NARRATIVE_CELL_HEIGHT_COMPACT
    : NARRATIVE_CELL_HEIGHT
  const shellPadding = compact ? 24 : 32
  return faceHeight + shellPadding
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

  if (shouldUseStoryboardContent(lane)) {
    return compact
      ? STORYBOARD_ROW_MIN_HEIGHT_COMPACT
      : STORYBOARD_ROW_MIN_HEIGHT
  }

  if (!shouldUseTouchpointCellContent(lane)) return base

  const touchpointCount = getMaxTouchpointCountInLane(data, lane.id)
  return Math.max(base, getTouchpointStackMinHeight(touchpointCount, compact))
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
