import {
  useCallback,
  useEffect,
  useMemo,
  useId,
  useState,
  type RefObject,
} from 'react'
import {
  ARROW_VIEWPORT_PAD,
  buildApplicationRegularTutorRailBusPath,
  buildArrowPath,
  buildBidirectionalArrowPath,
  buildOverheadRailFanOutDropPath,
  buildOverheadRailFanOutTrunkPath,
  buildReportingAnIssueFrontStageActionStep1ToResolvePath,
  findBidirectionalTriggerPairs,
  groupDiscoveryRailTriggers,
  isWrapTrigger,
  partitionReportingAnIssueFsaStep1ToResolveTriggers,
} from '@/lib/blueprintArrowGeometry'
import {
  getPathArrowColor,
  getPathColorKey,
  pathColorKeyToMarkerSuffix,
} from '@/lib/pathColorTheme'
import { getPathTypeArrowColor } from '@/lib/pathTypeTheme'
import { cn } from '@/lib/utils'
import type { BlueprintCellTrigger } from '@/types/blueprint'
import type { PathType } from '@/types/database'
import {
  BlueprintArrowMarkerDefs,
  blueprintArrowPathProps,
} from '@/components/blueprint/BlueprintArrowMarkerDefs'

type ArrowLayer = 'forward' | 'wrap'

export type ColoredBlueprintTrigger = BlueprintCellTrigger & {
  path_type: PathType
  opacity?: number
}

type BlueprintTriggerArrowsProps = {
  triggers: BlueprintCellTrigger[] | ColoredBlueprintTrigger[]
  contentRef: RefObject<HTMLElement | null>
  scrollContainerRef: RefObject<HTMLElement | null>
  /** forward = in column gaps behind cells; wrap = loop overlay on top */
  layer: ArrowLayer
  /** Used when triggers do not include path_type (single-path grids). */
  pathType?: PathType
  /** When set with pathType, arrows use the stable path identity color. */
  pathName?: string
}

type ArrowSegment = {
  id: string
  d: string
  colorKey: string
  arrowColor: string
  opacity: number
  showMarker?: boolean
  dualMarker?: boolean
}

function isColoredTrigger(
  trigger: BlueprintCellTrigger,
): trigger is ColoredBlueprintTrigger {
  return 'path_type' in trigger
}

