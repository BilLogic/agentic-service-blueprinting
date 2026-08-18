import { Fragment, useMemo, useRef } from 'react'
import { BlueprintCellButton } from '@/components/blueprint/BlueprintCellButton'
import { BlueprintEmptyCellSlot } from '@/components/blueprint/BlueprintEmptyCellSlot'
import { BlueprintStepVisual } from '@/components/blueprint/BlueprintStepVisual'
import { BlueprintTechPill } from '@/components/blueprint/BlueprintTechPill'
import { TechPillFace } from '@/components/blueprint/TechPillFace'
import {
  BlueprintDividerRow,
} from '@/components/blueprint/BlueprintLabelRail'
import { BlueprintTriggerArrows } from '@/components/blueprint/BlueprintTriggerArrows'
import { CanvasEmptyState } from '@/components/editor/CanvasEmptyState'
import {
  ComparePathSectionFrame,
  SERVICE_PATH_SECTION_INSET,
} from '@/components/blueprint/ComparePathSectionFrame'
import {
  COMPARE_PATH_SECTION_BOTTOM_INSET,
  COMPARE_PATH_SECTION_TOP_INSET,
} from '@/lib/sideBySideCompareLayout'
import { PathLabelBadge } from '@/components/blueprint/PathLabelBadge'
import { LayerCollapseToggle } from '@/components/blueprint/LayerCollapseToggle'
import { useCollapsedBlueprintLayers } from '@/hooks/useCollapsedBlueprintLayers'
import {
  BLUEPRINT_OVERHEAD_RAIL_CORRIDOR_MARGIN,
  BLUEPRINT_IN_LANE_LOOP_CORRIDOR_MARGIN,
  BLUEPRINT_WRAP_CORRIDOR_MARGIN,
  BLUEPRINT_ROW_MIN_HEIGHT,
  INTERACTION_LINE_LABEL,
  INTERNAL_INTERACTION_LINE_LABEL,
  LAYER_COLUMN_WIDTH,
  STEP_COLUMN_GAP,
  STEP_COLUMN_WIDTH,
  VISUAL_PLAY_GUTTER,
  getStepColumnsWidth,
  VISIBILITY_LINE_LABEL,
  getBlueprintGridMinHeight,
  getBlueprintGridMinWidth,
  getLayerRowMinHeight,
  getVisualCellButtonMaxHeight,
  layerHasInLaneLoopCorridor,
  layerHasOverheadArrowCorridor,
  layerHasWrapCorridorBelow,
  layerPrecedesBlueprintDivider,
  shouldShowInteractionLineAfter,
  shouldShowInternalInteractionLineAfter,
  shouldShowLaneDividerAfter,
  shouldShowVisibilityLineAfter,
  shouldUsePillCellContent,
  shouldUseVisualContent,
} from '@/lib/blueprintLayout'
import { ARROW_VIEWPORT_PAD } from '@/lib/blueprintArrowGeometry'
import { buildCellLookup, getCellAt, getCellsAt } from '@/lib/normalizeBlueprint'
import { parseCellContentItems } from '@/lib/parseCellContent'
import {
  BLUEPRINT_THEME,
  blueprintPanelCanvasColor,
  blueprintPanelDividerBgColor,
  blueprintPanelLabelRailColor,
  getBlueprintLayerStyle,
  getBlueprintLayerZone,
  type BlueprintLayerStyle,
} from '@/lib/blueprintTheme'
import {
  BLUEPRINT_LAYER_COLLAPSE_ENABLED,
  BLUEPRINT_LAYER_COLLAPSED_HEIGHT,
} from '@/lib/blueprintLayerCollapse'
import { cn } from '@/lib/utils'
import {
  buildBlueprintCellSelection,
  getTechPillItems,
  type BlueprintCellSelectionContext,
} from '@/lib/blueprintCellSelection'
import { resolveVisualStepPictureEntries } from '@/lib/visualWalkthrough'
import { isBlueprintVisualWalkthroughEnabled } from '@/lib/blueprintDisplayFlags'
import { buildVisualWalkthroughSession } from '@/lib/visualWalkthrough'
import { BlueprintVisualPlayButton } from '@/components/blueprint/BlueprintVisualPlayButton'
import type { BlueprintCell, BlueprintData } from '@/types/blueprint'

