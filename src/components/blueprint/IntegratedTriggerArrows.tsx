import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useState,
  type RefObject,
} from 'react'
import {
  ARROW_VIEWPORT_PAD,
  buildArrowPath,
  buildBidirectionalArrowPath,
  buildOverheadRailBusPath,
  buildOverheadRailFanOutDropPath,
  buildOverheadRailFanOutTrunkPath,
  findBidirectionalTriggerPairs,
  groupOverheadRailTriggers,
  isWrapTrigger,
  runArrowMeasurementPass,
} from '@/lib/blueprintArrowGeometry'
import {
  getPathArrowColor,
  getPathDashArrayFromKey,
  getPathColorKey,
  pathColorKeyToMarkerSuffix,
  type PathColorInput,
} from '@/lib/pathColorTheme'
import { getPathKindArrowColor } from '@/lib/pathTypeTheme'
import { cn } from '@/lib/utils'
import {
  BlueprintArrowMarkerDefs,
  blueprintArrowPathProps,
} from '@/components/blueprint/BlueprintArrowMarkerDefs'
import type {
  IntegratedBlueprintCell,
  IntegratedBlueprintStep,
  IntegratedBlueprintTrigger,
} from '@/types/integratedBlueprint'
import type { PathKind } from '@/types/database'

type ArrowLayer = 'forward' | 'wrap'

type IntegratedPathRef = {
  id: string
  name: string
  kind: PathKind
}

type IntegratedTriggerArrowsProps = {
  triggers: IntegratedBlueprintTrigger[]
  /** Accepted for parity with the band's arrow data; geometry reads the DOM. */
  cells?: IntegratedBlueprintCell[]
  steps?: IntegratedBlueprintStep[]
  paths?: IntegratedPathRef[]
  contentRef: RefObject<HTMLElement | null>
  scrollContainerRef: RefObject<HTMLElement | null>
  lane: ArrowLayer
}

type SimpleSegment = {
  id: string
  d: string
  colorKey: string
  arrowColor: string
  opacity: number
  showMarker?: boolean
  dualMarker?: boolean
}

/**
 * Frame-shared cell index. Every overlay instance drawing over the same
 * container (the merged grid mounts 2 per path) reuses one
 * `querySelectorAll` sweep within a ~frame window; a later frame
 * re-sweeps, so DOM changes are picked up by the next scheduled update.
 * Only element IDENTITY is cached — rects are always measured live.
 */
const cellSweepCache = new WeakMap<
  HTMLElement,
  { at: number; map: Map<string, HTMLElement> }
>()
const CELL_SWEEP_TTL_MS = 16

function sharedCellIndex(content: HTMLElement): Map<string, HTMLElement> {
  const now = performance.now()
  const cached = cellSweepCache.get(content)
  if (cached && now - cached.at < CELL_SWEEP_TTL_MS) return cached.map
  const map = new Map<string, HTMLElement>()
  for (const el of content.querySelectorAll<HTMLElement>(
    '[data-blueprint-cell]',
  )) {
    const id = el.getAttribute('data-blueprint-cell')
    if (id !== null && !map.has(id)) map.set(id, el)
  }
  cellSweepCache.set(content, { at: now, map })
  return map
}

/** Identity of a rendered segment list — cheaper than re-rendering to find out. */
function serializeSegments(segments: readonly SimpleSegment[]): string {
  return segments
    .map(
      (segment) =>
        `${segment.id}|${segment.d}|${segment.colorKey}|${segment.arrowColor}|${segment.opacity}|${segment.showMarker ?? ''}|${segment.dualMarker ?? ''}`,
    )
    .join('\n')
}

function resolveSegmentStyle(
  pathId: string,
  pathById: Map<string, IntegratedPathRef>,
): { colorKey: string; arrowColor: string } {
  const path = pathById.get(pathId)
  if (!path) {
    return { colorKey: 'happy', arrowColor: getPathKindArrowColor('happy') }
  }

  const input: PathColorInput = {
    kind: path.kind,
    name: path.name,
  }

  return {
    colorKey: getPathColorKey(input),
    arrowColor: getPathArrowColor(input),
  }
}

/**
 * Arrow overlay for a path band: a forward lane and a wrap lane, plus the
 * merged overhead-rail routes, which are grouped across triggers rather than
 * drawn one at a time.
 */
