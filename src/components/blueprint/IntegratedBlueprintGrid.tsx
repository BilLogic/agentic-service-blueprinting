import { Fragment, useMemo, useRef, type RefObject } from 'react'
import { BlueprintCellButton } from '@/components/blueprint/BlueprintCellButton'
import { BlueprintStepVisual } from '@/components/blueprint/BlueprintStepVisual'
import { BlueprintTechPill } from '@/components/blueprint/BlueprintTechPill'
import { TechPillFace } from '@/components/blueprint/TechPillFace'
import {
  BlueprintDividerRow,
  BlueprintLabelRow,
  BlueprintStickyLabelBackdrop,
  BlueprintSwimLaneDivider,
} from '@/components/blueprint/BlueprintLabelRail'
import { IntegratedPathSectionFrame } from '@/components/blueprint/IntegratedPathSectionFrame'
import { IntegratedTriggerArrows } from '@/components/blueprint/IntegratedTriggerArrows'
import { PathLabelBadge } from '@/components/blueprint/PathLabelBadge'
import {
  formatPathPickerLabel,
  PathToolbarButton,
} from '@/components/blueprint/PathMultiSelect'
import { useCollapsedBlueprintLayers } from '@/hooks/useCollapsedBlueprintLayers'
import { itemsInSelectionOrder } from '@/lib/pathSelection'
import {
  BLUEPRINT_LAYER_ROW_GAP,
  BLUEPRINT_IN_LANE_LOOP_CORRIDOR_MARGIN,
  BLUEPRINT_WRAP_CORRIDOR_MARGIN,
  STEP_COLUMN_GAP,
  STEP_COLUMN_WIDTH,
  getCellContentMinHeight,
  getVisualCellButtonMaxHeight,
  layerPrecedesBlueprintDivider,
  shouldUsePillCellContent,
  shouldUseVisualContent,
} from '@/lib/blueprintLayout'
import { ARROW_VIEWPORT_PAD } from '@/lib/blueprintArrowGeometry'
import { parseCellContentItems } from '@/lib/parseCellContent'
import {
  buildIntegratedLabelRowSpecs,
  expandRowSpecsToSwimlaneBodyHeight,
  COMPARE_CARD_GAP,
  COMPARE_LABEL_WIDTH,
  getCompareBoardWrapperPadding,
  COMPARE_PATH_SECTION_TOP_INSET,
  COMPARE_PATH_SECTION_BOTTOM_INSET,
  getCompareRowTrackCss,
  getIntegratedContentCardWidth,
  getIntegratedGridBodyHeight,
  getIntegratedGridMinWidth,
  type BlueprintLabelRowSpec,
} from '@/lib/sideBySideCompareLayout'
import {
  blueprintPanelLabelRailColor,
  getBlueprintLayerStyle,
  getBlueprintLayerZone,
  type BlueprintLayerStyle,
} from '@/lib/blueprintTheme'
import type { BlueprintData } from '@/types/blueprint'
import { cn } from '@/lib/utils'
import {
  buildBlueprintCellSelection,
  getTechPillItems,
  type BlueprintCellSelectionContext,
} from '@/lib/blueprintCellSelection'
import type { PathType } from '@/types/database'
import type {
  IntegratedBlueprintCell,
  IntegratedBlueprintData,
  IntegratedBlueprintStep,
} from '@/types/integratedBlueprint'
import { getIntegratedCellDisplayOpacity } from '@/types/integratedBlueprint'
import type { BlueprintLayer } from '@/types/blueprint'
import { resolveVisualStepPictures } from '@/lib/visualWalkthrough'

type IntegratedBlueprintGridProps = {
  data: IntegratedBlueprintData
  className?: string
  compact?: boolean
  fitVertically?: boolean
  /** When true, omits the outer scroll shell (parent panel owns scrolling). */
  embedded?: boolean
  scrollContainerRef?: RefObject<HTMLDivElement | null>
  selectedPathIds?: string[]
  onTogglePath?: (pathId: string) => void
  scenarioName?: string
  walkthroughBlueprints?: BlueprintData[]
  fixedSwimlaneBodyHeight?: number
  fillSwimlaneHeight?: boolean
  /** Overview mode: path frames show path type instead of path name. */
  showPathTypeBadge?: boolean
}

