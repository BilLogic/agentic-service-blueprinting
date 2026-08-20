import { Fragment, useMemo, useRef, type RefObject } from 'react'
import {
  BlueprintDividerRow,
  BlueprintLabelRow,
  BlueprintStickyLabelBackdrop,
  BlueprintSwimLaneDivider,
} from '@/components/blueprint/BlueprintLabelRail'
import {
  CompareCellBlock,
  type CompareCellPathMembership,
} from '@/components/blueprint/CompareCellBlock'
import { CompareLaneRowShell } from '@/components/blueprint/CompareLaneRowShell'
import { CompareStepHeaderRow } from '@/components/blueprint/CompareTrackDecorations'
import { IntegratedTriggerArrows } from '@/components/blueprint/IntegratedTriggerArrows'
import { PathLabelBadge } from '@/components/blueprint/PathLabelBadge'
import { useCompareGridAxis } from '@/hooks/useCompareGridAxis'
import {
  BLUEPRINT_LAYER_ROW_GAP,
  STEP_COLUMN_GAP,
  STEP_COLUMN_WIDTH,
  hasBlueprintCellContent,
  layerPrecedesBlueprintDivider,
  shouldUsePillCellContent,
  shouldUseVisualContent,
  type BlueprintCellVariant,
} from '@/lib/blueprintLayout'
import {
  blueprintPanelSectionFillColor,
  getBlueprintLayerStyle,
  getBlueprintLayerZone,
  type BlueprintLayerStyle,
} from '@/lib/blueprintTheme'
import type { CompareGridTrack } from '@/lib/compareGridTracks'
import {
  assembleMergedSlot,
  buildMergedArrowRemap,
  remapMergedPathTriggers,
  type MergedSlotAssembly,
  type MergedSlotCandidate,
  type MergedSubCell,
} from '@/lib/compareMergedGrid'
import {
  makeSlotKey,
  normalizeCompareName,
  type CompareModel,
} from '@/lib/compareSlots'
import {
  COMPARE_LABEL_WIDTH,
  COMPARE_PATH_SECTION_BOTTOM_INSET,
  COMPARE_PATH_SECTION_INSET,
  COMPARE_PATH_SECTION_TOP_INSET,
  COMPARE_STACKED_HEADER_GAP,
  COMPARE_STEP_HEADER_HEIGHT,
  getComparePathArrowData,
  getCompareBoardWrapperPadding,
  getMergedCompareRowTrackCss,
  resolveBlueprintLayer,
} from '@/lib/sideBySideCompareLayout'
import { getPathColor } from '@/lib/pathColorTheme'
import { resolveVisualStepPictureEntries } from '@/lib/visualWalkthrough'
import { cn } from '@/lib/utils'
import type {
  BlueprintCell,
  BlueprintData,
  BlueprintLayer,
  BlueprintStep,
} from '@/types/blueprint'

type MergedCompareGridProps = {
  /** In selection order — the order sub-cells stack in and the legend reads. */
  blueprints: BlueprintData[]
  /** The compare model owned by `ScenarioBlueprintPanel`; merged only mounts
   *  once it exists (≥2 paths, all loaded from one refetch generation). */
  model: CompareModel
  className?: string
  compact?: boolean
  scrollContainerRef?: RefObject<HTMLDivElement | null>
  scenarioName?: string
  phaseName?: string
}

/** Everything the grid needs about one compared path, indexed once. */
type MergedPathRuntime = {
  blueprint: BlueprintData
  cellById: Map<string, BlueprintCell>
  stepById: Map<string, BlueprintStep>
  stepIndexById: Map<string, number>
  membership: CompareCellPathMembership
}

/**
 * The MERGED canvas: the compared paths combined into ONE blueprint — one
 * lane set (labels rendered once), one canonical step axis (the same tracks
 * the stacked bands use), and per SLOT (lane × canonical column):
 *
 * - the paths agree ⇒ ONE cell, drawn exactly like a normal blueprint cell,
 *   with every member path represented on its rounded outline
 * - the paths disagree, or only some have anything ⇒ each present path's
 *   cell(s) stack vertically inside that one slot, each carrying a
 *   path-coloured rounded outline; full names are disclosed on hover/focus
 *
 * The slot grows only where the paths disagree, and that vertical swell IS
 * the diff signal — no extra paint beyond the column tint. Every sub-cell
 * keeps its own real `cellId`, so selection, focus/pulse and the agent's
 * cell tools work with no disambiguation.
 *
 * Merged is a READING view: no edit-mode drop targets (an N-path empty slot
 * has no single sensible target) and no column/lane resize handles (a merged
 * column stands for N paths' steps). Authoring stays in Stacked.
 */
