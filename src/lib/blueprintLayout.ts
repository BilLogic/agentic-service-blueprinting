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
const PILL_CELL_LAYER_ROLES = [
  FRONTSTAGE_TECH_ROLE,
  BACKSTAGE_TECH_ROLE,
  SUPPORT_SYSTEMS_ROLE,
] as const

/** Roles rendered as picture rows instead of text cells. */
const VISUAL_LAYER_ROLES = [VISUAL_ROLE, STEP_VISUAL_ROLE] as const

const VISUAL_ROW_MIN_HEIGHT = 132
const VISUAL_ROW_MIN_HEIGHT_COMPACT = 108

/** Max height for the visual cell button inside a swimlane row (excludes shell padding). */
export function getVisualCellButtonMaxHeight(compact = false): number {
  const rowHeight = compact ? VISUAL_ROW_MIN_HEIGHT_COMPACT : VISUAL_ROW_MIN_HEIGHT
  const shellVerticalPad = compact ? 24 : 32
  return rowHeight - shellVerticalPad
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

export function shouldUsePillCellContent(layer: LayerRoleSource): boolean {
  const role = getLayerRole(layer)
  return (
    role !== null && (PILL_CELL_LAYER_ROLES as readonly string[]).includes(role)
  )
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
 * The internal interaction line marks the hand-off from backstage actions to
 * support systems, so it draws after a backstage-actions layer only when a
 * support-systems lane follows.
 */
export function shouldShowInternalInteractionLineAfter(
  layer: BlueprintLayer,
  layers?: BlueprintLayer[],
): boolean {
  if (getLayerRole(layer) !== BACKSTAGE_ACTIONS_ROLE) return false
  if (!layers) return false
  const index = layers.findIndex((entry) => entry.id === layer.id)
  const next = layers[index + 1]
  return next !== undefined && getLayerRole(next) === SUPPORT_SYSTEMS_ROLE
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

// Canonical service-blueprint divider names (Shostack lineage) — the rail is
// sized (COMPARE_LABEL_WIDTH 208) so these never clip.
export const INTERACTION_LINE_LABEL = 'LINE OF INTERACTION'
export const VISIBILITY_LINE_LABEL = 'LINE OF VISIBILITY'
export const INTERNAL_INTERACTION_LINE_LABEL = 'LINE OF INTERNAL INTERACTION'

export const BLUEPRINT_DIVIDER_ROW_HEIGHT = 28
/** Right inset so interaction / visibility lines stop before the board edge. */
export const BLUEPRINT_DIVIDER_LINE_END_INSET = 16
/** Transparent margin above the interaction line for cross-lane loop arrows. */
export const BLUEPRINT_WRAP_CORRIDOR_MARGIN = 36
/** Space at the top of a lane for in-lane loop-back arrows. */
export const BLUEPRINT_IN_LANE_LOOP_CORRIDOR_MARGIN = 32

/**
 * Structural blueprint shape for in-lane loop detection — satisfied by both
 * `BlueprintData` (single path) and `IntegratedBlueprintData` (merged paths).
 */
export type InLaneLoopLayoutSource = {
  layers: BlueprintLayer[]
  steps: ReadonlyArray<{ id: string; column_position: number }>
  cells: ReadonlyArray<{ id: string; layer_id: string; step_id: string }>
  triggers: ReadonlyArray<{ source_cell_id: string; target_cell_id: string }>
}

/** Map a canonical swimlane row onto a path's layer ids (paths use different layer uuids). */
export function resolveBlueprintLayer(
  canonicalLayer: BlueprintLayer,
  blueprint: Pick<InLaneLoopLayoutSource, 'layers'>,
): BlueprintLayer {
  return (
    blueprint.layers.find((layer) => layer.id === canonicalLayer.id) ??
    blueprint.layers.find((layer) => layer.name === canonicalLayer.name) ??
    blueprint.layers.find(
      (layer) =>
        layer.row_position === canonicalLayer.row_position &&
        layer.name === canonicalLayer.name,
    ) ??
    blueprint.layers.find(
      (layer) => layer.row_position === canonicalLayer.row_position,
    ) ??
    canonicalLayer
  )
}

/**
 * Generic in-lane loop-corridor rule: a layer needs loop headroom at the top
 * of its lane when it contains a trigger whose source and target cells are
 * BOTH in that layer with the source at a later column than the target — a
 * backward in-lane loop. Derived purely from blueprint data (cell layer
 * membership + step column positions), with no scenario or layer identity.
 */
export function blueprintLayerHasBackwardInLaneLoop(
  canonicalLayer: BlueprintLayer,
  source: InLaneLoopLayoutSource,
): boolean {
  const layer = resolveBlueprintLayer(canonicalLayer, source)
  const cellById = new Map(source.cells.map((cell) => [cell.id, cell]))
  const columnByStepId = new Map(
    source.steps.map((step) => [step.id, step.column_position]),
  )

  return source.triggers.some((trigger) => {
    const sourceCell = cellById.get(trigger.source_cell_id)
    const targetCell = cellById.get(trigger.target_cell_id)
    if (!sourceCell || !targetCell) return false
    if (
      sourceCell.layer_id !== layer.id ||
      targetCell.layer_id !== layer.id
    ) {
      return false
    }

    const sourceColumn = columnByStepId.get(sourceCell.step_id)
    const targetColumn = columnByStepId.get(targetCell.step_id)
    return (
      sourceColumn !== undefined &&
      targetColumn !== undefined &&
      targetColumn < sourceColumn
    )
  })
}

/** Canonical row needs an in-lane loop corridor when any compared variant has one. */
export function layerHasInLaneLoopCorridor(
  canonicalLayer: BlueprintLayer,
  sources: readonly InLaneLoopLayoutSource[],
): boolean {
  return sources.some((source) =>
    blueprintLayerHasBackwardInLaneLoop(canonicalLayer, source),
  )
}

/** Lanes with a cross-lane loop corridor below (above the interaction line). */
export function layerHasWrapCorridorBelow(layer: BlueprintLayer): boolean {
  return shouldShowInteractionLineAfter(layer)
}

function countInLaneLoopCorridorMargins(
  layers: BlueprintLayer[],
  data?: BlueprintData,
): number {
  if (!data) return 0
  return layers.filter((layer) =>
    blueprintLayerHasBackwardInLaneLoop(layer, data),
  ).length
}

function countBlueprintDividerRows(layers: BlueprintLayer[]): number {
  return layers.filter(
    (layer) =>
      shouldShowInteractionLineAfter(layer) ||
      shouldShowVisibilityLineAfter(layer, layers) ||
      shouldShowInternalInteractionLineAfter(layer, layers),
  ).length
}

function countBlueprintWrapCorridorMargins(
  layers: BlueprintLayer[],
): number {
  return layers.filter((layer) => layerHasWrapCorridorBelow(layer)).length
}

export const LAYER_COLUMN_WIDTH = 220
export const STEP_COLUMN_WIDTH = 220
/** Visible space between step columns where trigger arrows are drawn. */
export const STEP_COLUMN_GAP = 24

export function getStepColumnsWidth(stepCount: number): number {
  if (stepCount <= 0) return 0
  const gaps = Math.max(0, stepCount - 1)
  return stepCount * STEP_COLUMN_WIDTH + gaps * STEP_COLUMN_GAP
}

export const BLUEPRINT_ROW_MIN_HEIGHT = 96
/** Used only when fitVertically compresses rows into a fixed artboard. */
export const BLUEPRINT_ROW_MIN_HEIGHT_COMPACT = 60
const BLUEPRINT_HEADER_HEIGHT = 48
export const BLUEPRINT_HEADER_HEIGHT_COMPACT = 32
/** Gap between swim lanes and dividers (0 — lane borders handle separation). */
export const BLUEPRINT_LAYER_ROW_GAP = 0
/** Safety margin for wrapped cell text on canvas artboards. */
export const BLUEPRINT_ARTBOARD_HEIGHT_BUFFER = 32

/** Outer gutter around each cell (Tailwind p-3 ≈ 12px per side). */
const BLUEPRINT_CELL_GUTTER = 12

const PILL_ITEM_HEIGHT = 44
const PILL_ITEM_HEIGHT_COMPACT = 34
const PILL_STACK_GAP = 10
const PILL_CELL_PADDING = BLUEPRINT_CELL_GUTTER * 2

/** Compare / service grid cell inner width (column minus horizontal shell padding). */
function getBlueprintCellInnerWidth(compact = false): number {
  const shellPadX = compact ? 24 : 28
  return STEP_COLUMN_WIDTH - shellPadX
}

/** East-Asian full-width codepoints render ~2× the width of a Latin glyph.
 * Counting them as 1 char made the line-count estimate undershoot badly for
 * CJK content, so tall cells overflowed their fixed row track and painted the
 * divider line on top of the cell block (#18). */
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

/** Line count including soft-wrap at the blueprint column width. */
function getEffectiveLineCount(content: string, compact = false): number {
  const innerWidth = getBlueprintCellInnerWidth(compact)
  const charWidth = compact ? 6.5 : 7
  const charsPerLine = Math.max(6, Math.floor(innerWidth / charWidth))

  return content.split('\n').reduce((total, line) => {
    if (line.length === 0) return total + 1
    return total + Math.ceil(lineDisplayWidth(line) / charsPerLine)
  }, 0)
}

function getTextBlockMinHeight(lineCount: number, compact = false): number {
  const base = compact ? BLUEPRINT_ROW_MIN_HEIGHT : BLUEPRINT_ROW_MIN_HEIGHT - 16
  if (lineCount <= 1) return base

  const lineHeight = compact ? 14 : 20
  const innerPadding = compact ? 20 : 24
  const wrappedHeight =
    BLUEPRINT_CELL_GUTTER * 2 + innerPadding + lineCount * lineHeight

  return Math.max(base, wrappedHeight)
}

function getMaxPillCountInLayer(
  data: BlueprintData,
  layerId: string,
): number {
  let max = 0
  for (const cell of data.cells) {
    if (cell.layer_id === layerId && cell.content?.trim()) {
      max = Math.max(max, parseCellContentItems(cell.content).length)
    }
  }
  return max
}

function getPillStackMinHeight(
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

function getMaxLineCountInLayer(
  data: BlueprintData,
  layerId: string,
  compact = false,
): number {
  let max = 1
  for (const cell of data.cells) {
    if (cell.layer_id === layerId && cell.content?.trim()) {
      max = Math.max(max, getEffectiveLineCount(cell.content, compact))
    }
  }
  return max
}

function getDefaultCellMinHeight(
  layer: BlueprintLayer,
  data: BlueprintData,
  compact = false,
): number {
  const base = compact ? BLUEPRINT_ROW_MIN_HEIGHT : BLUEPRINT_ROW_MIN_HEIGHT - 16
  const lineCount = getMaxLineCountInLayer(data, layer.id, compact)
  return Math.max(base, getTextBlockMinHeight(lineCount, compact))
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
    inLaneLoopCorridorMargins +
    rowGaps
  )
}

export function getBlueprintGridMinWidth(stepCount: number): number {
  return LAYER_COLUMN_WIDTH + getStepColumnsWidth(stepCount)
}