type ServiceBlueprintGridProps = {
  data: BlueprintData
  className?: string
  compact?: boolean
  fitVertically?: boolean
  scenarioName?: string
  phaseName?: string
  /** When set, scenario title sits on the gray panel; path frame shows path type. */
  headerTitleLabel?: string
  headerTitleDescription?: string | null
  showPathTypeBadge?: boolean
  fixedSwimlaneBodyHeight?: number
  fillSwimlaneHeight?: boolean
  /** Render empty cell shells for missing / blank cells (homepage template). */
  showEmptyCells?: boolean
}

/**
 * Single-path service blueprint — the classic swim-lane grid. Several
 * selected paths render as `BlueprintPathBand` arrangements instead
 * (`SideBySideCompareGrid` in overview rows, `StackedCompareGrid` focused).
 */
export function ServiceBlueprintGrid({
  data,
  className,
  compact = false,
  fitVertically = false,
  scenarioName,
  phaseName,
  headerTitleLabel,
  showPathTypeBadge = false,
  fixedSwimlaneBodyHeight,
  fillSwimlaneHeight = false,
  showEmptyCells = false,
}: ServiceBlueprintGridProps) {
  const { path, steps, triggers } = data
  const layers = useMemo(
    () =>
      [...data.layers].sort((a, b) => a.row_position - b.row_position),
    [data.layers],
  )
  const gridBodyRef = useRef<HTMLDivElement>(null)
  const scrollContainerRef = useRef<HTMLDivElement>(null)
  const { toggleLayer, isLayerCollapsed } = useCollapsedBlueprintLayers()
  const cellLookup = useMemo(() => buildCellLookup(data.cells), [data.cells])
  const showPlay =
    isBlueprintVisualWalkthroughEnabled() &&
    buildVisualWalkthroughSession(data).steps.some(
      (step) => step.pictures.length > 0,
    )
  const playGutter = showPlay ? VISUAL_PLAY_GUTTER : 0

  // Hooks must run unconditionally — these sit above the empty-grid early
  // return, and both are pure computations so hoisting changes nothing.
  const naturalGridBodyMinHeight = useMemo(
    () =>
      getBlueprintGridMinHeight(data, {
        compact,
        includeHeader: false,
      }),
    [data, compact],
  )

  const gridBodyMinHeight = useMemo(() => {
    if (fixedSwimlaneBodyHeight === undefined) return naturalGridBodyMinHeight

    const compareInset =
      COMPARE_PATH_SECTION_TOP_INSET + COMPARE_PATH_SECTION_BOTTOM_INSET
    const serviceInset = SERVICE_PATH_SECTION_INSET * 2
    return fixedSwimlaneBodyHeight - compareInset + serviceInset
  }, [fixedSwimlaneBodyHeight, naturalGridBodyMinHeight])

  if (steps.length === 0 && layers.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        This path has no layers or steps yet.
      </p>
    )
  }

  const gridMinWidth = getBlueprintGridMinWidth(steps.length)

  const scrollMinHeight =
    gridBodyMinHeight + ARROW_VIEWPORT_PAD * 2

  return (
    <div
      className={cn(
        'flex flex-col',
        fitVertically && 'h-full min-h-0',
        className,
      )}
    >
      {!compact && !headerTitleLabel && (
        <div
          className="mb-4 flex shrink-0 flex-wrap items-center gap-2 border-b pb-3"
          style={{ borderColor: BLUEPRINT_THEME.canvasBorder }}
        >
          <PathLabelBadge
            name={path.name}
            description={path.description}
            pathType={path.path_type}
            className="text-base"
          />
        </div>
      )}

      {compact && !headerTitleLabel && (
        <div className="mb-2 flex shrink-0 items-center gap-2 px-1">
          <PathLabelBadge
            name={path.name}
            description={path.description}
            pathType={path.path_type}
            compact
          />
        </div>
      )}

      <div
        ref={scrollContainerRef}
        className={cn(
          'rounded-lg blueprint-scroll ',
          fitVertically
            ? 'min-h-0 flex-1 overflow-auto'
            : 'shrink-0 overflow-x-auto',
          compact && 'rounded-md',
        )}
        style={{
          backgroundColor: blueprintPanelCanvasColor(),
          border: `1px solid ${BLUEPRINT_THEME.canvasBorder}`,
          ...(fitVertically ? {} : { minHeight: scrollMinHeight }),
        }}
      >
        <div
          className={fitVertically ? 'min-h-full' : undefined}
          style={{
            minWidth: gridMinWidth,
            padding: ARROW_VIEWPORT_PAD,
          }}
        >
          <div
            ref={gridBodyRef}
            className="relative flex shrink-0 flex-col gap-0 overflow-visible"
            style={{
              minHeight: gridBodyMinHeight,
              backgroundColor: blueprintPanelCanvasColor(),
            }}
          >
            <ComparePathSectionFrame
              blueprint={data}
              compact={compact}
              showTitle={showPathTypeBadge}
              showPathTypeBadge={showPathTypeBadge}
              variant="service"
            />
            <div
              className="pointer-events-none absolute top-0 bottom-0 z-[1]"
              style={{
                left: LAYER_COLUMN_WIDTH,
                width: 1,
                backgroundColor: BLUEPRINT_THEME.laneDivider,
              }}
              aria-hidden
            />
            <BlueprintTriggerArrows
              layer="forward"
              triggers={triggers}
              contentRef={gridBodyRef}
              scrollContainerRef={scrollContainerRef}
              pathType={path.path_type}
              pathName={path.name}
            />
            {layers.map((layer, layerIndex) => {
              const collapsed = isLayerCollapsed(layer.id)
              const isPillLayer = shouldUsePillCellContent(layer)
              const rowMinHeight = collapsed
                ? BLUEPRINT_LAYER_COLLAPSED_HEIGHT
                : getLayerRowMinHeight(layer, data, compact, {
                    fitVertically: fillSwimlaneHeight,
                  })
              const zone = getBlueprintLayerZone(layer, layers)
              const laneStyle = getBlueprintLayerStyle(layer.name, zone, layer.role)
              const showLaneDivider = shouldShowLaneDividerAfter(
                layer,
                layerIndex,
                layers,
              )

              const flushBottom = layerPrecedesBlueprintDivider(layer, layers)
              const showOverheadRailCorridorAbove =
                !collapsed && layerHasOverheadArrowCorridor(layer, data)
              const showWrapCorridorBelow =
                !collapsed && layerHasWrapCorridorBelow(layer)
              const showInLaneLoopCorridorAbove =
                !collapsed && layerHasInLaneLoopCorridor(layer, data)
              const showInteractionDivider =
                !collapsed && shouldShowInteractionLineAfter(layer)

              return (
                <Fragment key={layer.id}>
                  <div className="flex shrink-0 flex-col">
                    {showOverheadRailCorridorAbove && (
                      <div
                        aria-hidden
                        className="shrink-0"
                        style={{
                          height: BLUEPRINT_OVERHEAD_RAIL_CORRIDOR_MARGIN,
                        }}
                      />
                    )}
                    <BlueprintSwimLane
                      layer={layer}
                      laneStyle={laneStyle}
                      rowMinHeight={rowMinHeight}
                      isPillLayer={isPillLayer}
                      compact={compact}
                      steps={steps}
                      cellLookup={cellLookup}
                      fitVertically={fillSwimlaneHeight || fitVertically}
                      showDividerBelow={showLaneDivider}
                      collapsed={collapsed}
                      flushBottom={flushBottom}
                      showInLaneLoopCorridorAbove={showInLaneLoopCorridorAbove}
                      onToggleCollapse={() => toggleLayer(layer.id)}
                      blueprint={data}
                      scenarioName={scenarioName}
                      phaseName={phaseName}
                      playGutter={playGutter}
                      showPlay={showPlay}
                      showEmptyCells={showEmptyCells}
                    />
                    {showWrapCorridorBelow && (
                      <div
                        aria-hidden
                        data-blueprint-wrap-corridor="below"
                        className="shrink-0"
                        style={{ height: BLUEPRINT_WRAP_CORRIDOR_MARGIN }}
                      />
                    )}
                  </div>

                  {showInteractionDivider && (
                    <BlueprintDividerRow
                      label={INTERACTION_LINE_LABEL}
                      lineStyle="dashed"
                      compact={compact}
                      labelWidth={LAYER_COLUMN_WIDTH}
                      labelRailBg={blueprintPanelLabelRailColor(
                        BLUEPRINT_THEME.dividerBg,
                      )}
                      className="relative flex w-full shrink-0"
                      style={{
                        minWidth:
                          LAYER_COLUMN_WIDTH + getStepColumnsWidth(steps.length),
                        backgroundColor: blueprintPanelDividerBgColor(),
                      }}
                    />
                  )}

                  {!collapsed && shouldShowVisibilityLineAfter(layer, layers) && (
                    <BlueprintDividerRow
                      label={VISIBILITY_LINE_LABEL}
                      lineStyle="solid"
                      compact={compact}
                      labelWidth={LAYER_COLUMN_WIDTH}
                      labelRailBg={blueprintPanelLabelRailColor(
                        BLUEPRINT_THEME.dividerBg,
                      )}
                      className="relative flex w-full shrink-0"
                      style={{
                        minWidth:
                          LAYER_COLUMN_WIDTH + getStepColumnsWidth(steps.length),
                        backgroundColor: blueprintPanelDividerBgColor(),
                      }}
                    />
                  )}

                  {!collapsed &&
                    shouldShowInternalInteractionLineAfter(layer, layers) && (
                    <BlueprintDividerRow
                      label={INTERNAL_INTERACTION_LINE_LABEL}
                      lineStyle="dotted"
                      compact={compact}
                      labelWidth={LAYER_COLUMN_WIDTH}
                      labelRailBg={blueprintPanelLabelRailColor(
                        BLUEPRINT_THEME.dividerBg,
                      )}
                      className="relative flex w-full shrink-0"
                      style={{
                        minWidth:
                          LAYER_COLUMN_WIDTH + getStepColumnsWidth(steps.length),
                        backgroundColor: blueprintPanelDividerBgColor(),
                      }}
                    />
                  )}
                </Fragment>
              )
            })}
            <BlueprintTriggerArrows
              layer="wrap"
              triggers={triggers}
              contentRef={gridBodyRef}
              scrollContainerRef={scrollContainerRef}
              pathType={path.path_type}
              pathName={path.name}
            />
          </div>

          {layers.length === 0 && steps.length > 0 && (
            <CanvasEmptyState
              variant="panel"
              className="h-auto w-full"
              title="No layers defined"
              description="Layers arrive with the blueprint import — or ask the agent with /sb:map."
            />
          )}
        </div>
      </div>
    </div>
  )
}

