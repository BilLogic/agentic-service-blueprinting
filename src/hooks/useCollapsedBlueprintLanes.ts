import { BLUEPRINT_LANE_COLLAPSE_ENABLED } from '@/lib/blueprintLaneCollapse'
import { useCallback, useState } from 'react'

const EMPTY_COLLAPSED_LANES = new Set<string>()

export function useCollapsedBlueprintLanes() {
  const [collapsedLaneIds, setCollapsedLaneIds] = useState(
    () => new Set<string>(),
  )

  const toggleLane = useCallback((laneId: string) => {
    if (!BLUEPRINT_LANE_COLLAPSE_ENABLED) return

    setCollapsedLaneIds((current) => {
      const next = new Set(current)
      if (next.has(laneId)) {
        next.delete(laneId)
      } else {
        next.add(laneId)
      }
      return next
    })
  }, [])

  const isLaneCollapsed = useCallback(
    (laneId: string) =>
      BLUEPRINT_LANE_COLLAPSE_ENABLED && collapsedLaneIds.has(laneId),
    [collapsedLaneIds],
  )

  return {
    collapsedLaneIds: BLUEPRINT_LANE_COLLAPSE_ENABLED
      ? collapsedLaneIds
      : EMPTY_COLLAPSED_LANES,
    toggleLane,
    isLaneCollapsed,
  }
}
