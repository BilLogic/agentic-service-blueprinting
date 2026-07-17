import { ARROW_VIEWPORT_PAD } from '@/lib/blueprintArrowGeometry'
import {
  BLUEPRINT_CANVAS_INNER_PADDING,
  BLUEPRINT_ARTBOARD_HEIGHT_BUFFER,
  BLUEPRINT_ARTBOARD_WIDTH_BUFFER,
  BLUEPRINT_DIVIDER_ROW_HEIGHT,
  BLUEPRINT_HEADER_HEIGHT_COMPACT,
  BLUEPRINT_LAYER_ROW_GAP,
  BLUEPRINT_ROW_MIN_HEIGHT,
  BLUEPRINT_ROW_MIN_HEIGHT_COMPACT,
  BLUEPRINT_WRAP_CORRIDOR_MARGIN,
  BLUEPRINT_DISCOVERY_RAIL_CORRIDOR_MARGIN,
  BLUEPRINT_REGULAR_TUTOR_LOOP_CORRIDOR_MARGIN,
  INTERACTION_LINE_LABEL,
  INTERNAL_INTERACTION_LINE_LABEL,
  VISIBILITY_LINE_LABEL,
  getLayerRowMinHeight,
  getStepColumnsWidth,
  layerHasOverheadArrowCorridor,
  layerHasWrapCorridorBelow,
  shouldShowInteractionLineAfter,
  shouldShowInternalInteractionLineAfter,
  shouldShowLaneDividerAfter,
  shouldShowVisibilityLineAfter,
  type ArtboardSize,
} from '@/lib/blueprintLayout'
import {
  COMPARE_LAYER_COLLAPSED_HEIGHT,
  isBlueprintLayerCollapsed,
} from '@/lib/blueprintLayerCollapse'
import {
  isParallelSessionLeadBottomWrapTrigger,
  isParallelSessionPartnerWrapTrigger,
} from '@/data/parallelSessionPartnerLead'
import { deriveSourceBlueprintsFromIntegrated, mergeIntegratedBlueprint } from '@/lib/mergeIntegratedBlueprint'
import { PATH_TYPE_SECTION_BORDER_WIDTH } from '@/lib/pathTypeTheme'
import type { PathListItem } from '@/lib/pathSelection'
import { itemsInSelectionOrder } from '@/lib/pathSelection'
import type { BlueprintData, BlueprintLayer } from '@/types/blueprint'
import type {
  IntegratedBlueprintCell,
  IntegratedBlueprintData,
  IntegratedBlueprintStep,
  IntegratedBlueprintTrigger,
} from '@/types/integratedBlueprint'
import type { SlideViewType } from '@/types/slides'

export type IntegratedLayoutOptions = {
  fitVertically?: boolean
  /** When set, row heights match side-by-side compare for the same paths. */
  sourceBlueprints?: BlueprintData[]
  selectedPathIds?: string[]
}

function resolveIntegratedSourceBlueprints(
  data: IntegratedBlueprintData,
  options?: IntegratedLayoutOptions,
): BlueprintData[] {
  let blueprints =
    options?.sourceBlueprints && options.sourceBlueprints.length > 0
      ? options.sourceBlueprints
      : deriveSourceBlueprintsFromIntegrated(data)

  if (options?.selectedPathIds && options.selectedPathIds.length > 0) {
    const selected = new Set(options.selectedPathIds)
    blueprints = blueprints.filter((blueprint) =>
      selected.has(blueprint.path.id),
    )
  }

  return blueprints
}

export type ComparePathArrowData = {
  triggers: IntegratedBlueprintTrigger[]
  cells: IntegratedBlueprintCell[]
  steps: IntegratedBlueprintStep[]
}