export function MergedCompareGrid({
  blueprints,
  model,
  className,
  compact = false,
  scrollContainerRef,
  scenarioName,
  phaseName,
}: MergedCompareGridProps) {
  const bandRef = useRef<HTMLDivElement>(null)
  const fallbackScrollRef = useRef<HTMLDivElement>(null)
  const resolvedScrollRef = scrollContainerRef ?? fallbackScrollRef
  const { layers, rows, toggleLayer, tracks, gridTemplateColumns } =
    useCompareGridAxis(model, blueprints, compact)

  const rowTrackCss = useMemo(
    () => rows.map((row) => getMergedCompareRowTrackCss(row)).join(' '),
    [rows],
  )

  const pathIds = useMemo(
    () => blueprints.map((blueprint) => blueprint.path.id),
    [blueprints],
  )

  const runtimeByPathId = useMemo(() => {
    return new Map<string, MergedPathRuntime>(
      blueprints.map((blueprint) => {
        const { path } = blueprint
        return [
          path.id,
          {
            blueprint,
            cellById: new Map(blueprint.cells.map((cell) => [cell.id, cell])),
            stepById: new Map(blueprint.steps.map((step) => [step.id, step])),
            stepIndexById: new Map(
              blueprint.steps.map((step, index) => [step.id, index]),
            ),
            membership: {
              color: getPathColor(path),
              pathName: path.name,
            },
          },
        ]
      }),
    )
  }, [blueprints])

  /*
    Every slot assembled once, keyed lane × track. One pass feeds both the
    lane rows and the arrow remap, and the assembly is pure
    (`assembleMergedSlot`) so the ordering and the merge rule are unit-tested
    rather than implied by the JSX.
  */
  const assemblyByKey = useMemo(() => {
    const slotByKey = new Map(model.slots.map((slot) => [slot.slotKey, slot]))
    const byKey = new Map<string, MergedSlotAssembly>()
    for (const row of rows) {
      if (row.kind !== 'layer' || !row.layer || row.collapsed) continue
      const layer = row.layer
      const laneKey = normalizeCompareName(layer.name)
      const variant = resolveMergedCellVariant(layer)
      for (const track of tracks) {
        if (track.kind !== 'column') continue
        const slot = slotByKey.get(makeSlotKey(laneKey, track.key))
        const candidates: MergedSlotCandidate[] = []
        for (const pathId of pathIds) {
          const runtime = runtimeByPathId.get(pathId)
          const stepId = track.stepIdByPath[pathId]
          if (!runtime || stepId === undefined) continue
          const entry = slot?.perPath[pathId]
          const cellIds = entry?.present ? entry.cellIds : undefined
          if (variant === 'visual') {
            // A visual lane's face comes from the walkthrough layers' pictures,
            // not from its own cell text, so it merges on the picture set.
            const pictures = resolveVisualStepPictureEntries(
              runtime.blueprint,
              stepId,
            )
            if (pictures.length === 0) continue
            candidates.push({
              pathId,
              stepId,
              cellIds: cellIds ?? [`visual-${stepId}`],
              signature: pictures
                .map((picture) => `${picture.label}=${picture.picture}`)
                .join('\u0000'),
            })
            continue
          }
          if (!entry?.present) continue
          if (
            !entry.contents.some((content) =>
              hasBlueprintCellContent(content, variant),
            )
          ) {
            continue
          }
          candidates.push({
            pathId,
            stepId,
            cellIds: entry.cellIds,
            // Content only: the canvas fork condition is "content differs OR
            // presence differs", so a detail-only difference (V7) merges into
            // one cell here and is reported by the ledger instead.
            signature: entry.fieldSignatures.content,
          })
        }
        byKey.set(
          mergedSlotKey(layer.id, track.key),
          assembleMergedSlot(pathIds, candidates),
        )
      }
    }
    return byKey
  }, [model, pathIds, rows, runtimeByPathId, tracks])

  /*
    Arrows: every path's cells live in ONE container here, so each path gets
    its own overlay pair over that container (the segments already carry the
    path's colour + dash). A shared slot draws one cell, so a hidden path's
    endpoints are remapped onto the drawn cell and a wholly-shared arrow is
    drawn once — both at the data level.
  */
  const arrowDataByPath = useMemo(() => {
    const remap = buildMergedArrowRemap(assemblyByKey.values())
    // After the remap, two paths' triggers can land on the SAME drawn
    // (source, target) pair — subset-shared endpoints alias onto one cell.
    // Draw that edge once: N identical strokes stack into one visually
    // "doubled" arrowhead and say nothing extra.
    const drawnEdges = new Set<string>()
    return blueprints.map((blueprint, index) => {
      const data = getComparePathArrowData(blueprint)
      // Kind + label ride the dedupe key (todo 031): only triggers that
      // draw the SAME edge with the same meaning collapse — two distinct
      // semantics between one remapped pair both survive. They live on
      // the RAW blueprint triggers, so look them up by id.
      const rawById = new Map(blueprint.triggers.map((raw) => [raw.id, raw]))
      const remapped = remapMergedPathTriggers(
        data.triggers,
        remap,
        index === 0,
      )
      const triggers = remapped.filter((trigger) => {
        const raw = rawById.get(trigger.id)
        const key = [
          trigger.source_cell_id,
          trigger.target_cell_id,
          raw?.kind ?? 'trigger',
          raw?.label ?? '',
        ].join(' | ')
        if (drawnEdges.has(key)) return false
        drawnEdges.add(key)
        return true
      })
      return { path: blueprint.path, ...data, triggers }
    })
  }, [assemblyByKey, blueprints])

  return (
    <div
      className={cn('w-max shrink-0', className)}
      style={getCompareBoardWrapperPadding()}
    >
      <div
        className="relative grid w-max"
        style={{
          gridTemplateColumns,
          gridTemplateRows: `${COMPARE_STEP_HEADER_HEIGHT}px auto`,
          columnGap: STEP_COLUMN_GAP,
        }}
      >
        <CompareStepHeaderRow tracks={tracks} />
        <div
          ref={bandRef}
          className="relative z-0 grid overflow-visible"
          style={{
            gridRow: 2,
            gridColumn: '1 / -1',
            gridTemplateColumns: 'subgrid',
            gridTemplateRows: rowTrackCss,
            // Do NOT rely on gap inheritance into the subgrid — explicit here.
            columnGap: STEP_COLUMN_GAP,
            rowGap: BLUEPRINT_LAYER_ROW_GAP,
            marginTop: COMPARE_STACKED_HEADER_GAP,
          }}
        >
          <MergedSectionFrame blueprints={blueprints} compact={compact} />
          {tracks.map(() => null)}
          {/* One lane rail for the whole comparison — the point of merging. */}
          <BlueprintStickyLabelBackdrop
            rowCount={rows.length}
            bleedTop={COMPARE_STACKED_HEADER_GAP}
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
                  onToggleLayer={toggleLayer}
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
          {arrowDataByPath.map((data) => (
            <IntegratedTriggerArrows
              key={`forward-${data.path.id}`}
              layer="forward"
              triggers={data.triggers}
              cells={data.cells}
              steps={data.steps}
              paths={[data.path]}
              contentRef={bandRef}
              scrollContainerRef={resolvedScrollRef}
            />
          ))}
          {rows.map((row, rowIndex) => (
            <CompareLaneRowShell
              key={row.key}
              row={row}
              rowIndex={rowIndex}
              cellTracksOnly
            >
              {row.layer ? (
                <MergedLaneRow
                  layer={row.layer}
                  layers={layers}
                  tracks={tracks}
                  assemblyByKey={assemblyByKey}
                  runtimeByPathId={runtimeByPathId}
                  compact={compact}
                  scenarioName={scenarioName}
                  phaseName={phaseName}
                />
              ) : null}
            </CompareLaneRowShell>
          ))}
          {arrowDataByPath.map((data) => (
            <IntegratedTriggerArrows
              key={`wrap-${data.path.id}`}
              layer="wrap"
              triggers={data.triggers}
              cells={data.cells}
              steps={data.steps}
              paths={[data.path]}
              contentRef={bandRef}
              scrollContainerRef={resolvedScrollRef}
            />
          ))}
        </div>
      </div>
    </div>
  )
}