export function IntegratedTriggerArrows({
  triggers,
  paths = [],
  contentRef,
  scrollContainerRef,
  lane,
}: IntegratedTriggerArrowsProps) {
  const [simpleSegments, setSimpleSegments] = useState<SimpleSegment[]>([])
  const [size, setSize] = useState({ width: 0, height: 0 })
  const markerId = useId().replace(/:/g, '')

  const pathById = useMemo(
    () => new Map(paths.map((path) => [path.id, path])),
    [paths],
  )

  // Every notification that reaches this component re-runs the measurement, so
  // both setters bail out when nothing actually moved. Without that, a single
  // ResizeObserver notification produces a new state identity, which re-renders,
  // which (with an unmemoised prop upstream) rebuilds the observer, whose
  // `observe()` fires immediately — a self-sustaining rAF loop.
  const measureSize = useCallback(() => {
    const content = contentRef.current
    if (!content) return

    const width = Math.max(content.scrollWidth, content.offsetWidth, 1)
    const height = Math.max(content.scrollHeight, content.offsetHeight, 1)
    setSize((prev) =>
      prev.width === width && prev.height === height
        ? prev
        : { width, height },
    )
  }, [contentRef])

  const updateArrows = useCallback(() => {
    const content = contentRef.current
    if (!content || triggers.length === 0) {
      setSimpleSegments((prev) => (prev.length === 0 ? prev : []))
      return
    }

    const nextSimple = runArrowMeasurementPass(() => {
      const segments: SimpleSegment[] = []
      // ONE DOM sweep per update — and per FRAME per container: the merged
      // grid mounts a forward+wrap overlay pair per path over one shared
      // band, so without the frame cache a geometry change cost 2×paths
      // full-DOM sweeps of the same unchanged tree.
      const cellElById = sharedCellIndex(content)

      const { busGroups, fanOutGroups, remaining } = groupOverheadRailTriggers(
        triggers,
        content,
      )

      for (const group of fanOutGroups) {
        const sampleTrigger = triggers.find((entry) =>
          group.branches.some((branch) => branch.triggerId === entry.id),
        )
        const trunkStyle = resolveSegmentStyle(
          sampleTrigger?.path_id ?? '',
          pathById,
        )
        const targetEls = group.branches.map((branch) => branch.targetEl)
        const trunk = buildOverheadRailFanOutTrunkPath(
          group.sourceEl,
          targetEls,
          content,
        )
        if (trunk) {
          segments.push({
            id: `${group.sourceCellId}-trunk`,
            d: trunk,
            colorKey: trunkStyle.colorKey,
            arrowColor: trunkStyle.arrowColor,
            opacity: 1,
            showMarker: false,
          })
        }

        for (const branch of group.branches) {
          const trigger = triggers.find(
            (entry) => entry.id === branch.triggerId,
          )
          const branchStyle = resolveSegmentStyle(trigger?.path_id ?? '', pathById)
          const d = buildOverheadRailFanOutDropPath(
            group.sourceEl,
            branch.targetEl,
            content,
          )
          if (!d) continue

          segments.push({
            id: branch.triggerId,
            d,
            colorKey: branchStyle.colorKey,
            arrowColor: branchStyle.arrowColor,
            opacity: trigger?.opacity ?? 1,
          })
        }
      }

      for (const group of busGroups) {
        const triggersInGroup = triggers.filter((trigger) =>
          group.triggerIds.includes(trigger.id),
        )
        const byPathId = new Map<
          string,
          { sourceEls: HTMLElement[]; opacity: number; triggerIds: string[] }
        >()

        for (const trigger of triggersInGroup) {
          const sourceEl = cellElById.get(trigger.source_cell_id)
          if (!sourceEl) continue

          const existing = byPathId.get(trigger.path_id)
          if (existing) {
            existing.sourceEls.push(sourceEl)
            existing.triggerIds.push(trigger.id)
            existing.opacity = Math.max(existing.opacity, trigger.opacity)
          } else {
            byPathId.set(trigger.path_id, {
              sourceEls: [sourceEl],
              opacity: trigger.opacity,
              triggerIds: [trigger.id],
            })
          }
        }

        for (const [pathId, pathGroup] of byPathId) {
          const style = resolveSegmentStyle(pathId, pathById)
          const targetEl =
            triggersInGroup
              .filter((trigger) => trigger.path_id === pathId)
              .map((trigger) => cellElById.get(trigger.target_cell_id))
              .find((el): el is HTMLElement => el !== undefined) ?? group.targetEl

          const d = buildOverheadRailBusPath(
            pathGroup.sourceEls,
            targetEl,
            content,
          )
          if (!d) continue

          segments.push({
            id: `${group.targetCellId}-${pathId}`,
            d,
            colorKey: style.colorKey,
            arrowColor: style.arrowColor,
            opacity: pathGroup.opacity,
          })
        }
      }

      const { pairs, remaining: unpaired } =
        findBidirectionalTriggerPairs(remaining)

      for (const pair of pairs) {
        const cellAEl = cellElById.get(pair.cellAId)
        const cellBEl = cellElById.get(pair.cellBId)
        if (!cellAEl || !cellBEl) continue

        const wrap = isWrapTrigger(cellAEl, cellBEl)
        if (lane === 'forward' && wrap) continue
        if (lane === 'wrap' && !wrap) continue

        const d = buildBidirectionalArrowPath(cellAEl, cellBEl, content)
        if (!d) continue

        const style = resolveSegmentStyle(pair.first.path_id, pathById)
        segments.push({
          id: `${pair.first.id}-${pair.second.id}`,
          d,
          colorKey: style.colorKey,
          arrowColor: style.arrowColor,
          opacity: pair.first.opacity ?? 1,
          dualMarker: true,
        })
      }

      for (const trigger of unpaired) {
        const sourceEl = cellElById.get(trigger.source_cell_id)
        const targetEl = cellElById.get(trigger.target_cell_id)
        if (!sourceEl || !targetEl) continue

        const wrap = isWrapTrigger(sourceEl, targetEl)
        if (lane === 'forward' && wrap) continue
        if (lane === 'wrap' && !wrap) continue

        const d = buildArrowPath(sourceEl, targetEl, content)
        if (!d) continue

        const style = resolveSegmentStyle(trigger.path_id, pathById)
        segments.push({
          id: trigger.id,
          d,
          colorKey: style.colorKey,
          arrowColor: style.arrowColor,
          opacity: trigger.opacity,
        })
      }

      return segments
    })

    const nextKey = serializeSegments(nextSimple)
    setSimpleSegments((prev) =>
      serializeSegments(prev) === nextKey ? prev : nextSimple,
    )
    measureSize()
  }, [contentRef, lane, measureSize, pathById, triggers])

  useEffect(() => {
    updateArrows()
    const content = contentRef.current
    if (!content) return

    const scrollParent = scrollContainerRef.current ?? content

    // One rAF coalescer for every geometry-invalidating signal — the
    // ResizeObserver included. Resizes arrive in bursts during band
    // relayout, and a synchronous update per notification re-measured the
    // whole overlay several times a frame.
    let raf = 0
    const scheduleUpdate = () => {
      cancelAnimationFrame(raf)
      raf = requestAnimationFrame(updateArrows)
    }

    // Scrolling is NOT a geometry signal: every box the routers read is
    // root-relative, so scrolling changes no path and no overlay extent. Only
    // the scroll extent itself is worth re-reading, and that is four property
    // reads rather than a full re-route of the band.
    let sizeRaf = 0
    const scheduleSizeUpdate = () => {
      cancelAnimationFrame(sizeRaf)
      sizeRaf = requestAnimationFrame(measureSize)
    }

    const observer = new ResizeObserver(scheduleUpdate)
    observer.observe(content)
    if (scrollParent !== content) {
      observer.observe(scrollParent)
    }

    scrollParent.addEventListener('scroll', scheduleSizeUpdate, {
      passive: true,
    })
    window.addEventListener('resize', scheduleUpdate)

    return () => {
      cancelAnimationFrame(raf)
      cancelAnimationFrame(sizeRaf)
      observer.disconnect()
      scrollParent.removeEventListener('scroll', scheduleSizeUpdate)
      window.removeEventListener('resize', scheduleUpdate)
    }
  }, [contentRef, measureSize, scrollContainerRef, updateArrows])

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
    const ids: Record<string, string> = {}
    const colors: Record<string, string> = {}

    for (const segment of simpleSegments) {
      if (!ids[segment.colorKey]) {
        ids[segment.colorKey] = `${markerId}-arrow-${pathColorKeyToMarkerSuffix(segment.colorKey)}`
        colors[segment.colorKey] = segment.arrowColor
      }
    }

    return { markerIds: ids, markerColors: colors }
  }, [markerId, simpleSegments])

  if (simpleSegments.length === 0) return null

  return (
    <svg
      data-blueprint-arrows=""
      className={cn(
        'pointer-events-none absolute overflow-visible',
        // z-0, UNDER the z-[1] cells: a run that crosses a cell tucks
        // behind it instead of striking through its face — lines are
        // always behind the blocks. The wrap lane stays above: it rides
        // the empty corridors outside the rows by construction.
        lane === 'forward' ? 'z-0' : 'z-[30]',
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
        {simpleSegments.map((segment) => (
          <g key={segment.id} opacity={segment.opacity}>
            <path
              d={segment.d}
              {...blueprintArrowPathProps(segment.arrowColor, getPathDashArrayFromKey(segment.colorKey))}
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