function getCellsAt(
  cells: IntegratedBlueprintCell[],
  layerId: string,
  stepId: string,
): IntegratedBlueprintCell[] {
  return cells.filter(
    (cell) => cell.layer_id === layerId && cell.step_id === stepId,
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

export function IntegratedBlueprintGrid({
  data,
  className,
  compact = false,
  fitVertically = false,
  embedded = false,
  scrollContainerRef: scrollContainerRefProp,
  selectedPathIds = [],
  onTogglePath,
  scenarioName,
  walkthroughBlueprints = [],
  fixedSwimlaneBodyHeight,
  fillSwimlaneHeight = false,
  showPathTypeBadge = false,
}: IntegratedBlueprintGridProps) {
  const { layers, steps, cells, triggers, paths } = data
  const pathNameById = useMemo(
    () => new Map(paths.map((path) => [path.id, path.name])),
    [paths],
  )
  const pathDescriptionById = useMemo(
    () => new Map(paths.map((path) => [path.id, path.description])),
    [paths],
  )
  const gridBodyRef = useRef<HTMLDivElement>(null)
  const contentColumnRef = useRef<HTMLDivElement>(null)
  const fallbackScrollRef = useRef<HTMLDivElement>(null)
  const scrollContainerRef = scrollContainerRefProp ?? fallbackScrollRef
  const { collapsedLayerIds, toggleLayer } = useCollapsedBlueprintLayers()

  const activePaths = useMemo(
    () =>
      itemsInSelectionOrder(selectedPathIds, (id) =>
        paths.find((path) => path.id === id),
      ),
    [selectedPathIds, paths],
  )

  if (steps.length === 0 && layers.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        No integrated blueprint data yet.
      </p>
    )
  }

  const layoutOptions = useMemo(
    () => ({
      fitVertically: fillSwimlaneHeight,
      sourceBlueprints: walkthroughBlueprints,
      selectedPathIds,
    }),
    [fillSwimlaneHeight, walkthroughBlueprints, selectedPathIds],
  )

  const rows = useMemo(() => {
    const base = buildIntegratedLabelRowSpecs(
      layers,
      data,
      compact,
      collapsedLayerIds,
      layoutOptions,
    )
    if (fixedSwimlaneBodyHeight === undefined) return base
    return expandRowSpecsToSwimlaneBodyHeight(base, fixedSwimlaneBodyHeight)
  }, [
    layers,
    data,
    compact,
    collapsedLayerIds,
    fillSwimlaneHeight,
    fixedSwimlaneBodyHeight,
    layoutOptions,
  ])

  const rowTrackSizes = useMemo(
    () =>
      rows
        .map((row) =>
          getCompareRowTrackCss(row),
        )
        .join(' '),
    [fillSwimlaneHeight, rows],
  )

  const activePathCount = Math.max(1, activePaths.length)
  const contentCardWidth = getIntegratedContentCardWidth(
    steps.length,
    compact,
    activePathCount,
  )
  const gridMinWidth = getIntegratedGridMinWidth(
    steps.length,
    compact,
    activePathCount,
  )
  const gridBodyMinHeight = useMemo(
    () =>
      getIntegratedGridBodyHeight(
        layers,
        data,
        compact,
        collapsedLayerIds,
        layoutOptions,
      ),
    [layers, data, compact, collapsedLayerIds, layoutOptions],
  )

  const scrollMinHeight = gridBodyMinHeight + ARROW_VIEWPORT_PAD * 2

  const pathsLegend = (
    <div
      className={cn(
        'flex shrink-0 flex-wrap items-center gap-x-4 gap-y-2 px-1',
        embedded ? 'mb-0' : compact ? 'mb-2' : 'mb-4 gap-x-5',
      )}
    >
      <span
        className={cn(
          'font-semibold text-foreground',
          compact ? 'text-xs' : 'text-sm',
        )}
      >
        Integrated paths
      </span>
      {paths.map((path) =>
        onTogglePath ? (
          <PathToolbarButton
            key={path.id}
            path={path}
            checked={selectedPathIds.includes(path.id)}
            onToggle={onTogglePath}
          />
        ) : (
          <PathLabelBadge
            key={path.id}
            name={formatPathPickerLabel(path.name)}
            description={path.description}
            pathType={path.path_type}
            compact={compact}
          />
        ),
      )}
    </div>
  )

  const gridBody = (
    <div
      className="w-max shrink-0"
      style={getCompareBoardWrapperPadding()}
    >
      <div
        ref={gridBodyRef}
        className="relative grid w-max shrink-0 overflow-visible"
        style={{
          gridTemplateColumns: `${COMPARE_LABEL_WIDTH}px ${contentCardWidth}px`,
          gridTemplateRows: rowTrackSizes,
          columnGap: COMPARE_CARD_GAP,
          rowGap: BLUEPRINT_LAYER_ROW_GAP,
          paddingTop: COMPARE_PATH_SECTION_TOP_INSET,
          paddingBottom: COMPARE_PATH_SECTION_BOTTOM_INSET,
        }}
      >
        <BlueprintStickyLabelBackdrop rowCount={rows.length} />
        {rows.map((row, rowIndex) =>
          row.kind === 'interaction' ||
          row.kind === 'visibility' ||
          row.kind === 'internalInteraction' ? (
            <BlueprintDividerRow
              key={row.key}
              rowIndex={rowIndex}
              label={row.label}
              lineStyle={row.kind === 'interaction' ? 'dashed' : 'solid'}
            />
          ) : (
            <Fragment key={`label-${row.key}`}>
              <BlueprintLabelRow
                row={row}
                layers={layers}
                compact={compact}
                onToggleLayer={toggleLayer}
                style={{ gridColumn: 1, gridRow: rowIndex + 1 }}
              />
              {row.showDividerBelow ? (
                <BlueprintSwimLaneDivider rowIndex={rowIndex} />
              ) : null}
            </Fragment>
          ),
        )}
        <div
          ref={contentColumnRef}
          className="relative z-0 grid overflow-visible"
          style={{
            gridColumn: 2,
            gridRow: `1 / ${rows.length + 1}`,
            gridTemplateRows: 'subgrid',
          }}
        >
          <IntegratedPathSectionFrame
            paths={activePaths}
            compact={compact}
            showPathTypeBadge={showPathTypeBadge}
          />
          <IntegratedTriggerArrows
            layer="forward"
            triggers={triggers}
            cells={cells}
            steps={steps}
            paths={paths}
            contentRef={contentColumnRef}
            scrollContainerRef={scrollContainerRef}
          />
          {rows.map((row, rowIndex) => (
            <IntegratedContentRow
              key={row.key}
              row={row}
              rowIndex={rowIndex}
              steps={steps}
              cells={cells}
              layers={layers}
              compact={compact}
              fitVertically={fillSwimlaneHeight || fitVertically}
              scenarioName={scenarioName}
              pathNameById={pathNameById}
              pathDescriptionById={pathDescriptionById}
            />
          ))}
          <IntegratedTriggerArrows
            layer="wrap"
            triggers={triggers}
            cells={cells}
            steps={steps}
            paths={paths}
            contentRef={contentColumnRef}
            scrollContainerRef={scrollContainerRef}
          />
        </div>
      </div>
    </div>
  )

  if (embedded) {
    return (
      <div className={cn('w-max shrink-0', className)}>
        {gridBody}
      </div>
    )
  }

  return (
    <div
      className={cn(
        'flex flex-col',
        fitVertically && 'h-full min-h-0',
        className,
      )}
    >
      {pathsLegend}
      <div
        ref={scrollContainerRef}
        className={cn(
          'rounded-lg blueprint-scroll',
          fitVertically
            ? 'min-h-0 flex-1 overflow-auto'
            : 'shrink-0 overflow-x-auto',
          compact && 'rounded-md',
        )}
        style={{
          ...(fitVertically ? {} : { minHeight: scrollMinHeight }),
          backgroundColor: blueprintPanelLabelRailColor(),
        }}
      >
        <div
          className={fitVertically ? 'min-h-full' : undefined}
          style={{
            minWidth: gridMinWidth,
            padding: ARROW_VIEWPORT_PAD,
          }}
        >
          {gridBody}
        </div>
      </div>
    </div>
  )
}

function IntegratedContentRow({
  row,
  rowIndex,
  steps,
  cells,
  layers,
  compact,
  fitVertically,
  scenarioName,
  pathNameById,
  pathDescriptionById,
}: {
  row: BlueprintLabelRowSpec
  rowIndex: number
  steps: IntegratedBlueprintStep[]
  cells: IntegratedBlueprintCell[]
  layers: BlueprintLayer[]
  compact?: boolean
  fitVertically?: boolean
  scenarioName?: string
  pathNameById: Map<string, string>
  pathDescriptionById: Map<string, string | null>
}) {
  const isDivider =
    row.kind === 'interaction' ||
    row.kind === 'visibility' ||
    row.kind === 'internalInteraction'
  const isLayerRow = row.kind === 'layer'
  const corridorBelow = row.wrapCorridorBelow
    ? BLUEPRINT_WRAP_CORRIDOR_MARGIN
    : 0
  const inLaneLoopCorridorAbove = row.inLaneLoopCorridorAbove
    ? BLUEPRINT_IN_LANE_LOOP_CORRIDOR_MARGIN
    : 0

  return (
    <div
      {...(isLayerRow && row.layer
        ? {
            'data-blueprint-swimlane': '',
            'data-blueprint-row': '',
            'data-layer-id': row.layer.id,
          }
        : {})}
      {...(isDivider
        ? {
            'data-blueprint-divider':
              row.kind === 'interaction' ? 'interaction' : 'visibility',
          }
        : {})}
      className={cn(
        'flex h-full min-h-0 flex-col',
        isDivider && 'relative z-[1] overflow-hidden bg-transparent',
        isLayerRow && 'overflow-visible',
      )}
      style={{
        gridRow: rowIndex + 1,
        backgroundColor: isDivider ? undefined : 'transparent',
      }}
      {...(isDivider ? { role: 'separator' as const } : {})}
    >
      <div
        className={cn(
          'min-h-0',
          isDivider
            ? 'flex h-full items-center overflow-hidden'
            : 'flex flex-1 flex-col',
        )}
      >
        {inLaneLoopCorridorAbove > 0 && (
          <div
            aria-hidden
            data-blueprint-loop-corridor="above"
            className="shrink-0"
            style={{ height: inLaneLoopCorridorAbove }}
          />
        )}
        {row.kind === 'layer' && row.layer ? (
          row.collapsed ? (
            <div className="h-full" aria-hidden />
          ) : (
            <IntegratedLayerContent
              layer={row.layer}
              layers={layers}
              steps={steps}
              cells={cells}
              compact={compact}
              fitVertically={fitVertically}
              scenarioName={scenarioName}
              pathNameById={pathNameById}
              pathDescriptionById={pathDescriptionById}
            />
          )
        ) : isDivider ? (
          <div className="h-full" aria-hidden />
        ) : null}
      </div>
      {corridorBelow > 0 && (
        <div
          aria-hidden
          data-blueprint-wrap-corridor="below"
          className="shrink-0"
          style={{ height: corridorBelow }}
        />
      )}
    </div>
  )
}

function IntegratedLayerContent({
  layer,
  layers,
  steps,
  cells,
  compact,
  fitVertically,
  scenarioName,
  pathNameById,
  pathDescriptionById,
}: {
  layer: BlueprintLayer
  layers: BlueprintLayer[]
  steps: IntegratedBlueprintStep[]
  cells: IntegratedBlueprintCell[]
  compact?: boolean
  fitVertically?: boolean
  scenarioName?: string
  pathNameById: Map<string, string>
  pathDescriptionById: Map<string, string | null>
}) {
  const isPillLayer = shouldUsePillCellContent(layer)
  const laneStyle = getBlueprintLayerStyle(
    layer.name,
    getBlueprintLayerZone(layer, layers),
  )
  const flushBottom = layerPrecedesBlueprintDivider(layer, layers)

  return (
    <div
      className={cn(
        'flex items-stretch rounded-sm',
        fitVertically ? 'h-full min-h-0 w-full' : 'shrink-0',
      )}
      style={{ backgroundColor: 'transparent' }}
    >
      {steps.map((step, stepIndex) => {
        const slotCells = getCellsAt(cells, layer.id, step.id)
        const isVisualLayer = shouldUseVisualContent(layer)
        const variant = isVisualLayer ? 'visual' : isPillLayer ? 'pills' : 'default'
        const visualPictures = isVisualLayer
          ? (() => {
              const representative =
                slotCells.length === 0
                  ? undefined
                  : [...slotCells].sort((a, b) => b.opacity - a.opacity)[0]
              if (representative == null) return []
              return resolveVisualStepPictures(
                {
                  layers,
                  cells: cells.filter(
                    (cell) => cell.path_id === representative.path_id,
                  ),
                },
                step.id,
              )
            })()
          : undefined
        const showCell = isVisualLayer
          ? (visualPictures?.length ?? 0) > 0
          : slotCells.some((cell) => hasCellContent(cell.content, variant))

        return (
          <Fragment key={`${layer.id}-${step.id}`}>
            {showCell ? (
              isVisualLayer ? (
                <IntegratedVisualCell
                  layer={layer}
                  step={step}
                  stepIndex={stepIndex}
                  slotCells={slotCells}
                  laneStyle={laneStyle}
                  compact={compact}
                  fitVertically={fitVertically}
                  flushBottom={flushBottom}
                  scenarioName={scenarioName}
                  pathNameById={pathNameById}
                  pathDescriptionById={pathDescriptionById}
                  visualPictures={visualPictures ?? []}
                />
              ) : (
                <IntegratedCellSlot
                  layer={layer}
                  step={step}
                  stepIndex={stepIndex}
                  slotCells={slotCells}
                  laneStyle={laneStyle}
                  variant={isPillLayer ? 'pills' : 'default'}
                  width={STEP_COLUMN_WIDTH}
                  compact={compact}
                  fitVertically={fitVertically}
                  flushBottom={flushBottom}
                  scenarioName={scenarioName}
                  pathNameById={pathNameById}
                  pathDescriptionById={pathDescriptionById}
                />
              )
            ) : (
              <div
                aria-hidden
                className="shrink-0 self-stretch"
                style={{
                  width: STEP_COLUMN_WIDTH,
                  minWidth: STEP_COLUMN_WIDTH,
                }}
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
  )
}

function pickTallestIntegratedCell(
  layer: BlueprintLayer,
  cells: IntegratedBlueprintCell[],
  compact: boolean,
): IntegratedBlueprintCell {
  return cells.reduce((tallest, cell) =>
    getCellContentMinHeight(layer, cell.content, compact) >
    getCellContentMinHeight(layer, tallest.content, compact)
      ? cell
      : tallest,
  )
}

function IntegratedVisualCell({
  layer,
  step,
  stepIndex,
  slotCells,
  laneStyle,
  compact = false,
  fitVertically,
  flushBottom,
  scenarioName,
  pathNameById,
  pathDescriptionById,
  visualPictures,
}: {
  layer: BlueprintLayer
  step: IntegratedBlueprintStep
  stepIndex: number
  slotCells: IntegratedBlueprintCell[]
  laneStyle: BlueprintLayerStyle
  compact?: boolean
  fitVertically?: boolean
  flushBottom?: boolean
  scenarioName?: string
  pathNameById: Map<string, string>
  pathDescriptionById: Map<string, string | null>
  visualPictures: readonly string[]
}) {
  const shellPadding = cn(
    compact ? 'px-3' : 'px-3.5',
    compact ? 'pt-3' : 'pt-4',
    flushBottom ? 'pb-0' : compact ? 'pb-3' : 'pb-4',
  )
  const representative =
    slotCells.length === 0
      ? undefined
      : [...slotCells].sort((a, b) => b.opacity - a.opacity)[0]
  const displayOpacity =
    representative !== undefined
      ? getIntegratedCellDisplayOpacity(representative, step)
      : undefined
  const selectionContext: BlueprintCellSelectionContext | undefined =
    scenarioName
      ? {
          scenarioName,
          layerName: layer.name,
          stepId: step.id,
          stepName: step.name,
          stepIndex,
          cellId: representative?.id ?? `visual-${step.id}`,
          cellContent: '',
          pathId: representative?.path_id ?? 'visual',
          pathName:
            (representative
              ? pathNameById.get(representative.path_id)
              : undefined) ?? '',
          pathDescription: representative
            ? (pathDescriptionById.get(representative.path_id) ?? null)
            : null,
          pathType: (representative?.path_type ?? 'happy') as PathType,
        }
      : undefined

  const shellClassName = cn(
    'relative z-[1] flex shrink-0 items-stretch self-stretch min-w-0 overflow-hidden',
    shellPadding,
    fitVertically && 'h-full',
  )
  const shellVerticalPad = compact ? 24 : 32
  const shellStyle = {
    width: STEP_COLUMN_WIDTH,
    minWidth: STEP_COLUMN_WIDTH,
    maxWidth: STEP_COLUMN_WIDTH,
    maxHeight: getVisualCellButtonMaxHeight(compact) + shellVerticalPad,
  }
  const visual = (
    <div className="flex h-full min-h-0 max-h-full w-full flex-1 overflow-hidden">
      <BlueprintStepVisual
        compact={compact}
        fill={laneStyle.lane}
        pictures={visualPictures}
        selection={
          selectionContext
            ? buildBlueprintCellSelection(selectionContext)
            : undefined
        }
        cellId={representative?.id ?? `visual-${step.id}`}
        stepIndex={stepIndex}
        opacity={displayOpacity}
        className="flex-1"
      />
    </div>
  )

  return (
    <div className={shellClassName} style={shellStyle}>
      {visual}
    </div>
  )
}

function IntegratedCellSlot({
  layer,
  step,
  stepIndex,
  slotCells,
  laneStyle,
  variant,
  width,
  compact = false,
  fitVertically,
  flushBottom,
  scenarioName,
  pathNameById,
  pathDescriptionById,
}: {
  layer: BlueprintLayer
  step: IntegratedBlueprintStep
  stepIndex: number
  slotCells: IntegratedBlueprintCell[]
  laneStyle: BlueprintLayerStyle
  variant: 'default' | 'pills'
  width: number
  compact?: boolean
  fitVertically?: boolean
  flushBottom?: boolean
  scenarioName?: string
  pathNameById: Map<string, string>
  pathDescriptionById: Map<string, string | null>
}) {
  const shellStyle = {
    width,
    minWidth: width,
    maxWidth: width,
  }

  const sortedCells = [...slotCells].sort(
    (a, b) => b.opacity - a.opacity,
  )
  const stacked = sortedCells.length > 1
  const sizingCell = stacked
    ? pickTallestIntegratedCell(layer, sortedCells, compact)
    : sortedCells[0]
  const overlayCells = stacked
    ? sortedCells.filter((cell) => cell.id !== sizingCell.id)
    : []

  return (
    <div
      className={cn(
        'relative flex min-w-0 shrink-0 items-stretch self-stretch',
        fitVertically && 'h-full',
      )}
      style={shellStyle}
    >
      <IntegratedCellBlock
        key={sizingCell.id}
        step={step}
        stepIndex={stepIndex}
        layerName={layer.name}
        cell={sizingCell}
        laneStyle={laneStyle}
        variant={variant}
        compact={compact}
        fitVertically={fitVertically}
        flushBottom={flushBottom}
        stacked={false}
        scenarioName={scenarioName}
        pathNameById={pathNameById}
        pathDescriptionById={pathDescriptionById}
      />
      {overlayCells.map((cell) => (
        <IntegratedCellBlock
          key={cell.id}
          step={step}
          stepIndex={stepIndex}
          layerName={layer.name}
          cell={cell}
          laneStyle={laneStyle}
          variant={variant}
          compact={compact}
          fitVertically={fitVertically}
          flushBottom={flushBottom}
          stacked
          scenarioName={scenarioName}
          pathNameById={pathNameById}
          pathDescriptionById={pathDescriptionById}
        />
      ))}
    </div>
  )
}

function IntegratedCellBlock({
  step,
  stepIndex,
  layerName,
  cell,
  laneStyle,
  variant,
  compact,
  fitVertically,
  flushBottom,
  stacked,
  scenarioName,
  pathNameById,
  pathDescriptionById,
}: {
  step: IntegratedBlueprintStep
  stepIndex: number
  layerName: string
  cell: IntegratedBlueprintCell
  laneStyle: BlueprintLayerStyle
  variant: 'default' | 'pills'
  compact?: boolean
  fitVertically?: boolean
  flushBottom?: boolean
  stacked?: boolean
  scenarioName?: string
  pathNameById: Map<string, string>
  pathDescriptionById: Map<string, string | null>
}) {
  const displayOpacity = getIntegratedCellDisplayOpacity(cell, step)
  const shellPadding = cn(
    compact ? 'px-3' : 'px-3.5',
    compact ? 'pt-3' : 'pt-4',
    flushBottom ? 'pb-0' : compact ? 'pb-3' : 'pb-4',
  )
  const width = STEP_COLUMN_WIDTH
  const shellStyle = {
    width,
    minWidth: width,
    maxWidth: width,
  }
  const shellClass = cn(
    stacked
      ? 'absolute inset-0 flex min-h-0 min-w-0 items-stretch overflow-visible'
      : 'relative z-[1] flex shrink-0 items-stretch self-stretch min-w-0',
    shellPadding,
  )

  const selectionContext: BlueprintCellSelectionContext | undefined =
    scenarioName
      ? {
          scenarioName,
          layerName,
          stepId: cell.step_id,
          stepName: step.name,
          stepIndex,
          cellId: cell.id,
          cellContent: cell.content,
          cellPicture: cell.picture ?? null,
          cellDescription: cell.description ?? null,
          cellLinks: cell.links,
          pathId: cell.path_id,
          pathName: pathNameById.get(cell.path_id) ?? 'Unknown path',
          pathDescription: pathDescriptionById.get(cell.path_id) ?? null,
          pathType: cell.path_type,
        }
      : undefined

  const stackedStyle = stacked
    ? { zIndex: displayOpacity >= 1 ? 2 : 1 }
    : undefined

  const innerContent =
    variant === 'pills' ? (
      <div
        data-blueprint-cell={cell.id}
        data-step-index={stepIndex}
        className={cn(
          'flex w-full min-w-0 flex-1 flex-col items-stretch',
          stacked && 'h-full min-h-0 overflow-y-auto blueprint-scroll',
          compact ? 'gap-2' : 'gap-2.5',
        )}
      >
        {getTechPillItems(cell.content).map((item, index) =>
          selectionContext ? (
            <BlueprintTechPill
              key={`${item}-${index}`}
              item={item}
              selectionContext={selectionContext}
              stepIndex={stepIndex}
              compact={compact}
              opacity={displayOpacity}
            />
          ) : (
            <TechPillFace
              key={`${item}-${index}`}
              item={item}
              compact={compact}
              opacity={displayOpacity}
              className="min-w-0 shrink-0 break-words"
            />
          ),
        )}
      </div>
    ) : (
      <BlueprintCellButton
        fill={laneStyle.lane}
        compact={compact}
        opacity={displayOpacity}
        selection={
          selectionContext
            ? buildBlueprintCellSelection(selectionContext)
            : undefined
        }
        cellId={cell.id}
        stepIndex={stepIndex}
        className={cn(
          'box-border min-w-0',
          stacked && 'h-full min-h-0',
          (fitVertically || stacked) &&
            'min-h-0 overflow-y-auto blueprint-scroll',
        )}
      >
        <p className="w-full min-w-0 break-words whitespace-pre-wrap">
          {cell.content}
        </p>
      </BlueprintCellButton>
    )

  return (
    <div
      className={shellClass}
      style={{ ...shellStyle, ...stackedStyle }}
    >
      {innerContent}
    </div>
  )
}