/** Lane × track — the merged grid's DOM-side slot identity. */
function mergedSlotKey(layerId: string, trackKey: string): string {
  return `${layerId}\u0000${trackKey}`
}

function resolveMergedCellVariant(layer: BlueprintLayer): BlueprintCellVariant {
  return shouldUseVisualContent(layer)
    ? 'visual'
    : shouldUsePillCellContent(layer)
      ? 'pills'
      : 'default'
}

/**
 * The merged board's frame: neutral, because it belongs to no single path.
 * The compared paths are named on its top edge in selection order, each
 * badge carrying the short label its cell rails use.
 */
function MergedSectionFrame({
  blueprints,
  compact,
}: {
  blueprints: BlueprintData[]
  compact?: boolean
}) {
  return (
    <>
      {/* Axis labels stay outside the data boundary in every arrangement. */}
      <div
        aria-hidden
        className="pointer-events-none absolute rounded-xl border-2 border-border"
        style={{
          top: -COMPARE_PATH_SECTION_TOP_INSET,
          left:
            COMPARE_LABEL_WIDTH + STEP_COLUMN_GAP - COMPARE_PATH_SECTION_INSET,
          right: -COMPARE_PATH_SECTION_INSET,
          bottom: -COMPARE_PATH_SECTION_BOTTOM_INSET,
          backgroundColor: blueprintPanelSectionFillColor(),
        }}
      />
      <div
        className="pointer-events-auto absolute z-50 flex max-w-[calc(100%-12px)] items-center gap-1.5"
        style={{
          top: -COMPARE_PATH_SECTION_TOP_INSET,
          left:
            COMPARE_LABEL_WIDTH +
            STEP_COLUMN_GAP +
            COMPARE_PATH_SECTION_INSET +
            2,
          transform: 'translateY(-50%)',
        }}
      >
        {blueprints.map(({ path }) => (
          <PathLabelBadge
            key={path.id}
            name={path.name}
            description={path.description}
            pathType={path.path_type}
            compact={compact}
          />
        ))}
      </div>
    </>
  )
}

