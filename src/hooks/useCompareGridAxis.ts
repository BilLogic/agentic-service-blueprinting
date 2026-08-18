import { useMemo } from 'react'
import { useCollapsedBlueprintLayers } from '@/hooks/useCollapsedBlueprintLayers'
import { STEP_COLUMN_WIDTH } from '@/lib/blueprintLayout'
import {
  buildCompareGridTracks,
  type CompareGridTrack,
} from '@/lib/compareGridTracks'
import type { CompareModel } from '@/lib/compareSlots'
import {
  COMPARE_LABEL_WIDTH,
  buildSideBySideLabelRowSpecs,
  getCanonicalLayers,
  type BlueprintLabelRowSpec,
} from '@/lib/sideBySideCompareLayout'
import type { BlueprintData, BlueprintLayer } from '@/types/blueprint'

export type CompareGridAxis = {
  /** Canonical lanes across the compared paths. */
  layers: BlueprintLayer[]
  /** Lane row specs (one set — both canvases share the lane axis). */
  rows: BlueprintLabelRowSpec[]
  toggleLayer: (layerId: string) => void
  tracks: CompareGridTrack[]
  gridTemplateColumns: string
}

/**
 * The column + lane axis both compare canvases are drawn against — the
 * stacked bands and the merged grid. One derivation keeps the two modes
 * from drifting apart in two copies. (Fold retired 2026-08-17: the axis is
 * always the full canonical column set.)
 */
export function useCompareGridAxis(
  model: CompareModel | null,
  blueprints: BlueprintData[],
  compact = false,
): CompareGridAxis {
  const { collapsedLayerIds, toggleLayer } = useCollapsedBlueprintLayers()

  const layers = useMemo(() => getCanonicalLayers(blueprints), [blueprints])

  const rows = useMemo(
    () => buildSideBySideLabelRowSpecs(blueprints, compact, collapsedLayerIds),
    [blueprints, collapsedLayerIds, compact],
  )

  const tracks = useMemo(
    () => buildCompareGridTracks(model, blueprints),
    [blueprints, model],
  )

  // Never animated — a `gridTemplateColumns` transition would relayout the
  // whole subgrid per frame and draw arrows against intermediate geometry.
  const gridTemplateColumns = useMemo(() => {
    if (tracks.length === 0) {
      return `${COMPARE_LABEL_WIDTH}px ${STEP_COLUMN_WIDTH}px`
    }
    return `${COMPARE_LABEL_WIDTH}px ${tracks
      .map(() => `${STEP_COLUMN_WIDTH}px`)
      .join(' ')}`
  }, [tracks])

  return { layers, rows, toggleLayer, tracks, gridTemplateColumns }
}