export function BlueprintTriggerArrows({
  triggers,
  contentRef,
  scrollContainerRef,
  layer,
  pathType = 'happy',
  pathName,
}: BlueprintTriggerArrowsProps) {
  const [segments, setSegments] = useState<ArrowSegment[]>([])
  const [size, setSize] = useState({ width: 0, height: 0 })
  const markerId = useId().replace(/:/g, '')

  const defaultColorKey = pathName
    ? getPathColorKey({ path_type: pathType, name: pathName })
    : pathType
  const defaultArrowColor = pathName
    ? getPathArrowColor({ path_type: pathType, name: pathName })
    : getPathTypeArrowColor(pathType)

  const updateArrows = useCallback(() => {
    const content = contentRef.current
    if (!content || triggers.length === 0) {
      setSegments([])
      return
    }

    const next: ArrowSegment[] = []
    const { resolveTriggers, otherTriggers: railInputTriggers } =
      partitionReportingAnIssueFsaStep1ToResolveTriggers(triggers)

    for (const trigger of resolveTriggers) {
      const sourceEl = content.querySelector<HTMLElement>(
        `[data-blueprint-cell="${trigger.source_cell_id}"]`,
      )
      const targetEl = content.querySelector<HTMLElement>(
        `[data-blueprint-cell="${trigger.target_cell_id}"]`,
      )
      if (!sourceEl || !targetEl) continue

      const wrap = isWrapTrigger(
        sourceEl,
        targetEl,
        trigger.source_cell_id,
        trigger.target_cell_id,
      )
      if (layer === 'forward' && wrap) continue
      if (layer === 'wrap' && !wrap) continue

      const d = buildReportingAnIssueFrontStageActionStep1ToResolvePath(
        sourceEl,
        targetEl,
        content,
      )
      if (!d) continue

      next.push({
        id: trigger.id,
        d,
        colorKey: defaultColorKey,
        arrowColor: defaultArrowColor,
        opacity: isColoredTrigger(trigger) ? (trigger.opacity ?? 1) : 1,
      })
    }

    const { busGroups, fanOutGroups, remaining } = groupDiscoveryRailTriggers(
      railInputTriggers,
      content,
    )

    for (const group of fanOutGroups) {
      const targetEls = group.branches.map((branch) => branch.targetEl)
      const trunk = buildOverheadRailFanOutTrunkPath(
        group.sourceEl,
        targetEls,
        content,
      )
      if (trunk) {
        next.push({
          id: `${group.sourceCellId}-trunk`,
          d: trunk,
          colorKey: defaultColorKey,
          arrowColor: defaultArrowColor,
          opacity: 1,
          showMarker: false,
        })
      }

      for (const branch of group.branches) {
        const d = buildOverheadRailFanOutDropPath(
          group.sourceEl,
          branch.targetEl,
          content,
        )
        if (!d) continue

        next.push({
          id: branch.triggerId,
          d,
          colorKey: defaultColorKey,
          arrowColor: defaultArrowColor,
          opacity: 1,
        })
      }
    }

    for (const group of busGroups) {
      const d = buildApplicationRegularTutorRailBusPath(
        group.sourceEls,
        group.targetEl,
        content,
      )
      if (!d) continue

      next.push({
        id: group.triggerIds.join('-'),
        d,
        colorKey: defaultColorKey,
        arrowColor: defaultArrowColor,
        opacity: 1,
      })
    }

    const { pairs, remaining: unpaired } =
      findBidirectionalTriggerPairs(remaining)

    for (const pair of pairs) {
      const cellAEl = content.querySelector<HTMLElement>(
        `[data-blueprint-cell="${pair.cellAId}"]`,
      )
      const cellBEl = content.querySelector<HTMLElement>(
        `[data-blueprint-cell="${pair.cellBId}"]`,
      )
      if (!cellAEl || !cellBEl) continue

      const wrap = isWrapTrigger(
        cellAEl,
        cellBEl,
        pair.cellAId,
        pair.cellBId,
      )
      if (layer === 'forward' && wrap) continue
      if (layer === 'wrap' && !wrap) continue

      const d = buildBidirectionalArrowPath(cellAEl, cellBEl, content)
      if (!d) continue

      next.push({
        id: `${pair.first.id}-${pair.second.id}`,
        d,
        colorKey: defaultColorKey,
        arrowColor: defaultArrowColor,
        opacity: isColoredTrigger(pair.first)
          ? (pair.first.opacity ?? 1)
          : 1,
        dualMarker: true,
      })
    }

    for (const trigger of unpaired) {
      const sourceEl = content.querySelector<HTMLElement>(
        `[data-blueprint-cell="${trigger.source_cell_id}"]`,
      )
      const targetEl = content.querySelector<HTMLElement>(
        `[data-blueprint-cell="${trigger.target_cell_id}"]`,
      )
      if (!sourceEl || !targetEl) continue

      const wrap = isWrapTrigger(
        sourceEl,
        targetEl,
        trigger.source_cell_id,
        trigger.target_cell_id,
      )
      if (layer === 'forward' && wrap) continue
      if (layer === 'wrap' && !wrap) continue

      const d = buildArrowPath(
        sourceEl,
        targetEl,
        content,
        trigger.source_cell_id,
        trigger.target_cell_id,
        trigger.id,
      )
      if (!d) continue

      next.push({
        id: trigger.id,
        d,
        colorKey: defaultColorKey,
        arrowColor: defaultArrowColor,
        opacity: isColoredTrigger(trigger) ? (trigger.opacity ?? 1) : 1,
      })
    }

    setSegments(next)
    setSize({
      width: Math.max(content.scrollWidth, content.offsetWidth, 1),
      height: Math.max(content.scrollHeight, content.offsetHeight, 1),
    })
  }, [
    contentRef,
    defaultArrowColor,
    defaultColorKey,
    layer,
    triggers,
  ])

  useEffect(() => {
    updateArrows()
    const content = contentRef.current
    if (!content) return

    const scrollParent = scrollContainerRef.current ?? content
    const observer = new ResizeObserver(() => updateArrows())
    observer.observe(content)
    if (scrollParent !== content) {
      observer.observe(scrollParent)
    }

    let raf = 0
    const onScrollOrResize = () => {
      cancelAnimationFrame(raf)
      raf = requestAnimationFrame(updateArrows)
    }

    scrollParent.addEventListener('scroll', onScrollOrResize, { passive: true })
    window.addEventListener('resize', onScrollOrResize)

    return () => {
      cancelAnimationFrame(raf)
      observer.disconnect()
      scrollParent.removeEventListener('scroll', onScrollOrResize)
      window.removeEventListener('resize', onScrollOrResize)
    }
  }, [contentRef, scrollContainerRef, updateArrows])

  const svgStyle = useMemo(
    () => ({
      left: -ARROW_VIEWPORT_PAD,
      top: -ARROW_VIEWPORT_PAD,
      width:
        size.width > 0 ? size.width + ARROW_VIEWPORT_PAD * 2 : '100%',
      height:
        size.height > 0 ? size.height + ARROW_VIEWPORT_PAD * 2 : '100%',
    }),
    [size.height, size.width],
  )

  const { markerIds, markerColors } = useMemo(() => {
    const keys = new Set<string>([defaultColorKey])
    for (const segment of segments) {
      keys.add(segment.colorKey)
    }

    const ids: Record<string, string> = {}
    const colors: Record<string, string> = {}
    for (const key of keys) {
      const suffix = pathColorKeyToMarkerSuffix(key)
      ids[key] = `${markerId}-arrow-${suffix}`
      colors[key] =
        key === defaultColorKey
          ? defaultArrowColor
          : segments.find((segment) => segment.colorKey === key)?.arrowColor ??
            defaultArrowColor
    }

    return { markerIds: ids, markerColors: colors }
  }, [defaultArrowColor, defaultColorKey, markerId, segments])

  if (segments.length === 0) return null

  return (
    <svg
      className={cn(
        'pointer-events-none absolute overflow-visible',
        layer === 'forward' ? 'z-[2]' : 'z-[30]',
      )}
      style={svgStyle}
      overflow="visible"
      shapeRendering="geometricPrecision"
      aria-hidden
    >
      <defs>
        <BlueprintArrowMarkerDefs
          markerIds={markerIds}
          markerColors={markerColors}
        />
      </defs>
      <g transform={`translate(${ARROW_VIEWPORT_PAD} ${ARROW_VIEWPORT_PAD})`}>
        {segments.map((segment) => (
          <g key={segment.id} opacity={segment.opacity}>
            <path
              d={segment.d}
              {...blueprintArrowPathProps(segment.arrowColor)}
              {...(segment.showMarker === false
                ? {}
                : segment.dualMarker
                  ? {
                      markerStart: `url(#${markerIds[segment.colorKey]}-start)`,
                      markerEnd: `url(#${markerIds[segment.colorKey]})`,
                    }
                  : { markerEnd: `url(#${markerIds[segment.colorKey]})` })}
            />
          </g>
        ))}
      </g>
    </svg>
  )
}