/** One lane, merged: the same slot sequence as a stacked band's lane row. */
function MergedLaneRow({
  layer,
  layers,
  tracks,
  assemblyByKey,
  runtimeByPathId,
  compact,
  scenarioName,
  phaseName,
}: {
  layer: BlueprintLayer
  layers: BlueprintLayer[]
  tracks: readonly CompareGridTrack[]
  assemblyByKey: ReadonlyMap<string, MergedSlotAssembly>
  runtimeByPathId: ReadonlyMap<string, MergedPathRuntime>
  compact?: boolean
  scenarioName?: string
  phaseName?: string
}) {
  const laneStyle = getBlueprintLayerStyle(
    layer.name,
    getBlueprintLayerZone(layer, layers),
    layer.role,
  )
  const variant = resolveMergedCellVariant(layer)
  const flushBottom = layerPrecedesBlueprintDivider(layer, layers)

  return (
    <div className="relative flex items-stretch rounded-sm">
      {tracks.map((track, trackIndex) => {
        const isLast = trackIndex === tracks.length - 1
        // The gap element the arrow router measures, indexed in the CANONICAL
        // track space — the same space the sub-cells' `data-step-index`
        // carries. Indexing it per path was the strike-through bug: the
        // router resolves `[data-step-gap="<source's step index>"]`, so a
        // non-primary path's arrow found a gap belonging to a different
        // column — often LEFT of its own source — and the polyline doubled
        // back through the cell it started from.
        const gapSpacer = isLast ? null : (
          <div
            aria-hidden
            className="shrink-0"
            data-step-gap={trackIndex}
            style={{ width: STEP_COLUMN_GAP, minWidth: STEP_COLUMN_GAP }}
          />
        )

        const assembly = assemblyByKey.get(mergedSlotKey(layer.id, track.key))
        const subCells: readonly MergedSubCell[] =
          assembly === undefined || assembly.kind === 'empty'
            ? []
            : assembly.kind === 'shared'
              ? [assembly.representative]
              : assembly.subCells
        const membershipFor = (
          subCell: MergedSubCell,
        ): CompareCellPathMembership[] | undefined => {
          const memberships = subCell.pathIds
            .map((pathId) => runtimeByPathId.get(pathId)?.membership)
            .filter(
              (membership): membership is CompareCellPathMembership =>
                membership !== undefined,
            )
          return memberships.length > 0 ? memberships : undefined
        }

        return (
          <Fragment key={track.key}>
            {subCells.length === 0 ? (
              <div
                aria-hidden
                data-compare-column-spacer=""
                className="shrink-0"
                style={{
                  width: STEP_COLUMN_WIDTH,
                  minWidth: STEP_COLUMN_WIDTH,
                }}
              />
            ) : subCells.length === 1 ? (
              <MergedSubCellBlock
                subCell={subCells[0]}
                runtime={runtimeByPathId.get(subCells[0].pathId)}
                columnIndex={trackIndex}
                layer={layer}
                laneStyle={laneStyle}
                variant={variant}
                compact={compact}
                flushBottom={flushBottom}
                pathMembership={membershipFor(subCells[0])}
                scenarioName={scenarioName}
                phaseName={phaseName}
              />
            ) : (
              <div className="flex shrink-0 flex-col self-start">
                {subCells.map((subCell) => (
                  <MergedSubCellBlock
                    key={`${subCell.pathId}-${subCell.stepId}`}
                    subCell={subCell}
                    runtime={runtimeByPathId.get(subCell.pathId)}
                    columnIndex={trackIndex}
                    layer={layer}
                    laneStyle={laneStyle}
                    variant={variant}
                    compact={compact}
                    flushBottom={flushBottom}
                    pathMembership={membershipFor(subCell)}
                    scenarioName={scenarioName}
                    phaseName={phaseName}
                  />
                ))}
              </div>
            )}
            {gapSpacer}
          </Fragment>
        )
      })}
    </div>
  )
}

