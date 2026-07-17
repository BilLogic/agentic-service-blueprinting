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
  findBidirectionalTriggerPairs,
  isWrapTrigger,
} from '@/lib/blueprintArrowGeometry'
import {
  buildIntegratedForkDetourBranchPath,
  buildIntegratedForkStraightBranchPath,
  buildIntegratedForkTrunkPath,
  detectIntegratedForkGroups,
  getIntegratedForkBranchStrokeWidth,
  getIntegratedForkCircleCenter,
  getIntegratedForkNodeOpacity,
  getIntegratedForkTrunkStrokeWidth,
  INTEGRATED_FORK_THEME,
  pickStraightForkBranch,
  shouldUseIntegratedForkDetour,
} from '@/lib/integratedForkArrowGeometry'
import {
  getPathArrowColor,
  getPathColorKey,
  pathColorKeyToMarkerSuffix,
  type PathColorInput,
} from '@/lib/pathColorTheme'
import { getPathTypeArrowColor } from '@/lib/pathTypeTheme'
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
import type { PathType } from '@/types/database'

type ArrowLayer = 'forward' | 'wrap'

type IntegratedPathRef = {
  id: string
  name: string
  path_type: PathType
}

type IntegratedTriggerArrowsProps = {
  triggers: IntegratedBlueprintTrigger[]
  cells: IntegratedBlueprintCell[]
  steps: IntegratedBlueprintStep[]
  paths?: IntegratedPathRef[]
  contentRef: RefObject<HTMLElement | null>
  scrollContainerRef: RefObject<HTMLElement | null>
  layer: ArrowLayer
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

type ForkRenderGroup = {
  id: string
  trunkPath: string
  trunkArrowColor: string
  circle: { cx: number; cy: number }
  branches: SimpleSegment[]
}

function resolveSegmentStyle(
  pathId: string,
  pathById: Map<string, IntegratedPathRef>,
): { colorKey: string; arrowColor: string } {
  const path = pathById.get(pathId)
  if (!path) {
    return { colorKey: 'happy', arrowColor: getPathTypeArrowColor('happy') }
  }

  const input: PathColorInput = {
    path_type: path.path_type,
    name: path.name,
  }

  return {
    colorKey: getPathColorKey(input),
    arrowColor: getPathArrowColor(input),
  }
}

function getIntegratedForkTrunkArrowColor(
  branches: ReadonlyArray<SimpleSegment>,
  straightBranch: SimpleSegment,
): string {
  const active = branches.filter((branch) => branch.opacity >= 1)
  if (active.length === 1) return active[0].arrowColor
  return straightBranch.arrowColor
}

export function IntegratedTriggerArrows({
  triggers,
  cells,
  steps,
  paths = [],
  contentRef,
  scrollContainerRef,
  layer,
}: IntegratedTriggerArrowsProps) {
  const [simpleSegments, setSimpleSegments] = useState<SimpleSegment[]>([])
  const [forkGroups, setForkGroups] = useState<ForkRenderGroup[]>([])
  const [size, setSize] = useState({ width: 0, height: 0 })
  const markerId = useId().replace(/:/g, '')

  const pathById = useMemo(
    () => new Map(paths.map((path) => [path.id, path])),
    [paths],
  )

  const { groups: forkMeta, forkTriggerIds } = useMemo(
    () => detectIntegratedForkGroups(triggers, cells, steps),
    [triggers, cells, steps],
  )

  const updateArrows = useCallback(() => {
    const content = contentRef.current
    if (!content || triggers.length === 0) {
      setSimpleSegments([])
      setForkGroups([])
      return
    }

    const nextSimple: SimpleSegment[] = []
    const nextForks: ForkRenderGroup[] = []
    const nonForkTriggers = triggers.filter((t) => !forkTriggerIds.has(t.id))

    for (const group of forkMeta) {
      const sampleBranch = group.branches[0]
      const sourceEl = content.querySelector<HTMLElement>(
        `[data-blueprint-cell="${sampleBranch.source_cell_id}"]`,
      )
      if (!sourceEl) continue

      const circle = getIntegratedForkCircleCenter(sourceEl, content)
      const trunkPath = buildIntegratedForkTrunkPath(sourceEl, circle, content)
      if (!trunkPath) continue

      const straightBranch = pickStraightForkBranch(group, cells, steps)
      const branchSegments: SimpleSegment[] = []

      for (const branch of group.branches) {
        const targetEl = content.querySelector<HTMLElement>(
          `[data-blueprint-cell="${branch.target_cell_id}"]`,
        )
        if (!targetEl) continue

        const wrap = isWrapTrigger(sourceEl, targetEl)
        if (layer === 'forward' && wrap) continue
        if (layer === 'wrap' && !wrap) continue

        const useDetour = shouldUseIntegratedForkDetour(
          branch,
          cells,
          steps,
          group,
        )
        const d = useDetour
          ? buildIntegratedForkDetourBranchPath(
              circle,
              sourceEl,
              targetEl,
              content,
            )
          : buildIntegratedForkStraightBranchPath(
              circle,
              sourceEl,
              targetEl,
              content,
            )

        if (!d) continue

        const branchStyle = resolveSegmentStyle(branch.path_id, pathById)
        branchSegments.push({
          id: branch.id,
          d,
          colorKey: branchStyle.colorKey,
          arrowColor: branchStyle.arrowColor,
          opacity: branch.opacity,
        })
      }

      if (branchSegments.length === 0) continue

      const straightStyle = resolveSegmentStyle(straightBranch.path_id, pathById)
      const straightSegment: SimpleSegment = {
        id: straightBranch.id,
        d: '',
        colorKey: straightStyle.colorKey,
        arrowColor: straightStyle.arrowColor,
        opacity: straightBranch.opacity,
      }

      nextForks.push({
        id: group.id,
        trunkPath,
        trunkArrowColor: getIntegratedForkTrunkArrowColor(
          branchSegments,
          straightSegment,
        ),
        circle: { cx: circle.x, cy: circle.y },
        branches: branchSegments,
      })
    }

    const { pairs, remaining: unpaired } =
      findBidirectionalTriggerPairs(nonForkTriggers)

    for (const pair of pairs) {
      const cellAEl = content.querySelector<HTMLElement>(
        `[data-blueprint-cell="${pair.cellAId}"]`,
      )
      const cellBEl = content.querySelector<HTMLElement>(
        `[data-blueprint-cell="${pair.cellBId}"]`,
      )
      if (!cellAEl || !cellBEl) continue

      const wrap = isWrapTrigger(cellAEl, cellBEl)
      if (layer === 'forward' && wrap) continue
      if (layer === 'wrap' && !wrap) continue

      const d = buildBidirectionalArrowPath(cellAEl, cellBEl, content)
      if (!d) continue

      const style = resolveSegmentStyle(pair.first.path_id, pathById)
      nextSimple.push({
        id: `${pair.first.id}-${pair.second.id}`,
        d,
        colorKey: style.colorKey,
        arrowColor: style.arrowColor,
        opacity: pair.first.opacity ?? 1,
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

      const wrap = isWrapTrigger(sourceEl, targetEl)
      if (layer === 'forward' && wrap) continue
      if (layer === 'wrap' && !wrap) continue

      const d = buildArrowPath(sourceEl, targetEl, content)
      if (!d) continue

      const style = resolveSegmentStyle(trigger.path_id, pathById)
      nextSimple.push({
        id: trigger.id,
        d,
        colorKey: style.colorKey,
        arrowColor: style.arrowColor,
        opacity: trigger.opacity,
      })
    }

    setSimpleSegments(nextSimple)
    setForkGroups(nextForks)
    setSize({
      width: Math.max(content.scrollWidth, content.offsetWidth, 1),
      height: Math.max(content.scrollHeight, content.offsetHeight, 1),
    })
  }, [contentRef, forkMeta, forkTriggerIds, layer, pathById, triggers])

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
    const keys = new Set<string>()
    for (const segment of simpleSegments) {
      keys.add(segment.colorKey)
    }
    for (const group of forkGroups) {
      keys.add(group.trunkArrowColor)
      for (const branch of group.branches) {
        keys.add(branch.colorKey)
      }
    }

    const ids: Record<string, string> = {}
    const colors: Record<string, string> = {}

    for (const segment of simpleSegments) {
      if (!ids[segment.colorKey]) {
        ids[segment.colorKey] = `${markerId}-arrow-${pathColorKeyToMarkerSuffix(segment.colorKey)}`
        colors[segment.colorKey] = segment.arrowColor
      }
    }

    for (const group of forkGroups) {
      for (const branch of group.branches) {
        if (!ids[branch.colorKey]) {
          ids[branch.colorKey] = `${markerId}-arrow-${pathColorKeyToMarkerSuffix(branch.colorKey)}`
          colors[branch.colorKey] = branch.arrowColor
        }
      }
    }

    return { markerIds: ids, markerColors: colors }
  }, [forkGroups, markerId, simpleSegments])

  if (simpleSegments.length === 0 && forkGroups.length === 0) return null

  const {
    nodeRadius,
    nodeFill,
    nodeHaloRadius,
    nodeHaloFill,
  } = INTEGRATED_FORK_THEME

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
        {simpleSegments.map((segment) => (
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
        {forkGroups.map((group) => {
          const nodeOpacity = getIntegratedForkNodeOpacity(group.branches)

          return (
            <g key={group.id}>
              {group.branches.map((branch) => (
                <g key={branch.id} opacity={branch.opacity}>
                  <path
                    d={branch.d}
                    {...blueprintArrowPathProps(branch.arrowColor)}
                    strokeWidth={getIntegratedForkBranchStrokeWidth(branch.opacity)}
                    markerEnd={`url(#${markerIds[branch.colorKey]})`}
                  />
                </g>
              ))}
              <g opacity={nodeOpacity}>
                <path
                  d={group.trunkPath}
                  fill="none"
                  stroke={group.trunkArrowColor}
                  strokeWidth={getIntegratedForkTrunkStrokeWidth(nodeOpacity)}
                  strokeLinecap="round"
                />
                <circle
                  cx={group.circle.cx}
                  cy={group.circle.cy}
                  r={nodeHaloRadius}
                  fill={nodeHaloFill}
                />
                <circle
                  cx={group.circle.cx}
                  cy={group.circle.cy}
                  r={nodeRadius}
                  fill={nodeFill}
                />
              </g>
            </g>
          )
        })}
      </g>
    </svg>
  )
}
