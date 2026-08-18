import { Fragment, useMemo, useRef, type RefObject } from 'react'
import { BlueprintColumnHandles } from '@/components/blueprint/BlueprintColumnHandles'
import { BlueprintLaneHandles } from '@/components/blueprint/BlueprintLaneHandles'
import { BlueprintEmptyCellSlot } from '@/components/blueprint/BlueprintEmptyCellSlot'
import { CompareLaneRowShell } from '@/components/blueprint/CompareLaneRowShell'
import { CompareCellBlock } from '@/components/blueprint/CompareCellBlock'
import {
  BlueprintDividerRow,
  BlueprintLabelRow,
  BlueprintStickyLabelBackdrop,
  BlueprintSwimLaneDivider,
} from '@/components/blueprint/BlueprintLabelRail'
import { ComparePathSectionFrame } from '@/components/blueprint/ComparePathSectionFrame'
import { IntegratedTriggerArrows } from '@/components/blueprint/IntegratedTriggerArrows'
import { BlueprintVisualPlayButton } from '@/components/blueprint/BlueprintVisualPlayButton'
import {
  BLUEPRINT_LAYER_ROW_GAP,
  STEP_COLUMN_GAP,
  STEP_COLUMN_WIDTH,
  hasBlueprintCellContent,
  layerPrecedesBlueprintDivider,
  shouldUsePillCellContent,
  shouldUseVisualContent,
} from '@/lib/blueprintLayout'
import { buildCellLookup, getCellAt, getCellsAt } from '@/lib/normalizeBlueprint'
import {
  getBlueprintLayerStyle,
  getBlueprintLayerZone,
} from '@/lib/blueprintTheme'
import type { CompareGridTrack } from '@/lib/compareGridTracks'
import {
  COMPARE_PATH_SECTION_BOTTOM_INSET,
  COMPARE_PATH_SECTION_INSET,
  COMPARE_PATH_SECTION_TOP_INSET,
  COMPARE_STACKED_HEADER_GAP,
  type BlueprintLabelRowSpec,
  getComparePathArrowData,
  resolveBlueprintLayer,
} from '@/lib/sideBySideCompareLayout'
import { cn } from '@/lib/utils'
import { resolveVisualStepPictureEntries } from '@/lib/visualWalkthrough'
import { isBlueprintVisualWalkthroughEnabled } from '@/lib/blueprintDisplayFlags'
import { buildVisualWalkthroughSession } from '@/lib/visualWalkthrough'
import type { BlueprintData, BlueprintStep } from '@/types/blueprint'

/** Left gutter on the white board so the play control clears Visual cells. */
const VISUAL_PLAY_GUTTER = 28

/**
 * How one band is placed inside its parent grid.
 *
 * - `column`: the horizontal (overview) arrangement — the band is one grid
 *   COLUMN whose row tracks come from the parent via `gridTemplateRows:
 *   subgrid`, so lane rows stay aligned across paths.
 * - `row`: the stacked (focused scenario) arrangement — the band is one grid
 *   ROW whose column tracks come from the parent via `gridTemplateColumns:
 *   subgrid` (one canonical step axis shared by every band), and the band
 *   owns its lane-row tracks.
 */
export type PathBandArrangement =
  | { kind: 'column'; columnIndex: number; withLaneHandles: boolean }
  | {
      kind: 'row'
      gridRow: number
      tracks: readonly CompareGridTrack[]
      rowTrackCss: string
      marginTop?: number
      onToggleLayer?: (layerId: string) => void
    }

type BlueprintPathBandProps = {
  blueprint: BlueprintData
  layers: BlueprintData['layers']
  rows: BlueprintLabelRowSpec[]
  arrangement: PathBandArrangement
  compact?: boolean
  scrollContainerRef?: RefObject<HTMLDivElement | null>
  scenarioName?: string
  phaseName?: string
  showPathTypeBadge?: boolean
  fillSwimlaneHeight?: boolean
  /** Extend the section frame upward to wrap the step-header row (px). */
  frameExtraTopInset?: number
}

/**
 * One path's full lane-row band — section frame, trigger arrows, design-mode
 * handles and the cells themselves. Both compare arrangements compose this
 * component; only the placement (`arrangement`) differs. The rendering of a
 * cell is identical in both, down to its `data-blueprint-cell` anchors.
 */
