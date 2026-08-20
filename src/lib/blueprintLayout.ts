import { parseCellContentItems } from '@/lib/parseCellContent'
import {
  BACKSTAGE_ACTIONS_ROLE,
  BACKSTAGE_TECH_ROLE,
  CUSTOMER_ACTIONS_ROLE,
  FRONTSTAGE_ACTIONS_ROLE,
  FRONTSTAGE_TECH_ROLE,
  getLayerRole,
  STEP_VISUAL_ROLE,
  SUPPORT_SYSTEMS_ROLE,
  VISUAL_ROLE,
} from '@/lib/layerRoles'
import type { BlueprintData, BlueprintLayer } from '@/types/blueprint'

/** Minimal layer shape for role-driven layout checks. */
type LayerRoleSource = { name: string; role?: string | null }

/** Roles whose cells list multiple items as inline pills (newline-separated content). */
export const PILL_CELL_LAYER_ROLES = [
  FRONTSTAGE_TECH_ROLE,
  BACKSTAGE_TECH_ROLE,
  SUPPORT_SYSTEMS_ROLE,
] as const

/** Roles rendered as picture rows instead of text cells. */
export const VISUAL_LAYER_ROLES = [VISUAL_ROLE, STEP_VISUAL_ROLE] as const

/** 192px inner face at 4:3 plus the service/compare shell's vertical padding. */
export const VISUAL_ROW_MIN_HEIGHT = 176
export const VISUAL_ROW_MIN_HEIGHT_COMPACT = 168

/** Max height for the visual cell button inside a swimlane row (excludes shell padding). */
export function getVisualCellButtonMaxHeight(compact = false): number {
  const rowHeight = compact ? VISUAL_ROW_MIN_HEIGHT_COMPACT : VISUAL_ROW_MIN_HEIGHT
  const shellVerticalPad = compact ? 24 : 32
  return rowHeight - shellVerticalPad
}

export function shouldUsePillCellContent(layer: LayerRoleSource): boolean {
  const role = getLayerRole(layer)
  return (
    role !== null && (PILL_CELL_LAYER_ROLES as readonly string[]).includes(role)
  )
}

/** Which face a lane's cells wear — pill stack, step visual, or plain cell. */
export type BlueprintCellVariant = 'default' | 'pills' | 'visual'

/**
 * Whether a cell has anything to draw for its lane's variant. A visual cell
 * is decided by its pictures upstream, a pill cell by having at least one
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

export function shouldUseVisualContent(layer: LayerRoleSource): boolean {
  const role = getLayerRole(layer)
  return (
    role !== null && (VISUAL_LAYER_ROLES as readonly string[]).includes(role)
  )
}

/** The standard service-blueprint interaction line follows the spine actor. */
export function shouldShowInteractionLineAfter(layer: BlueprintLayer): boolean {
  return getLayerRole(layer) === CUSTOMER_ACTIONS_ROLE
}