function BlueprintSwimLane({
  layer,
  laneStyle,
  rowMinHeight,
  isPillLayer,
  compact,
  steps,
  cellLookup,
  fitVertically,
  showDividerBelow,
  collapsed = false,
  flushBottom,
  showInLaneLoopCorridorAbove = false,
  onToggleCollapse,
  blueprint,
  scenarioName,
  phaseName,
  playGutter = 0,
  showPlay = false,
  showEmptyCells = false,
}: {
  layer: BlueprintData['layers'][number]
  laneStyle: BlueprintLayerStyle
  rowMinHeight: number
  isPillLayer: boolean
  compact?: boolean
  steps: BlueprintData['steps']
  cellLookup: ReturnType<typeof buildCellLookup>
  fitVertically?: boolean
  showDividerBelow?: boolean
  collapsed?: boolean
  flushBottom?: boolean
  showInLaneLoopCorridorAbove?: boolean
  onToggleCollapse?: () => void
  blueprint: BlueprintData
  scenarioName?: string
  phaseName?: string
  playGutter?: number
  showPlay?: boolean
  showEmptyCells?: boolean
}) {
  const layerId = layer.id
  const layerName = layer.name
  const isVisualLayer = shouldUseVisualContent(layer)
  const renderPlay = showPlay && isVisualLayer && playGutter > 0
  const loopCorridorHeight = showInLaneLoopCorridorAbove
    ? BLUEPRINT_IN_LANE_LOOP_CORRIDOR_MARGIN
    : 0

  // `data-layer-name` lets a selected cell say which lane it is in without the
  // selection having to carry the whole blueprint (see lib/canvasCellQuery).
  return (
    <div
      data-blueprint-swimlane=""
      data-blueprint-row=""
      data-layer-id={layerId}
      data-layer-name={layer.name}
      className={cn(
        'flex shrink-0 overflow-visible rounded-sm',
        showDividerBelow && 'border-b',
      )}
      style={{
        minHeight: rowMinHeight + loopCorridorHeight,
        backgroundColor: blueprintPanelCanvasColor(),
        ...(showDividerBelow
          ? { borderColor: BLUEPRINT_THEME.laneDivider }
          : undefined),
      }}
    >
      <div
        className={cn(
          'sticky left-0 z-10 flex shrink-0 flex-col self-start border-r',
          compact ? 'px-3.5' : 'pl-5 pr-3',
        )}
        style={{
          width: LAYER_COLUMN_WIDTH,
          minWidth: LAYER_COLUMN_WIDTH,
          maxWidth: LAYER_COLUMN_WIDTH,
          backgroundColor: blueprintPanelLabelRailColor(BLUEPRINT_THEME.canvas),
          borderColor: BLUEPRINT_THEME.laneDivider,
        }}
      >
        {loopCorridorHeight > 0 && (
          <div
            aria-hidden
            className="shrink-0"
            style={{ height: loopCorridorHeight }}
          />
        )}
        <div
          className={cn(
            'flex w-full items-start gap-2',
            compact ? 'pt-3 pb-3' : 'pt-5 pb-5',
          )}
        >
        {isVisualLayer ? (
          <span
            className={cn(
              'min-w-0 flex-1 text-left font-bold leading-snug tracking-tight whitespace-normal break-words',
              compact ? 'text-xs' : 'text-sm',
            )}
            style={{ color: laneStyle.label }}
          >
            {layerName}
          </span>
        ) : (
          <span
            className={cn(
              'min-w-0 flex-1 text-left font-bold leading-snug tracking-tight whitespace-normal break-words',
              compact ? 'text-xs' : 'text-sm',
            )}
            style={{ color: laneStyle.label }}
          >
            {layerName}
          </span>
        )}
        {BLUEPRINT_LAYER_COLLAPSE_ENABLED && onToggleCollapse && (
          <LayerCollapseToggle
            layerName={layerName}
            collapsed={collapsed}
            onToggle={onToggleCollapse}
            className="size-6 shrink-0"
          />
        )}
        </div>
      </div>

      {!collapsed && (
        <div className="flex min-w-0 flex-1 flex-col">
          {loopCorridorHeight > 0 && (
            <div
              aria-hidden
              data-blueprint-loop-corridor="above"
              className="shrink-0"
              style={{ height: loopCorridorHeight }}
            />
          )}
          <div
            className="relative flex shrink-0"
            style={{ paddingLeft: playGutter || undefined }}
          >
            {renderPlay ? (
              <div
                className="pointer-events-auto absolute z-50"
                style={{
                  left: 6,
                  top: compact ? 10 : 14,
                }}
              >
                <BlueprintVisualPlayButton
                  blueprint={blueprint}
                  scenarioName={scenarioName}
                  phaseName={phaseName}
                />
              </div>
            ) : null}
      {steps.map((step, stepIndex) => {
        const cell = getCellAt(cellLookup, layerId, step.id)
        // A tech slot can hold several cells — one per touchpoint — and each
        // renders as its own pill with its own identity. Everything else
        // keeps asking for "the" cell.
        const slotCells = isPillLayer
          ? getCellsAt(cellLookup, layerId, step.id)
          : undefined
        const variant = isVisualLayer ? 'visual' : isPillLayer ? 'pills' : 'default'
        const visualPictures = isVisualLayer
          ? resolveVisualStepPictureEntries(blueprint, step.id)
          : undefined
        const showCell = isVisualLayer
          ? (visualPictures?.length ?? 0) > 0 || showEmptyCells
          : isPillLayer
            ? (slotCells ?? []).some((entry) =>
                hasCellContent(entry.content, variant),
              ) || showEmptyCells
            : hasCellContent(cell?.content, variant) || showEmptyCells

        return (
          <Fragment key={`${layerId}-${step.id}`}>
            {showCell ? (
              <BlueprintCellBlock
                stepIndex={stepIndex}
                cellId={
                  cell?.id ??
                  (showEmptyCells
                    ? `empty-${layerId}-${step.id}`
                    : isVisualLayer
                      ? `visual-${step.id}`
                      : undefined)
                }
                content={cell?.content ?? (showEmptyCells ? '' : undefined)}
                laneStyle={laneStyle}
                variant={variant}
                width={STEP_COLUMN_WIDTH}
                compact={compact}
                fitVertically={fitVertically}
                rowMinHeight={rowMinHeight}
                flushBottom={flushBottom}
                visualPictures={visualPictures}
                slotCells={slotCells}
                selectionContext={
                  scenarioName && (cell?.id || isVisualLayer || showEmptyCells)
                    ? {
                        scenarioName,
                        phaseName,
                        layerName,
                        stepId: step.id,
                        stepName: step.name,
                        stepIndex,
                        cellId:
                          cell?.id ??
                          (isVisualLayer
                            ? `visual-${step.id}`
                            : `empty-${layerId}-${step.id}`),
                        cellContent: cell?.content ?? '',
                        cellPicture: cell?.picture ?? null,
                        cellDescription: cell?.description ?? null,
                        cellLinks: cell?.links,
                        pathId: blueprint.path.id,
                        pathName: blueprint.path.name,
                        pathDescription: blueprint.path.description,
                        pathType: blueprint.path.path_type,
                      }
                    : undefined
                }
              />
            ) : (
              // Empty in Edit mode is not nothing: it is where a cell can go.
              // Outside Edit it stays the inert spacer it has always been.
              <BlueprintEmptyCellSlot
                pathId={blueprint.path.id}
                layerId={layerId}
                stepId={step.id}
                layerName={layerName}
                stepName={step.name}
                stepIndex={stepIndex}
                scenarioName={scenarioName}
                phaseName={phaseName}
                width={STEP_COLUMN_WIDTH}
                minHeight={rowMinHeight}
              />
            )}
            {stepIndex < steps.length - 1 && (
              <div
                aria-hidden
                className="shrink-0"
                style={{
                  width: STEP_COLUMN_GAP,
                  minWidth: STEP_COLUMN_GAP,
                }}
                data-step-gap={stepIndex}
              />
            )}
          </Fragment>
        )
      })}
          </div>
        </div>
      )}
    </div>
  )
}