export function getComparePathArrowData(
  blueprint: BlueprintData,
): ComparePathArrowData {
  const { path, cells, triggers, steps } = blueprint

  return {
    steps: steps.map((step) => ({
      ...step,
      pathStepIds: { [path.id]: step.id },
    })),
    cells: cells.map((cell) => ({
      id: cell.id,
      layer_id: cell.layer_id,
      step_id: cell.step_id,
      path_id: path.id,
      path_type: path.path_type,
      content: cell.content,
      picture: cell.picture,
      description: cell.description,
      links: cell.links,
      opacity: 1,
    })),
    triggers: triggers.map((trigger) => ({
      id: trigger.id,
      source_cell_id: trigger.source_cell_id,
      target_cell_id: trigger.target_cell_id,
      path_id: path.id,
      path_type: path.path_type,
      opacity: 1,
    })),
  }
}

export const COMPARE_CARD_GAP = 20
export const COMPARE_CARD_PADDING_X = 12
export const COMPARE_LABEL_WIDTH = 192
export const COMPARE_PANEL_PADDING = 24
/** Extra inset on the right edge of the compare blueprint grid. */
export const COMPARE_PANEL_PADDING_RIGHT = 40

/** Gray padding around compare / integrated blueprint boards inside a panel. */
export function getCompareBoardWrapperPadding(): {
  paddingTop: number
  paddingBottom: number
  paddingLeft: number
  paddingRight: number
} {
  return {
    paddingTop: COMPARE_PANEL_PADDING,
    paddingBottom: COMPARE_PANEL_PADDING,
    paddingLeft: COMPARE_PANEL_PADDING,
    paddingRight: COMPARE_PANEL_PADDING_RIGHT,
  }
}
export const COMPARE_PATH_SECTION_TOP_INSET = 20
/** Horizontal inset for path section frames; bottom matches top for symmetric gray padding. */
export const COMPARE_PATH_SECTION_INSET = 8
export const COMPARE_PATH_SECTION_BOTTOM_INSET = COMPARE_PATH_SECTION_TOP_INSET
/** Space reserved above compare body rows for section title badges. */
export const COMPARE_PATH_IDENTITY_HEIGHT = COMPARE_PATH_SECTION_TOP_INSET
/** @deprecated Path info now lives in section frames, not a grid swim lane. */
export const COMPARE_PATH_HEADER_HEIGHT = COMPARE_PATH_SECTION_TOP_INSET
export const COMPARE_STEP_HEADER_HEIGHT = BLUEPRINT_HEADER_HEIGHT_COMPACT + 8
export const COMPARE_MIN_PANEL_WIDTH = 720
export const COMPARE_MIN_PANEL_HEIGHT = 480
export const COMPARE_RESIZE_HANDLE_SIZE = 16
/** Extra scroll space so the resize handle and card shadow do not cover the last row. */
export const COMPARE_PANEL_BOTTOM_INSET = COMPARE_RESIZE_HANDLE_SIZE + 16

/** Symmetric vertical inset inside compare scroll shells (resize handle + arrow bleed). */
export function getComparePanelScrollInsetY(): number {
  return (
    COMPARE_PANEL_BOTTOM_INSET / 2 + BLUEPRINT_ARTBOARD_HEIGHT_BUFFER / 2
  )
}

/** Vertical padding inside the compare panel scroll shell (top + bottom). */
export function getComparePanelScrollPaddingY(): number {
  return ARROW_VIEWPORT_PAD * 2 + getComparePanelScrollInsetY() * 2
}

export type CompareRowHeightSpec = {
  height: number
  wrapCorridorAbove?: boolean
  wrapCorridorBelow?: boolean
  inLaneLoopCorridorAbove?: boolean
  kind?: 'path' | 'layer' | 'interaction' | 'visibility' | 'internalInteraction'
  collapsed?: boolean
}

export type BlueprintLabelRowSpec = {
  key: string
  label: string
  height: number
  kind: 'path' | 'layer' | 'interaction' | 'visibility' | 'internalInteraction'
  layer?: BlueprintLayer
  collapsed?: boolean
  wrapCorridorAbove?: boolean
  wrapCorridorBelow?: boolean
  inLaneLoopCorridorAbove?: boolean
  showDividerBelow?: boolean
}