/** One path's contribution to a merged slot — a normal compare cell face. */
function MergedSubCellBlock({
  subCell,
  runtime,
  columnIndex,
  layer,
  laneStyle,
  variant,
  compact,
  flushBottom,
  pathMembership,
  scenarioName,
  phaseName,
}: {
  subCell: MergedSubCell
  runtime: MergedPathRuntime | undefined
  /** Canonical track index — the LAYOUT column, see `stepIndex` below. */
  columnIndex: number
  layer: BlueprintLayer
  laneStyle: BlueprintLayerStyle
  variant: BlueprintCellVariant
  compact?: boolean
  flushBottom?: boolean
  /** One entry per member path of this rendered sub-cell. */
  pathMembership?: readonly CompareCellPathMembership[]
  scenarioName?: string
  phaseName?: string
}) {
  if (!runtime) return null
  const { blueprint } = runtime
  const step = runtime.stepById.get(subCell.stepId)
  /*
    Two indices, and merged is the one arrangement where they differ:

    - `columnIndex` is where the cell SITS. It is what `data-step-index`
      carries, because every consumer of that attribute reasons about layout
      (arrow routing: column adjacency, which gap to route through, which
      cells obstruct a run; marquee selection; column queries). Per-path
      indices there make the router compute geometry for a column the cell
      is not in.
    - `pathStepIndex` is which step of ITS OWN path the cell belongs to. That
      is a fact about the data, so it travels in the selection context, where
      the panel and the agent read it.
  */
  const pathStepIndex = runtime.stepIndexById.get(subCell.stepId)
  if (!step || pathStepIndex === undefined) return null

  const cells = subCell.cellIds
    .map((cellId) => runtime.cellById.get(cellId))
    .filter((cell): cell is BlueprintCell => cell !== undefined)
  const isVisual = variant === 'visual'
  const cell = cells[0]
  const cellId = cell?.id ?? (isVisual ? `visual-${subCell.stepId}` : undefined)
  const visualPictures = isVisual
    ? resolveVisualStepPictureEntries(blueprint, subCell.stepId)
    : undefined

  return (
    <CompareCellBlock
      cellId={cellId}
      stepIndex={columnIndex}
      content={cell?.content}
      laneStyle={laneStyle}
      variant={variant}
      compact={compact}
      flushBottom={flushBottom}
      visualPictures={visualPictures}
      slotCells={variant === 'pills' ? cells : undefined}
      pathMembership={pathMembership}
      selectionContext={
        scenarioName && cellId
          ? {
              scenarioName,
              phaseName,
              // The canonical lane name — lanes are reconciled across paths
              // by normalized name, and this path's own layer is the one the
              // cell actually lives in.
              layerName: resolveBlueprintLayer(layer, blueprint).name,
              stepId: subCell.stepId,
              stepName: step.name,
              stepIndex: pathStepIndex,
              cellId,
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