/** The visibility line is drawn after frontstage layers (above backstage layers). */
export function shouldShowVisibilityLineAfter(
  layer: BlueprintLayer,
  layers?: BlueprintLayer[],
): boolean {
  const role = getLayerRole(layer)
  if (role !== FRONTSTAGE_ACTIONS_ROLE && role !== FRONTSTAGE_TECH_ROLE) {
    return false
  }

  // Frontstage tech can sit above frontstage actions — the visibility line
  // follows the actions lane, not the tech lane.
  if (role === FRONTSTAGE_TECH_ROLE && layers) {
    const index = layers.findIndex((entry) => entry.id === layer.id)
    const next = layers[index + 1]
    if (next && getLayerRole(next) === FRONTSTAGE_ACTIONS_ROLE) {
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
function isSupportHandoffLayer(layer: LayerRoleSource): boolean {
  if (getLayerRole(layer) === SUPPORT_SYSTEMS_ROLE) return true
  return (
    layer.name === 'Support Actions' || layer.name === 'Tech Support Actions'
  )
}

/**
 * The internal interaction line marks the hand-off from backstage actions to
 * support systems / support actions, so it draws after a backstage-actions
 * layer only when a support handoff lane follows.
 */
export function shouldShowInternalInteractionLineAfter(
  layer: BlueprintLayer,
  layers?: BlueprintLayer[],
): boolean {
  if (getLayerRole(layer) !== BACKSTAGE_ACTIONS_ROLE) return false
  if (!layers) return false
  const index = layers.findIndex((entry) => entry.id === layer.id)
  const next = layers[index + 1]
  return next !== undefined && isSupportHandoffLayer(next)
}

/** Light rule between swim lanes; omitted before interaction/visibility dividers. */
export function shouldShowLaneDividerAfter(
  layer: BlueprintLayer,
  layerIndex: number,
  layers: BlueprintLayer[],
): boolean {
  if (layerIndex >= layers.length - 1) return false
  if (shouldShowInteractionLineAfter(layer)) return false
  if (shouldShowVisibilityLineAfter(layer, layers)) return false
  if (shouldShowInternalInteractionLineAfter(layer, layers)) return false
  return true
}

/** Layer row is immediately followed by a blueprint divider band. */
export function layerPrecedesBlueprintDivider(
  layer: BlueprintLayer,
  layers?: BlueprintLayer[],
): boolean {
  return (
    shouldShowInteractionLineAfter(layer) ||
    shouldShowVisibilityLineAfter(layer, layers) ||
    shouldShowInternalInteractionLineAfter(layer, layers)
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
 * to the lane, then resolve `step_id` through `steps.column_position`. Reading
 * the data this way (rather than parsing anything out of an id) is what keeps
 * the rule true for any blueprint.
 */
function getLaneCellColumns(
  data: BlueprintData,
  layerId: string,
): Map<string, number> {
  const columnByStepId = new Map<string, number>()
  for (const step of data.steps) {
    columnByStepId.set(step.id, step.column_position)
  }

  const columnByCellId = new Map<string, number>()
  for (const cell of data.cells) {
    if (cell.layer_id !== layerId) continue
    const column = columnByStepId.get(cell.step_id)
    if (column === undefined) continue
    columnByCellId.set(cell.id, column)
  }
  return columnByCellId
}

/**
 * Does this blueprint hold a trigger that stays inside `layerId` and whose two
 * step columns satisfy `matches`? Triggers that leave the lane at either end
 * are not the lane's business — they are routed between rows, not around one.
 */
function blueprintHasInLaneTrigger(
  data: BlueprintData,
  layerId: string,
  matches: (sourceColumn: number, targetColumn: number) => boolean,
): boolean {
  const columnByCellId = getLaneCellColumns(data, layerId)
  if (columnByCellId.size === 0) return false

  return data.triggers.some((trigger) => {
    const sourceColumn = columnByCellId.get(trigger.source_cell_id)
    const targetColumn = columnByCellId.get(trigger.target_cell_id)
    if (sourceColumn === undefined || targetColumn === undefined) return false
    return matches(sourceColumn, targetColumn)
  })
}

function anyBlueprintHasInLaneTrigger(
  layer: BlueprintLayer,
  data: BlueprintData | readonly BlueprintData[] | undefined,
  matches: (sourceColumn: number, targetColumn: number) => boolean,
): boolean {
  if (!data) return false
  const blueprints = Array.isArray(data) ? data : [data]
  return blueprints.some((blueprint) =>
    blueprintHasInLaneTrigger(blueprint, layer.id, matches),
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
export function layerHasOverheadArrowCorridor(
  layer: BlueprintLayer,
  data?: BlueprintData | readonly BlueprintData[],
): boolean {
  return anyBlueprintHasInLaneTrigger(
    layer,
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
export function layerHasInLaneLoopCorridor(
  layer: BlueprintLayer,
  data?: BlueprintData | readonly BlueprintData[],
): boolean {
  return anyBlueprintHasInLaneTrigger(
    layer,
    data,
    (sourceColumn, targetColumn) => targetColumn < sourceColumn,
  )
}

export function countInLaneLoopCorridorMargins(
  layers: BlueprintLayer[],
  data?: BlueprintData,
): number {
  if (!data) return 0
  return layers.filter((layer) => layerHasInLaneLoopCorridor(layer, data)).length
}

export function countOverheadRailCorridorMargins(
  layers: BlueprintLayer[],
  data: BlueprintData,
): number {
  return layers.filter((layer) => layerHasOverheadArrowCorridor(layer, data))
    .length
}

/**
 * Does a corridor open UNDER this lane row? Only the spine actor's row has
 * one: the standard blueprint already leaves a band between it and the line of
 * interaction, and backward loops on that row are routed through it rather
 * than over the cells.
 */
export function layerHasWrapCorridorBelow(layer: BlueprintLayer): boolean {
  return shouldShowInteractionLineAfter(layer)
}

export function countBlueprintDividerRows(layers: BlueprintLayer[]): number {
  return layers.filter(
    (layer) =>
      shouldShowInteractionLineAfter(layer) ||
      shouldShowVisibilityLineAfter(layer, layers) ||
      shouldShowInternalInteractionLineAfter(layer, layers),
  ).length
}

export function countBlueprintWrapCorridorMargins(
  layers: BlueprintLayer[],
): number {
  return layers.filter(layerHasWrapCorridorBelow).length
}

export const LAYER_COLUMN_WIDTH = 220
export const STEP_COLUMN_WIDTH = 220
/** Visible space between step columns where trigger arrows are drawn. */
export const STEP_COLUMN_GAP = 24
/** Left gutter on the white board so the play control clears Visual cells. */
export const VISUAL_PLAY_GUTTER = 28

export function getStepColumnLeft(stepIndex: number): number {
  return LAYER_COLUMN_WIDTH + stepIndex * (STEP_COLUMN_WIDTH + STEP_COLUMN_GAP)
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
export const BLUEPRINT_LAYER_ROW_GAP = 0
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

/** Stable canvas face for narrative cells; complete prose lives in detail. */
export const NARRATIVE_CELL_HEIGHT = 128
export const NARRATIVE_CELL_HEIGHT_COMPACT = 96
/** Stable technology face; two label lines fit without changing row geometry. */
export const PILL_ITEM_HEIGHT = 52
export const PILL_ITEM_HEIGHT_COMPACT = 42
const PILL_STACK_GAP = 10
const PILL_CELL_PADDING = BLUEPRINT_CELL_GUTTER * 2

export function getMaxPillCountInLayer(
  data: BlueprintData,
  layerId: string,
): number {
  // Summed per *slot*, not maxed per cell: since the split a slot holds one
  // cell per touchpoint, and a row sized to the tallest single cell would be
  // one pill tall over a stack of three.
  const perStep = new Map<string, number>()
  for (const cell of data.cells) {
    if (cell.layer_id === layerId && cell.content?.trim()) {
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

/** Minimum inner content height for a single cell (excludes compare shell padding). */
export function getCellContentMinHeight(
  layer: BlueprintLayer,
  content: string | undefined,
  compact = false,
): number {
  if (shouldUseVisualContent(layer)) {
    return compact
      ? VISUAL_ROW_MIN_HEIGHT_COMPACT
      : VISUAL_ROW_MIN_HEIGHT
  }

  if (!content?.trim()) return 0

  if (shouldUsePillCellContent(layer)) {
    return getPillStackMinHeight(
      parseCellContentItems(content).length,
      compact,
    )
  }

  return compact ? NARRATIVE_CELL_HEIGHT_COMPACT : NARRATIVE_CELL_HEIGHT
}

function getDefaultCellMinHeight(
  _layer: BlueprintLayer,
  _data: BlueprintData,
  compact = false,
): number {
  const faceHeight = compact
    ? NARRATIVE_CELL_HEIGHT_COMPACT
    : NARRATIVE_CELL_HEIGHT
  const shellPadding = compact ? 24 : 32
  return faceHeight + shellPadding
}

export function getLayerRowMinHeight(
  layer: BlueprintLayer,
  data: BlueprintData,
  compact = false,
  options?: { fitVertically?: boolean },
): number {
  const fitVertically = options?.fitVertically ?? false
  const base = fitVertically && compact
    ? BLUEPRINT_ROW_MIN_HEIGHT_COMPACT
    : getDefaultCellMinHeight(layer, data, compact)

  if (shouldUseVisualContent(layer)) {
    return compact
      ? VISUAL_ROW_MIN_HEIGHT_COMPACT
      : VISUAL_ROW_MIN_HEIGHT
  }

  if (!shouldUsePillCellContent(layer)) return base

  const pillCount = getMaxPillCountInLayer(data, layer.id)
  return Math.max(base, getPillStackMinHeight(pillCount, compact))
}

export function getBlueprintGridMinHeight(
  data: BlueprintData,
  options?: { compact?: boolean; includeHeader?: boolean },
): number {
  const { compact = false, includeHeader = true } = options ?? {}
  const header = compact ? BLUEPRINT_HEADER_HEIGHT_COMPACT : BLUEPRINT_HEADER_HEIGHT
  const dividers =
    countBlueprintDividerRows(data.layers) * BLUEPRINT_DIVIDER_ROW_HEIGHT
  const wrapCorridorMargins =
    countBlueprintWrapCorridorMargins(data.layers) *
    BLUEPRINT_WRAP_CORRIDOR_MARGIN
  const overheadRailCorridorMargins =
    countOverheadRailCorridorMargins(data.layers, data) *
    BLUEPRINT_OVERHEAD_RAIL_CORRIDOR_MARGIN
  const inLaneLoopCorridorMargins =
    countInLaneLoopCorridorMargins(data.layers, data) *
    BLUEPRINT_IN_LANE_LOOP_CORRIDOR_MARGIN
  const layerRows = data.layers.reduce(
    (sum, layer) => sum + getLayerRowMinHeight(layer, data, compact),
    0,
  )
  const rowCount =
    data.layers.length + countBlueprintDividerRows(data.layers)
  const rowGaps = Math.max(0, rowCount - 1) * BLUEPRINT_LAYER_ROW_GAP
  return (
    (includeHeader ? header : 0) +
    layerRows +
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
/** Scenario slide header in stack view (title, description, controls). */
export const BLUEPRINT_SCENARIO_HEADER_HEIGHT = 220
/** Compact scenario header on canvas artboards. */
export const BLUEPRINT_SCENARIO_HEADER_HEIGHT_COMPACT = 200

export type ArtboardSize = { width: number; height: number }

export function getBlueprintGridMinWidth(stepCount: number): number {
  return LAYER_COLUMN_WIDTH + getStepColumnsWidth(stepCount)
}

/** Pixel width of a compact ServiceBlueprintGrid (excluding artboard wrapper padding). */
export function getBlueprintCompactGridWidth(stepCount: number): number {
  return (
    getBlueprintGridMinWidth(stepCount) +
    BLUEPRINT_GRID_VIEWPORT_PAD * 2 +
    BLUEPRINT_CANVAS_SCROLL_BORDER
  )
}

/** Pixel height of a compact ServiceBlueprintGrid (excluding artboard wrapper padding). */
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