type SwimlaneRowSpec = Pick<
  CompareRowHeightSpec,
  | 'height'
  | 'kind'
  | 'collapsed'
  | 'wrapCorridorAbove'
  | 'wrapCorridorBelow'
  | 'inLaneLoopCorridorAbove'
>

/** White swimlane board height (section padding + rows + gaps). */
export function getSwimlaneBodyHeightFromRowSpecs(
  rows: SwimlaneRowSpec[],
): number {
  const trackHeights = rows.reduce(
    (sum, row) => sum + getCompareRowTrackHeight(row),
    0,
  )
  const rowGaps = Math.max(0, rows.length - 1) * BLUEPRINT_LAYER_ROW_GAP

  return (
    COMPARE_PATH_SECTION_TOP_INSET +
    trackHeights +
    rowGaps +
    COMPARE_PATH_SECTION_BOTTOM_INSET
  )
}

/** Grow layer row heights so the swimlane board matches a shared phase height. */
export function expandRowSpecsToSwimlaneBodyHeight<T extends CompareRowHeightSpec>(
  rows: T[],
  targetBodyHeight: number,
): T[] {
  const surplus = targetBodyHeight - getSwimlaneBodyHeightFromRowSpecs(rows)
  if (surplus <= 0) return rows

  const layerRowCount = rows.filter(
    (row) => row.kind === 'layer' && !row.collapsed,
  ).length
  if (layerRowCount === 0) return rows

  const addPerLayer = surplus / layerRowCount
  return rows.map((row) => {
    if (row.kind !== 'layer' || row.collapsed) return row
    return { ...row, height: row.height + addPerLayer }
  })
}

export function getPanelHeightFromSwimlaneBody(
  swimlaneBodyHeight: number,
): number {
  return (
    swimlaneBodyHeight +
    COMPARE_PANEL_PADDING * 2 +
    getComparePanelScrollPaddingY()
  )
}

export function buildCompareRowSpecs(
  blueprints: BlueprintData[],
  compact = false,
  collapsedLayerIds: ReadonlySet<string> = new Set(),
): CompareRowHeightSpec[] {
  return buildSideBySideLabelRowSpecs(blueprints, compact, collapsedLayerIds)
}

export type ScenarioSwimlaneLayoutInput = {
  displayViewType: SlideViewType
  paths: PathListItem[]
  selectedPathIds: string[]
  blueprintsByPathId: Map<string, BlueprintData>
  compact?: boolean
  collapsedLayerIds?: ReadonlySet<string>
}

function getScenarioBlueprints(
  paths: PathListItem[],
  blueprintsByPathId: Map<string, BlueprintData>,
): BlueprintData[] {
  return paths
    .map((path) => blueprintsByPathId.get(path.id))
    .filter((blueprint): blueprint is BlueprintData => blueprint !== undefined)
}

