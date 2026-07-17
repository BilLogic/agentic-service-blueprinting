import { PHASE_FLOW_ARROW_HEIGHT } from '@/components/editor/canvasPhaseSectionLayout'
import { BLUEPRINT_THEME } from '@/lib/blueprintTheme'

const CONNECTOR_STROKE = BLUEPRINT_THEME.headerText
const CONNECTOR_WIDTH = 24

type PhaseSectionFlowArrowProps = {
  height?: number
}

/** Downward arrow anchored on the bottom center of a phase section frame. */
export function PhaseSectionFlowArrow({
  height = PHASE_FLOW_ARROW_HEIGHT,
}: PhaseSectionFlowArrowProps) {
  const centerX = CONNECTOR_WIDTH / 2
  const headHeight = 6
  const headHalfWidth = 4
  const shaftEnd = Math.max(0, height - headHeight)

  return (
    <svg
      width={CONNECTOR_WIDTH}
      height={height}
      viewBox={`0 0 ${CONNECTOR_WIDTH} ${height}`}
      className="overflow-visible"
      data-phase-section-flow-arrow=""
      aria-hidden
    >
      <path
        d={`M ${centerX} 0 V ${shaftEnd}`}
        fill="none"
        stroke={CONNECTOR_STROKE}
        strokeWidth={2}
        vectorEffect="non-scaling-stroke"
      />
      <path
        d={`M ${centerX} ${height} L ${centerX - headHalfWidth} ${shaftEnd} L ${centerX + headHalfWidth} ${shaftEnd} Z`}
        fill={CONNECTOR_STROKE}
      />
    </svg>
  )
}