export function BlueprintPathBand({
  blueprint,
  layers,
  rows,
  arrangement,
  compact,
  frameExtraTopInset,
  scrollContainerRef,
  scenarioName,
  phaseName,
  showPathTypeBadge = false,
  fillSwimlaneHeight = false,
}: BlueprintPathBandProps) {
  const bandRef = useRef<HTMLDivElement>(null)
  const fallbackScrollRef = useRef<HTMLDivElement>(null)
  const resolvedScrollRef = scrollContainerRef ?? fallbackScrollRef
  const arrowData = useMemo(
    () => getComparePathArrowData(blueprint),
    [blueprint],
  )
  // A fresh array literal here re-runs the overlay's whole observer setup on
  // every render, and `observe()` fires immediately — which renders again.
  const arrowPaths = useMemo(() => [blueprint.path], [blueprint.path])
  const showPlay =
    isBlueprintVisualWalkthroughEnabled() &&
    buildVisualWalkthroughSession(blueprint).steps.length > 0
  // The stacked arrangement cannot shift cells right for the play control —
  // cells must stay on the canonical column tracks — so the control hangs in
  // the rail gap instead (see CompareLayerRow).
  const playGutter =
    showPlay && arrangement.kind === 'column' ? VISUAL_PLAY_GUTTER : 0

  const placementStyle =
    arrangement.kind === 'column'
      ? {
          gridColumn: arrangement.columnIndex,
          gridRow: `1 / ${rows.length + 1}`,
          gridTemplateRows: 'subgrid',
        }
      : {
          gridRow: arrangement.gridRow,
          gridColumn: '1 / -1',
          gridTemplateColumns: 'subgrid',
          gridTemplateRows: arrangement.rowTrackCss,
          // Do NOT rely on gap inheritance into the subgrid — explicit here.
          columnGap: STEP_COLUMN_GAP,
          rowGap: BLUEPRINT_LAYER_ROW_GAP,
          marginTop: arrangement.marginTop,
        }

  return (
    <div
      ref={bandRef}
      className="relative z-0 grid overflow-visible"
      style={placementStyle}
    >
      <BlueprintColumnHandles
        steps={blueprint.steps}
        bodyRef={bandRef}
        pathId={blueprint.path.id}
      />
      {/* Lanes are scenario-wide, so the horizontal arrangement carries one
          set of handles on its first band; stacked bands are vertically
          disjoint, so each carries its own. */}
      {arrangement.kind === 'column' ? (
        arrangement.withLaneHandles ? (
          <BlueprintLaneHandles bodyRef={bandRef} />
        ) : null
      ) : (
        <BlueprintLaneHandles bodyRef={bandRef} />
      )}
      <ComparePathSectionFrame
        blueprint={blueprint}
        compact={compact}
        showPathTypeBadge={showPathTypeBadge}
        extraTopInset={frameExtraTopInset}
      />
      {arrangement.kind === 'row' ? (
        <>
          {/* The label rail re-emits per band: every band names its own
              lanes, in DOM order matching the path order. */}
          {/* Bleed the rail to the frame's own edges: up through the gap
              under the header (wrapped frames) or the plain top inset, and
              down through the bottom inset — no white L-gaps inside the
              frame. */}
          <BlueprintStickyLabelBackdrop
            rowCount={rows.length}
            bleedTop={
              frameExtraTopInset
                ? COMPARE_STACKED_HEADER_GAP
                : COMPARE_PATH_SECTION_TOP_INSET - 3
            }
            // Inset minus the frame's border (≤3px): the rail meets the
            // border's inner edge, never paints over it.
            bleedBottom={COMPARE_PATH_SECTION_BOTTOM_INSET - 3}
            bleedLeft={COMPARE_PATH_SECTION_INSET - 3}
          />
          {rows.map((row, rowIndex) =>
            row.kind === 'interaction' ||
            row.kind === 'visibility' ||
            row.kind === 'internalInteraction' ? (
              <BlueprintDividerRow
                key={`rail-${row.key}`}
                rowIndex={rowIndex}
                label={row.label}
                lineStyle={
                  row.kind === 'interaction'
                    ? 'dashed'
                    : row.kind === 'internalInteraction'
                      ? 'dotted'
                      : 'solid'
                }
              />
            ) : (
              <Fragment key={`rail-${row.key}`}>
                <BlueprintLabelRow
                  row={row}
                  layers={layers}
                  compact={compact}
                  onToggleLayer={arrangement.onToggleLayer}
                  style={{
                    gridColumn: 1,
                    gridRow: rowIndex + 1,
                    alignSelf: 'start',
                    height: '100%',
                  }}
                />
                {row.showDividerBelow ? (
                  <BlueprintSwimLaneDivider rowIndex={rowIndex} />
                ) : null}
              </Fragment>
            ),
          )}
        </>
      ) : null}
      <IntegratedTriggerArrows
        layer="forward"
        triggers={arrowData.triggers}
        cells={arrowData.cells}
        steps={arrowData.steps}
        paths={arrowPaths}
        contentRef={bandRef}
        scrollContainerRef={resolvedScrollRef}
      />
      {rows.map((row, rowIndex) => (
        <CompareCardRow
          key={row.key}
          row={row}
          rowIndex={rowIndex}
          blueprint={blueprint}
          layers={layers}
          compact={compact}
          scenarioName={scenarioName}
          phaseName={phaseName}
          fillSwimlaneHeight={fillSwimlaneHeight}
          playGutter={playGutter}
          showPlay={showPlay}
          stackedTracks={
            arrangement.kind === 'row' ? arrangement.tracks : undefined
          }
        />
      ))}
      <IntegratedTriggerArrows
        layer="wrap"
        triggers={arrowData.triggers}
        cells={arrowData.cells}
        steps={arrowData.steps}
        paths={arrowPaths}
        contentRef={bandRef}
        scrollContainerRef={resolvedScrollRef}
      />
    </div>
  )
}