export function buildSideBySideLabelRowSpecs(
  blueprints: BlueprintData[],
  compact = false,
  collapsedLayerIds: ReadonlySet<string> = new Set(),
): BlueprintLabelRowSpec[] {
  const layers = getCanonicalLayers(blueprints)
  const specs: BlueprintLabelRowSpec[] = []

  for (let layerIndex = 0; layerIndex < layers.length; layerIndex++) {
    const layer = layers[layerIndex]
    const collapsed = isBlueprintLayerCollapsed(layer.id, collapsedLayerIds)

    specs.push({
      key: layer.id,
      kind: 'layer',
      layer,
      label: layer.name,
      collapsed,
      height: collapsed
        ? COMPARE_LAYER_COLLAPSED_HEIGHT
        : getSharedLayerRowHeight(layer, blueprints, compact),
      wrapCorridorAbove:
        !collapsed && layerHasOverheadArrowCorridor(layer, blueprints),
      wrapCorridorBelow:
        !collapsed &&
        layerHasWrapCorridorBelow(layer, blueprints),
      inLaneLoopCorridorAbove:
        !collapsed && layerHasInLaneLoopCorridor(layer, blueprints),
      showDividerBelow: shouldShowLaneDividerAfter(layer, layerIndex, layers),
    })

    if (!collapsed && layerHasInteractionLine(layer)) {
      specs.push({
        key: `${layer.id}-interaction`,
        kind: 'interaction',
        label: INTERACTION_LINE_LABEL,
        height: BLUEPRINT_DIVIDER_ROW_HEIGHT,
      })
    }

    if (!collapsed && layerHasVisibilityLine(layer, layers)) {
      specs.push({
        key: `${layer.id}-visibility`,
        kind: 'visibility',
        label: VISIBILITY_LINE_LABEL,
        height: BLUEPRINT_DIVIDER_ROW_HEIGHT,
      })
    }

    if (!collapsed && layerHasInternalInteractionLine(layer, layers)) {
      specs.push({
        key: `${layer.id}-internal-interaction`,
        kind: 'internalInteraction',
        label: INTERNAL_INTERACTION_LINE_LABEL,
        height: BLUEPRINT_DIVIDER_ROW_HEIGHT,
      })
    }
  }

  return specs
}

/** Shared row specs for integrated and side-by-side scenario/phase panels. */
export function getScenarioSwimlaneRowSpecs(
  options: ScenarioSwimlaneLayoutInput,
): BlueprintLabelRowSpec[] {
  const {
    displayViewType,
    paths,
    selectedPathIds,
    blueprintsByPathId,
    compact = false,
    collapsedLayerIds = new Set(),
  } = options

  const allBlueprints = getScenarioBlueprints(paths, blueprintsByPathId)

  if (displayViewType === 'integrated' && allBlueprints.length > 0) {
    const integrated = mergeIntegratedBlueprint(allBlueprints, selectedPathIds)
    if (integrated) {
      return buildIntegratedLabelRowSpecs(
        integrated.layers,
        integrated,
        compact,
        collapsedLayerIds,
        { sourceBlueprints: allBlueprints, selectedPathIds },
      )
    }
  }

  const useCompareLayout =
    (displayViewType === 'side-by-side' || displayViewType === 'single') &&
    selectedPathIds.length > 0

  if (useCompareLayout) {
    const visibleBlueprints = itemsInSelectionOrder(selectedPathIds, (id) =>
      blueprintsByPathId.get(id),
    ).filter((blueprint): blueprint is BlueprintData => blueprint !== undefined)

    if (visibleBlueprints.length > 0) {
      return buildSideBySideLabelRowSpecs(
        visibleBlueprints,
        compact,
        collapsedLayerIds,
      )
    }
  }

  return []
}

export function getScenarioSwimlaneBodyHeight(
  options: ScenarioSwimlaneLayoutInput,
): number {
  const rows = getScenarioSwimlaneRowSpecs(options)
  if (rows.length === 0) return 0
  return getSwimlaneBodyHeightFromRowSpecs(rows)
}

export function getScenarioBlueprintPanelHeight(
  options: ScenarioSwimlaneLayoutInput,
): number {
  const swimlaneBodyHeight = getScenarioSwimlaneBodyHeight(options)
  if (swimlaneBodyHeight > 0) {
    return getPanelHeightFromSwimlaneBody(swimlaneBodyHeight)
  }

  return COMPARE_MIN_PANEL_HEIGHT
}

export function getCanonicalLayers(blueprints: BlueprintData[]): BlueprintLayer[] {
  const source = blueprints[0]
  if (!source) return []
  return [...source.layers].sort((a, b) => a.row_position - b.row_position)
}