function hasCellContent(
  content: string | undefined,
  variant: 'default' | 'pills' | 'visual',
): boolean {
  if (variant === 'visual') return true
  if (!content?.trim()) return false
  if (variant === 'pills') {
    return parseCellContentItems(content).length > 0
  }
  return true
}

function BlueprintCellBlock({
  stepIndex,
  cellId,
  content,
  laneStyle,
  variant = 'default',
  width,
  compact,
  fitVertically,
  rowMinHeight,
  flushBottom,
  selectionContext,
  visualPictures,
  slotCells,
}: {
  stepIndex: number
  cellId?: string
  content?: string
  laneStyle: BlueprintLayerStyle
  variant?: 'default' | 'pills' | 'visual'
  width: number
  compact?: boolean
  fitVertically?: boolean
  rowMinHeight?: number
  flushBottom?: boolean
  selectionContext?: BlueprintCellSelectionContext
  visualPictures?: Array<{ picture: string; label: string }>
  /** Every cell in a tech slot — one per touchpoint since the split. */
  slotCells?: BlueprintCell[]
}) {
  const shellPadding = cn(
    compact ? 'px-3' : 'px-3.5',
    compact ? 'pt-3' : 'pt-4',
    flushBottom ? 'pb-0' : compact ? 'pb-3' : 'pb-4',
  )
  /*
    One pill per (cell, item). Since the split a tech slot holds one cell
    per touchpoint, so this is one pill per cell — but a cell whose content
    still parses to several items (pre-split data, or hand-typed lists)
    renders them all, attributed to that cell. Nothing is dropped either way.
  */
  const pillEntries =
    variant === 'pills'
      ? (slotCells && slotCells.length > 0
          ? slotCells
          : content !== undefined
            ? [{ id: cellId, content, picture: null, description: null, links: [] }]
            : []
        ).flatMap((slotCell) =>
          getTechPillItems(slotCell.content ?? '').map((item) => ({
            item,
            cell: slotCell,
          })),
        )
      : []

  const shellStyle = {
    width,
    minWidth: width,
    maxWidth: width,
    minHeight: fitVertically
      ? variant === 'pills'
        ? rowMinHeight
        : 0
      : BLUEPRINT_ROW_MIN_HEIGHT,
    ...(variant === 'visual'
      ? { maxHeight: rowMinHeight ?? getVisualCellButtonMaxHeight(compact) + (compact ? 24 : 32) }
      : undefined),
  }

  const shellClassName = cn(
    'relative z-[1] flex shrink-0 items-stretch',
    shellPadding,
    fitVertically && (variant === 'pills' ? 'h-full' : 'h-full min-h-0'),
    variant === 'visual' && 'min-h-0 overflow-hidden',
  )

  const innerContent =
    variant === 'visual' ? (
      <div className="relative flex h-full min-h-0 max-h-full w-full flex-1 overflow-hidden">
        <BlueprintStepVisual
          compact={compact}
          fill={laneStyle.lane}
          pictures={visualPictures}
          selection={
            selectionContext
              ? buildBlueprintCellSelection(selectionContext)
              : undefined
          }
          cellId={cellId}
          stepIndex={stepIndex}
          className="flex-1"
        />
      </div>
    ) : variant === 'pills' ? (
      <div
        {...(cellId ? { 'data-blueprint-cell': cellId } : {})}
        data-step-index={stepIndex}
        className={cn(
          'flex w-full flex-1 flex-col items-stretch justify-start',
          compact ? 'gap-2' : 'gap-2.5',
          !fitVertically && 'min-h-[80px] justify-center',
        )}
      >
        {pillEntries.map(({ item, cell: slotCell }, index) =>
          selectionContext ? (
            <BlueprintTechPill
              key={`${slotCell.id ?? 'anon'}-${item}-${index}`}
              item={item}
              // Each pill speaks for its own cell: identity is the whole
              // point of the split, and the selection context must carry the
              // touchpoint's id, not the slot's first.
              selectionContext={{
                ...selectionContext,
                cellId: slotCell.id ?? selectionContext.cellId,
                cellContent: slotCell.content ?? '',
                cellPicture: slotCell.picture ?? null,
                cellDescription: slotCell.description ?? null,
                cellLinks: slotCell.links,
              }}
              stepIndex={stepIndex}
              compact={compact}
              sliceSequenceBadge={
                index === 0 ||
                slotCell.id !== pillEntries[index - 1]?.cell.id
              }
            />
          ) : (
            <TechPillFace key={`${item}-${index}`} item={item} compact={compact} />
          ),
        )}
      </div>
    ) : (
      <BlueprintCellButton
        fill={laneStyle.lane}
        compact={compact}
        selection={
          selectionContext
            ? buildBlueprintCellSelection(selectionContext)
            : undefined
        }
        cellId={cellId}
        stepIndex={stepIndex}
        className={cn(
          fitVertically && 'min-h-0 overflow-y-auto blueprint-scroll',
        )}
      >
        <p className="m-auto w-full whitespace-pre-wrap">{content}</p>
      </BlueprintCellButton>
    )

  return (
    <div className={shellClassName} style={shellStyle}>
      {innerContent}
    </div>
  )
}