function CompareCardRow({
  row,
  rowIndex,
  blueprint,
  layers,
  compact,
  scenarioName,
  phaseName,
  fillSwimlaneHeight = false,
  playGutter = 0,
  showPlay = false,
  stackedTracks,
}: {
  row: BlueprintLabelRowSpec
  rowIndex: number
  blueprint: BlueprintData
  layers: BlueprintData['layers']
  compact?: boolean
  scenarioName?: string
  phaseName?: string
  fillSwimlaneHeight?: boolean
  playGutter?: number
  showPlay?: boolean
  stackedTracks?: readonly CompareGridTrack[]
}) {
  return (
    <CompareLaneRowShell
      row={row}
      rowIndex={rowIndex}
      cellTracksOnly={stackedTracks !== undefined}
    >
      {row.layer ? (
        <CompareLayerRow
          blueprint={blueprint}
          layer={row.layer}
          layers={layers}
          compact={compact}
          scenarioName={scenarioName}
          phaseName={phaseName}
          fillSwimlaneHeight={fillSwimlaneHeight}
          playGutter={playGutter}
          showPlay={showPlay}
          stackedTracks={stackedTracks}
        />
      ) : null}
    </CompareLaneRowShell>
  )
}

function CompareLayerRow({
  blueprint,
  layer,
  layers,
  compact,
  scenarioName,
  phaseName,
  fillSwimlaneHeight = false,
  playGutter = 0,
  showPlay = false,
  stackedTracks,
}: {
  blueprint: BlueprintData
  layer: BlueprintData['layers'][number]
  layers: BlueprintData['layers']
  compact?: boolean
  scenarioName?: string
  phaseName?: string
  fillSwimlaneHeight?: boolean
  playGutter?: number
  showPlay?: boolean
  stackedTracks?: readonly CompareGridTrack[]
}) {
  const blueprintLayer = useMemo(
    () => resolveBlueprintLayer(layer, blueprint),
    [blueprint, layer],
  )
  const cellLookup = useMemo(
    () => buildCellLookup(blueprint.cells),
    [blueprint.cells],
  )
  const stepIndexById = useMemo(
    () => new Map(blueprint.steps.map((step, index) => [step.id, index])),
    [blueprint.steps],
  )
  const isPillLayer = shouldUsePillCellContent(layer)
  const laneStyle = getBlueprintLayerStyle(
    layer.name,
    getBlueprintLayerZone(layer, layers),
    layer.role,
  )
  const flushBottom = layerPrecedesBlueprintDivider(layer, layers)
  const isVisualLayer = shouldUseVisualContent(layer)
  const renderPlay =
    showPlay && isVisualLayer && (playGutter > 0 || stackedTracks !== undefined)

  const renderStepCell = (step: BlueprintStep, stepIndex: number) => {
    const cell = getCellAt(cellLookup, blueprintLayer.id, step.id)
    // Tech slots hold one cell per touchpoint since the split.
    const slotCells = isPillLayer
      ? getCellsAt(cellLookup, blueprintLayer.id, step.id)
      : undefined
    const variant = isVisualLayer ? 'visual' : isPillLayer ? 'pills' : 'default'
    const visualPictures = isVisualLayer
      ? resolveVisualStepPictureEntries(blueprint, step.id)
      : undefined
    const showCell = isVisualLayer
      ? (visualPictures?.length ?? 0) > 0
      : isPillLayer
        ? (slotCells ?? []).some((entry) =>
            hasBlueprintCellContent(entry.content, variant),
          )
        : hasBlueprintCellContent(cell?.content, variant)

    if (!showCell) {
      // Empty in Edit mode is not nothing: it is where a cell can go.
      // Outside Edit it stays the inert spacer it has always been.
      return (
        <BlueprintEmptyCellSlot
          pathId={blueprint.path.id}
          layerId={blueprintLayer.id}
          stepId={step.id}
          layerName={layer.name}
          stepName={step.name}
          stepIndex={stepIndex}
          scenarioName={scenarioName}
          phaseName={phaseName}
          width={STEP_COLUMN_WIDTH}
          selfStretch
        />
      )
    }

    return (
      <CompareCellBlock
        cellId={cell?.id ?? (isVisualLayer ? `visual-${step.id}` : undefined)}
        stepIndex={stepIndex}
        content={cell?.content}
        laneStyle={laneStyle}
        variant={variant}
        compact={compact}
        flushBottom={flushBottom}
        visualPictures={visualPictures}
        slotCells={slotCells}
        selectionContext={
          scenarioName && (cell?.id || isVisualLayer)
            ? {
                scenarioName,
                phaseName,
                layerName: layer.name,
                stepId: step.id,
                stepName: step.name,
                stepIndex,
                cellId: cell?.id ?? `visual-${step.id}`,
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
    )
  }

  const playButton = renderPlay ? (
    <div
      className="pointer-events-auto absolute z-50"
      style={{
        // Stacked bands keep cells on the canonical tracks, so the play
        // control hangs in the rail gap to their left instead of a gutter.
        left: stackedTracks ? -(STEP_COLUMN_GAP + 2) : 6,
        top: compact ? 10 : 14,
      }}
    >
      <BlueprintVisualPlayButton
        blueprint={blueprint}
        scenarioName={scenarioName}
        phaseName={phaseName}
      />
    </div>
  ) : null

  if (stackedTracks) {
    // Stacked arrangement: same fixed cell widths and gaps as the canonical
    // column tracks, so a flex row lines up with the parent grid exactly.
    // Columns this path lacks hold inert spacers (not `BlueprintEmptyCellSlot`
    // — that is an edit-mode drop target for steps the path actually has).
    const pathId = blueprint.path.id
    const stepById = new Map(blueprint.steps.map((step) => [step.id, step]))

    return (
      <div
        className={cn(
          'relative flex items-stretch rounded-sm',
          fillSwimlaneHeight ? 'h-full min-h-0 w-full' : 'shrink-0',
        )}
        style={{ backgroundColor: 'transparent' }}
      >
        {playButton}
        {stackedTracks.map((track, trackIndex) => {
          const gapSpacer = (stepIndex?: number) =>
            trackIndex < stackedTracks.length - 1 ? (
              <div
                aria-hidden
                className="shrink-0"
                style={{ width: STEP_COLUMN_GAP, minWidth: STEP_COLUMN_GAP }}
                {...(stepIndex !== undefined &&
                stepIndex < blueprint.steps.length - 1
                  ? { 'data-step-gap': stepIndex }
                  : {})}
              />
            ) : null

          const stepId = track.stepIdByPath[pathId]
          const step = stepId !== undefined ? stepById.get(stepId) : undefined
          const stepIndex =
            stepId !== undefined ? stepIndexById.get(stepId) : undefined

          return (
            <Fragment key={track.key}>
              {step !== undefined && stepIndex !== undefined ? (
                renderStepCell(step, stepIndex)
              ) : (
                <div
                  aria-hidden
                  data-compare-column-spacer=""
                  className="shrink-0"
                  style={{
                    width: STEP_COLUMN_WIDTH,
                    minWidth: STEP_COLUMN_WIDTH,
                  }}
                />
              )}
              {gapSpacer(stepIndex)}
            </Fragment>
          )
        })}
      </div>
    )
  }

  return (
    <div
      className={cn(
        'relative flex items-stretch rounded-sm',
        fillSwimlaneHeight ? 'h-full min-h-0 w-full' : 'shrink-0',
      )}
      style={{
        backgroundColor: 'transparent',
        paddingLeft: playGutter || undefined,
      }}
    >
      {playButton}
      {blueprint.steps.map((step, stepIndex) => (
        <Fragment key={`${layer.id}-${step.id}`}>
          {renderStepCell(step, stepIndex)}
          {stepIndex < blueprint.steps.length - 1 && (
            <div
              aria-hidden
              className="shrink-0"
              style={{ width: STEP_COLUMN_GAP, minWidth: STEP_COLUMN_GAP }}
              data-step-gap={stepIndex}
            />
          )}
        </Fragment>
      ))}
    </div>
  )
}
