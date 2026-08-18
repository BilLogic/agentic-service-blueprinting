import { Fragment, useMemo, type RefObject } from 'react'
import { BlueprintPathBand } from '@/components/blueprint/BlueprintPathBand'
import {
  BlueprintDividerRow,
  BlueprintLabelRow,
  BlueprintStickyLabelBackdrop,
  BlueprintSwimLaneDivider,
} from '@/components/blueprint/BlueprintLabelRail'
import { useCollapsedBlueprintLayers } from '@/hooks/useCollapsedBlueprintLayers'
import { BLUEPRINT_LAYER_ROW_GAP } from '@/lib/blueprintLayout'
import {
  COMPARE_CARD_GAP,
  COMPARE_LABEL_WIDTH,
  getCompareBoardWrapperPadding,
  buildSideBySideLabelRowSpecs,
  getCanonicalLayers,
  getCompareCardWidth,
  expandRowSpecsToSwimlaneBodyHeight,
  getCompareRowTrackCss,
  COMPARE_PATH_SECTION_TOP_INSET,
  COMPARE_PATH_SECTION_BOTTOM_INSET,
} from '@/lib/sideBySideCompareLayout'
import { cn } from '@/lib/utils'
import type { BlueprintData } from '@/types/blueprint'

type SideBySideCompareGridProps = {
  blueprints: BlueprintData[]
  className?: string
  compact?: boolean
  scrollContainerRef?: RefObject<HTMLDivElement | null>
  scenarioName?: string
  phaseName?: string
  /** When set, scenario title sits on the gray panel edge; path frames show path type. */
  sectionTitleLabel?: string
  sectionTitleDescription?: string | null
  /** Shared swimlane board height for phase overview alignment. */
  fixedSwimlaneBodyHeight?: number
  fillSwimlaneHeight?: boolean
}

/**
 * Side-by-side comparison is a general primitive: it renders ANY set of
 * labeled blueprint variants (paths) as columns — "designed vs. reality" is
 * just one possible labeling, not an assumption. Column order follows the
 * caller's `blueprints` array (path-selection activation order upstream; see
 * `itemsInSelectionOrder`), and each column is labeled with its own path's
 * `name` and `description` (`PathLabelBadge`) with `path_type` driving only
 * the frame styling. No path ids, path names, or fixed variant pairs are
 * hardcoded here or in `sideBySideCompareLayout.ts`.
 *
 * This is the horizontal ARRANGEMENT of `BlueprintPathBand` — overview rows
 * keep it for the shared-row-height contract. The focused scenario view
 * arranges the same bands vertically (`StackedCompareGrid`).
 */
export function SideBySideCompareGrid({
  blueprints,
  className,
  compact = false,
  scrollContainerRef: scrollContainerRefProp,
  scenarioName,
  phaseName,
  sectionTitleLabel,
  fixedSwimlaneBodyHeight,
  fillSwimlaneHeight = false,
}: SideBySideCompareGridProps) {
  const { collapsedLayerIds, toggleLayer } = useCollapsedBlueprintLayers()
  const layers = useMemo(() => getCanonicalLayers(blueprints), [blueprints])

  const rows = useMemo(() => {
    const specs = buildSideBySideLabelRowSpecs(
      blueprints,
      compact,
      collapsedLayerIds,
    )

    if (fixedSwimlaneBodyHeight !== undefined) {
      return expandRowSpecsToSwimlaneBodyHeight(specs, fixedSwimlaneBodyHeight)
    }

    return specs
  }, [blueprints, collapsedLayerIds, compact, fixedSwimlaneBodyHeight])

  const bodyRowTrackSizes = useMemo(
    () =>
      rows
        .map((row) =>
          getCompareRowTrackCss(row),
        )
        .join(' '),
    [rows],
  )

  const gridTemplateColumns = useMemo(
    () =>
      `${COMPARE_LABEL_WIDTH}px ${blueprints
        .map(
          (blueprint) =>
            `${getCompareCardWidth(blueprint.steps.length, compact)}px`,
        )
        .join(' ')}`,
    [blueprints, compact],
  )

  const showPathTypeBadge = Boolean(sectionTitleLabel)

  if (blueprints.length === 0) {
    return (
      <p className="p-6 text-sm text-muted-foreground">
        Select at least one path to compare.
      </p>
    )
  }

  return (
    <div
      className={cn('w-max shrink-0', className)}
      style={getCompareBoardWrapperPadding()}
    >
      <div
        className="relative grid w-max"
        style={{
          gridTemplateColumns,
          gridTemplateRows: bodyRowTrackSizes,
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
              lineStyle={
                row.kind === 'interaction'
                  ? 'dashed'
                  : row.kind === 'internalInteraction'
                    ? 'dotted'
                    : 'solid'
              }
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
        {blueprints.map((blueprint, columnIndex) => (
          <BlueprintPathBand
            key={blueprint.path.id}
            blueprint={blueprint}
            layers={layers}
            rows={rows}
            // The grid reserves column 1 for the label rail.
            arrangement={{
              kind: 'column',
              columnIndex: columnIndex + 2,
              withLaneHandles: columnIndex === 0,
            }}
            compact={compact}
            scrollContainerRef={scrollContainerRefProp}
            scenarioName={scenarioName}
            phaseName={phaseName}
            showPathTypeBadge={showPathTypeBadge}
            fillSwimlaneHeight={fillSwimlaneHeight}
          />
        ))}
      </div>
    </div>
  )
}