/** Map a canonical swimlane row onto a path's layer ids (paths use different layer uuids). */
export function resolveBlueprintLayer(
  canonicalLayer: BlueprintLayer,
  blueprint: Pick<BlueprintData, 'layers'>,
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
 * Structural blueprint shape for in-lane loop detection — satisfied by both
 * `BlueprintData` (single path) and `IntegratedBlueprintData` (merged paths).
 */
type InLaneLoopLayoutSource = {
  layers: BlueprintLayer[]
  steps: ReadonlyArray<{ id: string; column_position: number }>
  cells: ReadonlyArray<{ id: string; layer_id: string; step_id: string }>
  triggers: ReadonlyArray<{ source_cell_id: string; target_cell_id: string }>
}

/**
 * Generic in-lane loop-corridor rule: a layer needs loop headroom at the top
 * of its lane when it contains a trigger whose source and target cells are
 * BOTH in that layer with the source at a later column than the target — a
 * backward in-lane loop. Derived purely from blueprint data (cell layer
 * membership + step column positions), with no scenario or layer identity;
 * this replaces the side-by-side layout's dependence on the PLUS
 * `layerHasRegularTutorInLaneLoopCorridor` cell-ID shim (which arrow
 * rendering still uses for route styling).
 *
 * Backward loops already claimed by the PLUS legacy wrap shims are skipped:
 * Partner Action loops ride the overhead corridor and Lead Tutor loops ride
 * the below-row wrap corridor, so those lanes must not also reserve an
 * in-lane corridor. Generic (non-PLUS) content never matches those ID
 * patterns and gets the pure data-driven rule.
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
    if (
      isParallelSessionPartnerWrapTrigger(
        trigger.source_cell_id,
        trigger.target_cell_id,
      ) ||
      isParallelSessionLeadBottomWrapTrigger(
        trigger.source_cell_id,
        trigger.target_cell_id,
      )
    ) {
      return false
    }

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

export function getCompareCellShellMinHeight(
  rowHeight: number,
  compact = false,
): number {
  const shellFloor = compact
    ? BLUEPRINT_ROW_MIN_HEIGHT_COMPACT
    : BLUEPRINT_ROW_MIN_HEIGHT
  return Math.max(rowHeight, shellFloor)
}

export function getCompareRowTrackHeight(row: {
  height: number
  wrapCorridorAbove?: boolean
  wrapCorridorBelow?: boolean
  inLaneLoopCorridorAbove?: boolean
}): number {
  return (
    row.height +
    (row.wrapCorridorAbove ? BLUEPRINT_DISCOVERY_RAIL_CORRIDOR_MARGIN : 0) +
    (row.wrapCorridorBelow ? BLUEPRINT_WRAP_CORRIDOR_MARGIN : 0) +
    (row.inLaneLoopCorridorAbove
      ? BLUEPRINT_REGULAR_TUTOR_LOOP_CORRIDOR_MARGIN
      : 0)
  )
}

/** Vertical shell padding on compare cells (Tailwind py-3 / py-4). */
export function getCompareCellShellPaddingY(compact = false): number {
  return compact ? 24 : 32
}

export function getSharedLayerRowHeight(
  layer: BlueprintLayer,
  blueprints: BlueprintData[],
  compact = false,
): number {
  if (blueprints.length === 0) return 0
  const shellPad = getCompareCellShellPaddingY(compact)
  const contentHeight = Math.max(
    ...blueprints.map((blueprint) =>
      getLayerRowMinHeight(layer, blueprint, compact),
    ),
  )
  return getCompareCellShellMinHeight(contentHeight + shellPad, compact)
}

export function getCompareRowTrackCss(row: CompareRowHeightSpec): string {
  return `${getCompareRowTrackHeight(row)}px`
}

export function getCompareCardWidth(
  stepCount: number,
  compact = false,
): number {
  const padding = compact ? COMPARE_CARD_PADDING_X * 2 : COMPARE_CARD_PADDING_X * 2 + 4
  return getStepColumnsWidth(stepCount) + padding
}

/** Full visual width of a divider band (label + gaps + path cards). */
export function getCompareDividerBandWidth(
  blueprints: BlueprintData[],
  compact = false,
): number {
  if (blueprints.length === 0) return COMPARE_LABEL_WIDTH

  const cardsWidth = blueprints.reduce(
    (sum, blueprint) => sum + getCompareCardWidth(blueprint.steps.length, compact),
    0,
  )

  return (
    COMPARE_LABEL_WIDTH +
    cardsWidth +
    blueprints.length * COMPARE_CARD_GAP
  )
}

export function getCompareGridBodyHeight(
  blueprints: BlueprintData[],
  compact = false,
  collapsedLayerIds: ReadonlySet<string> = new Set(),
): number {
  const rows = buildCompareRowSpecs(blueprints, compact, collapsedLayerIds)
  const trackHeights = rows.reduce(
    (sum, row) => sum + getCompareRowTrackHeight(row),
    0,
  )
  const bodyRowGaps = Math.max(0, rows.length - 1) * BLUEPRINT_LAYER_ROW_GAP

  return (
    COMPARE_PATH_SECTION_TOP_INSET +
    trackHeights +
    bodyRowGaps +
    COMPARE_PATH_SECTION_BOTTOM_INSET
  )
}

export function getCompareGridWidth(
  blueprints: BlueprintData[],
  compact = false,
): number {
  if (blueprints.length === 0) return COMPARE_MIN_PANEL_WIDTH

  return (
    getCompareDividerBandWidth(blueprints, compact) +
    COMPARE_PANEL_PADDING +
    COMPARE_PANEL_PADDING_RIGHT
  )
}

export function getCompareGridHeight(
  blueprints: BlueprintData[],
  compact = false,
): number {
  if (blueprints.length === 0) return COMPARE_MIN_PANEL_HEIGHT
  return (
    getCompareGridBodyHeight(blueprints, compact) +
    COMPARE_PANEL_PADDING * 2
  )
}

/** Panel size including scroll padding so arrows and grid are not clipped. */
export function getComparePanelWidth(
  blueprints: BlueprintData[],
  compact = false,
): number {
  return (
    getCompareGridWidth(blueprints, compact) +
    ARROW_VIEWPORT_PAD * 2 +
    (COMPARE_PANEL_PADDING_RIGHT - COMPARE_PANEL_PADDING)
  )
}

export function getComparePanelHeight(
  blueprints: BlueprintData[],
  compact = false,
): number {
  return (
    getCompareGridHeight(blueprints, compact) + getComparePanelScrollPaddingY()
  )
}

export function getSideBySideCompareArtboardSize(
  blueprints: BlueprintData[],
  options?: { compact?: boolean },
): ArtboardSize {
  const compact = options?.compact ?? false
  if (blueprints.length === 0) {
    return { width: 960, height: 540 }
  }

  return {
    width:
      getCompareGridWidth(blueprints, compact) +
      BLUEPRINT_CANVAS_INNER_PADDING * 2 +
      BLUEPRINT_ARTBOARD_WIDTH_BUFFER,
    height: Math.max(
      480,
      getCompareGridHeight(blueprints, compact) +
        BLUEPRINT_CANVAS_INNER_PADDING * 2 +
        BLUEPRINT_ARTBOARD_HEIGHT_BUFFER,
    ),
  }
}

export function layerHasDiscoveryRailCorridorAbove(
  layer: BlueprintLayer,
  blueprints: BlueprintData[],
): boolean {
  return layerHasOverheadArrowCorridor(layer, blueprints)
}

export function layerHasInteractionLine(layer: BlueprintLayer): boolean {
  return shouldShowInteractionLineAfter(layer)
}

export function layerHasVisibilityLine(
  layer: BlueprintLayer,
  layers?: BlueprintLayer[],
): boolean {
  return shouldShowVisibilityLineAfter(layer, layers)
}

export function layerHasInternalInteractionLine(
  layer: BlueprintLayer,
  layers?: BlueprintLayer[],
): boolean {
  return shouldShowInternalInteractionLineAfter(layer, layers)
}

export function getIntegratedLayerRowHeight(
  layer: BlueprintLayer,
  data: IntegratedBlueprintData,
  compact = false,
  options?: IntegratedLayoutOptions,
): number {
  const sourceBlueprints = resolveIntegratedSourceBlueprints(data, options)
  if (sourceBlueprints.length > 0) {
    return getSharedLayerRowHeight(layer, sourceBlueprints, compact)
  }

  return getCompareCellShellMinHeight(
    getCompareCellShellPaddingY(compact) +
      (compact ? BLUEPRINT_ROW_MIN_HEIGHT : BLUEPRINT_ROW_MIN_HEIGHT - 16),
    compact,
  )
}

export function buildIntegratedLabelRowSpecs(
  layers: BlueprintLayer[],
  data: IntegratedBlueprintData,
  compact = false,
  collapsedLayerIds: ReadonlySet<string> = new Set(),
  options?: IntegratedLayoutOptions,
): BlueprintLabelRowSpec[] {
  const specs: BlueprintLabelRowSpec[] = []
  const sourceBlueprints = resolveIntegratedSourceBlueprints(data, options)

  for (let layerIndex = 0; layerIndex < layers.length; layerIndex++) {
    const layer = layers[layerIndex]
    const collapsed = isBlueprintLayerCollapsed(layer.id, collapsedLayerIds)

    specs.push({
      key: layer.id,
      kind: 'layer',
      layer,
      label: layer.name,
      collapsed,
      height: collapsed
        ? COMPARE_LAYER_COLLAPSED_HEIGHT
        : getIntegratedLayerRowHeight(layer, data, compact, options),
      wrapCorridorAbove:
        !collapsed &&
        layerHasOverheadArrowCorridor(
          layer,
          sourceBlueprints.length > 0 ? sourceBlueprints : undefined,
          sourceBlueprints.length > 0 ? undefined : data.triggers,
        ),
      wrapCorridorBelow:
        !collapsed &&
        layerHasWrapCorridorBelow(
          layer,
          sourceBlueprints.length > 0 ? sourceBlueprints : undefined,
          sourceBlueprints.length > 0 ? undefined : data.triggers,
        ),
      inLaneLoopCorridorAbove:
        !collapsed &&
        layerHasInLaneLoopCorridor(
          layer,
          sourceBlueprints.length > 0 ? sourceBlueprints : [data],
        ),
      showDividerBelow: shouldShowLaneDividerAfter(layer, layerIndex, layers),
    })

    if (!collapsed && layerHasInteractionLine(layer)) {
      specs.push({
        key: `${layer.id}-interaction`,
        kind: 'interaction',
        label: INTERACTION_LINE_LABEL,
        height: BLUEPRINT_DIVIDER_ROW_HEIGHT,
      })
    }

    if (!collapsed && layerHasVisibilityLine(layer, layers)) {
      specs.push({
        key: `${layer.id}-visibility`,
        kind: 'visibility',
        label: VISIBILITY_LINE_LABEL,
        height: BLUEPRINT_DIVIDER_ROW_HEIGHT,
      })
    }

    if (!collapsed && layerHasInternalInteractionLine(layer, layers)) {
      specs.push({
        key: `${layer.id}-internal-interaction`,
        kind: 'internalInteraction',
        label: INTERNAL_INTERACTION_LINE_LABEL,
        height: BLUEPRINT_DIVIDER_ROW_HEIGHT,
      })
    }
  }

  return specs
}

export function getIntegratedGridBodyHeight(
  layers: BlueprintLayer[],
  data: IntegratedBlueprintData,
  compact = false,
  collapsedLayerIds: ReadonlySet<string> = new Set(),
  options?: IntegratedLayoutOptions,
): number {
  const rows = buildIntegratedLabelRowSpecs(
    layers,
    data,
    compact,
    collapsedLayerIds,
    options,
  )
  const trackHeights = rows.reduce(
    (sum, row) => sum + getCompareRowTrackHeight(row),
    0,
  )
  const rowGaps = Math.max(0, rows.length - 1) * BLUEPRINT_LAYER_ROW_GAP

  return (
    COMPARE_PATH_SECTION_TOP_INSET +
    trackHeights +
    rowGaps +
    COMPARE_PATH_SECTION_BOTTOM_INSET
  )
}

export function getIntegratedPathNestWidthCompensation(pathCount: number): number {
  return Math.max(0, pathCount - 1) * PATH_TYPE_SECTION_BORDER_WIDTH
}

export function getIntegratedContentCardWidth(
  stepCount: number,
  compact = false,
  pathCount = 1,
): number {
  return (
    getCompareCardWidth(stepCount, compact) +
    getIntegratedPathNestWidthCompensation(pathCount)
  )
}

export function getIntegratedGridMinWidth(
  stepCount: number,
  compact = false,
  pathCount = 1,
): number {
  return (
    COMPARE_LABEL_WIDTH +
    COMPARE_CARD_GAP +
    getIntegratedContentCardWidth(stepCount, compact, pathCount) +
    COMPARE_PANEL_PADDING +
    COMPARE_PANEL_PADDING_RIGHT
  )
}

export function getIntegratedDividerBandWidth(
  stepCount: number,
  compact = false,
  pathCount = 1,
): number {
  return (
    COMPARE_LABEL_WIDTH +
    COMPARE_CARD_GAP +
    getIntegratedContentCardWidth(stepCount, compact, pathCount)
  )
}

export function getIntegratedGridHeight(
  layers: BlueprintLayer[],
  data: IntegratedBlueprintData,
  compact = false,
  collapsedLayerIds: ReadonlySet<string> = new Set(),
  options?: IntegratedLayoutOptions,
): number {
  return (
    getIntegratedGridBodyHeight(
      layers,
      data,
      compact,
      collapsedLayerIds,
      options,
    ) +
    COMPARE_PANEL_PADDING * 2
  )
}

export function getIntegratedPanelWidth(
  stepCount: number,
  compact = false,
  pathCount = 1,
): number {
  return (
    getIntegratedGridMinWidth(stepCount, compact, pathCount) +
    ARROW_VIEWPORT_PAD * 2 +
    (COMPARE_PANEL_PADDING_RIGHT - COMPARE_PANEL_PADDING)
  )
}

export function getIntegratedPanelHeight(
  layers: BlueprintLayer[],
  data: IntegratedBlueprintData,
  compact = false,
  collapsedLayerIds: ReadonlySet<string> = new Set(),
  options?: IntegratedLayoutOptions,
): number {
  return (
    getIntegratedGridHeight(
      layers,
      data,
      compact,
      collapsedLayerIds,
      options,
    ) + getComparePanelScrollPaddingY()
  )
}

/** Canvas artboard size sized to fit a compact integrated blueprint grid. */
export function getIntegratedCanvasArtboardSize(
  data: IntegratedBlueprintData,
  options?: {
    compact?: boolean
    collapsedLayerIds?: ReadonlySet<string>
  },
): ArtboardSize {
  const compact = options?.compact ?? false
  const layers = [...data.layers].sort((a, b) => a.row_position - b.row_position)
  const panelHeight = getIntegratedPanelHeight(
    layers,
    data,
    compact,
    options?.collapsedLayerIds ?? new Set(),
  )
  const panelWidth = getIntegratedPanelWidth(
    data.steps.length,
    compact,
    data.paths.length,
  )

  /** Matches Tailwind `p-3` on CanvasBlueprintArtboard. */
  const canvasArtboardPadding = 24

  return {
    width: panelWidth + canvasArtboardPadding * 2,
    height: Math.max(480, panelHeight + canvasArtboardPadding * 2),
  }
}
