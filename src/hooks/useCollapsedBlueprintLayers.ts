import { BLUEPRINT_LAYER_COLLAPSE_ENABLED } from '@/lib/blueprintLayerCollapse'
import { useCallback, useState } from 'react'

const EMPTY_COLLAPSED_LAYERS = new Set<string>()

export function useCollapsedBlueprintLayers() {
  const [collapsedLayerIds, setCollapsedLayerIds] = useState(
    () => new Set<string>(),
  )

  const toggleLayer = useCallback((layerId: string) => {
    if (!BLUEPRINT_LAYER_COLLAPSE_ENABLED) return

    setCollapsedLayerIds((current) => {
      const next = new Set(current)
      if (next.has(layerId)) {
        next.delete(layerId)
      } else {
        next.add(layerId)
      }
      return next
    })
  }, [])

  const isLayerCollapsed = useCallback(
    (layerId: string) =>
      BLUEPRINT_LAYER_COLLAPSE_ENABLED && collapsedLayerIds.has(layerId),
    [collapsedLayerIds],
  )

  return {
    collapsedLayerIds: BLUEPRINT_LAYER_COLLAPSE_ENABLED
      ? collapsedLayerIds
      : EMPTY_COLLAPSED_LAYERS,
    toggleLayer,
    isLayerCollapsed,
  }
}
