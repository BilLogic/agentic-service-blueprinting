import {
  ARROW_CHEVRON_HALF_WIDTH,
  ARROW_CHEVRON_SIZE,
  ARROW_MARKER_PAD,
  ARROW_MARKER_REF_X,
  ARROW_MARKER_REF_Y,
  ARROW_STROKE_WIDTH,
} from '@/lib/blueprintArrowGeometry'
import { getPathTypeArrowColor } from '@/lib/pathTypeTheme'
import type { PathType } from '@/types/database'

const PATH_TYPES: PathType[] = ['happy', 'unhappy', 'exception', 'alternative']

type BlueprintArrowMarkerDefsProps = {
  markerIds: Record<string, string>
  markerColors: Record<string, string>
}

/** Lucide-style filled arrowheads — shared by blueprint arrow overlays. */
export function BlueprintArrowMarkerDefs({
  markerIds,
  markerColors,
}: BlueprintArrowMarkerDefsProps) {
  const tip = ARROW_CHEVRON_SIZE
  const mid = ARROW_CHEVRON_SIZE / 2
  const half = ARROW_CHEVRON_HALF_WIDTH
  const keys = Object.keys(markerIds)

  return (
    <>
      {keys.map((key) => (
        <marker
          key={key}
          id={markerIds[key]}
          viewBox={`${-ARROW_MARKER_PAD} ${-ARROW_MARKER_PAD} ${ARROW_CHEVRON_SIZE + ARROW_MARKER_PAD * 2} ${ARROW_CHEVRON_SIZE + ARROW_MARKER_PAD * 2}`}
          refX={ARROW_MARKER_REF_X}
          refY={ARROW_MARKER_REF_Y}
          markerWidth={ARROW_CHEVRON_SIZE}
          markerHeight={ARROW_CHEVRON_SIZE}
          orient="auto"
          markerUnits="userSpaceOnUse"
          overflow="visible"
        >
          <path
            d={`M 0 ${mid - half} L ${tip} ${mid} L 0 ${mid + half} Z`}
            fill={markerColors[key]}
          />
        </marker>
      ))}
      {keys.map((key) => (
        <marker
          key={`${key}-start`}
          id={`${markerIds[key]}-start`}
          viewBox={`${-ARROW_MARKER_PAD} ${-ARROW_MARKER_PAD} ${ARROW_CHEVRON_SIZE + ARROW_MARKER_PAD * 2} ${ARROW_CHEVRON_SIZE + ARROW_MARKER_PAD * 2}`}
          refX={ARROW_MARKER_REF_X}
          refY={ARROW_MARKER_REF_Y}
          markerWidth={ARROW_CHEVRON_SIZE}
          markerHeight={ARROW_CHEVRON_SIZE}
          orient="auto-start-reverse"
          markerUnits="userSpaceOnUse"
          overflow="visible"
        >
          <path
            d={`M 0 ${mid - half} L ${tip} ${mid} L 0 ${mid + half} Z`}
            fill={markerColors[key]}
          />
        </marker>
      ))}
    </>
  )
}

export function blueprintArrowPathProps(arrowColor: string) {
  return {
    fill: 'none' as const,
    stroke: arrowColor,
    strokeWidth: ARROW_STROKE_WIDTH,
    strokeLinecap: 'butt' as const,
    strokeLinejoin: 'miter' as const,
  }
}

/** Default path-type markers for legacy callers. */
export function defaultPathTypeMarkerIds(markerIdPrefix: string): Record<string, string> {
  return Object.fromEntries(
    PATH_TYPES.map((type) => [type, `${markerIdPrefix}-arrow-${type}`]),
  )
}

export function defaultPathTypeMarkerColors(): Record<string, string> {
  return Object.fromEntries(
    PATH_TYPES.map((type) => [type, getPathTypeArrowColor(type)]),
  )
}

export const BLUEPRINT_ARROW_PATH_TYPES = PATH_TYPES
