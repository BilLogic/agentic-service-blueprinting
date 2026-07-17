import { useLayoutEffect, useState, type RefObject } from 'react'
import { PHASE_SECTION_INSET } from '@/components/editor/canvasPhaseSectionLayout'
import { BLUEPRINT_THEME } from '@/lib/blueprintTheme'

const CONNECTOR_STROKE = BLUEPRINT_THEME.headerText
export const PHASE_OVERVIEW_LOOP_CHANNEL_OFFSET = 56
const LOOP_CHANNEL_OFFSET = PHASE_OVERVIEW_LOOP_CHANNEL_OFFSET
const CORNER_RADIUS = 12
const HEAD_LENGTH = 6
const HEAD_HALF_WIDTH = 4

type PhaseOverviewPhaseLoopArrowProps = {
  overviewRef: RefObject<HTMLDivElement | null>
  /** Set via callback ref so measurement runs after the overview node mounts. */
  overviewEl: HTMLDivElement | null
}

type LoopArrowGeometry = {
  width: number
  height: number
  path: string
  headPath: string
}

function getPhaseSectionInset(section: HTMLElement): number {
  const inset = section.dataset.phaseSectionInset
  if (inset) {
    const parsed = Number(inset)
    if (!Number.isNaN(parsed)) return parsed
  }
  return PHASE_SECTION_INSET
}

function getPhaseFrameLeft(section: HTMLElement): number {
  return section.offsetLeft - getPhaseSectionInset(section)
}

function getPhaseFrameMidY(section: HTMLElement): number {
  return section.offsetTop + section.offsetHeight / 2
}

function measureLoopArrowGeometry(
  overview: HTMLElement,
): LoopArrowGeometry | null {
  const fromSection = overview.querySelector<HTMLElement>(
    '[data-phase-loop-from]',
  )
  const toSection = overview.querySelector<HTMLElement>('[data-phase-loop-to]')

  if (!fromSection || !toSection) return null

  const postLeft = getPhaseFrameLeft(fromSection)
  const preLeft = getPhaseFrameLeft(toSection)
  const postY = getPhaseFrameMidY(fromSection)
  const preY = getPhaseFrameMidY(toSection)

  if (preY >= postY) return null

  let leftmostFrameLeft = Infinity
  overview
    .querySelectorAll<HTMLElement>('[data-canvas-phase-section]')
    .forEach((section) => {
      leftmostFrameLeft = Math.min(
        leftmostFrameLeft,
        getPhaseFrameLeft(section),
      )
    })

  const loopX = leftmostFrameLeft - LOOP_CHANNEL_OFFSET
  const shaftEndX = preLeft - HEAD_LENGTH
  const cornerRadius = Math.min(
    CORNER_RADIUS,
    (postLeft - loopX) / 2,
    (postY - preY) / 2,
  )

  const path = [
    `M ${postLeft} ${postY}`,
    `H ${loopX + cornerRadius}`,
    `A ${cornerRadius} ${cornerRadius} 0 0 1 ${loopX} ${postY - cornerRadius}`,
    `V ${preY + cornerRadius}`,
    `A ${cornerRadius} ${cornerRadius} 0 0 1 ${loopX + cornerRadius} ${preY}`,
    `H ${shaftEndX}`,
  ].join(' ')

  return {
    width: overview.offsetWidth,
    height: overview.offsetHeight,
    path,
    headPath: `M ${preLeft} ${preY} L ${shaftEndX} ${preY - HEAD_HALF_WIDTH} L ${shaftEndX} ${preY + HEAD_HALF_WIDTH} Z`,
  }
}

/** Left-side loop arrow between Post-session and Pre-session on the overview canvas. */
export function PhaseOverviewPhaseLoopArrow({
  overviewRef,
  overviewEl,
}: PhaseOverviewPhaseLoopArrowProps) {
  const [geometry, setGeometry] = useState<LoopArrowGeometry | null>(null)

  useLayoutEffect(() => {
    const overview = overviewEl ?? overviewRef.current
    if (!overview) {
      setGeometry(null)
      return
    }

    let frame1 = 0
    let frame2 = 0

    const updateGeometry = () => {
      setGeometry(measureLoopArrowGeometry(overview))
    }

    updateGeometry()
    frame1 = requestAnimationFrame(() => {
      frame2 = requestAnimationFrame(updateGeometry)
    })

    const resizeObserver = new ResizeObserver(updateGeometry)
    resizeObserver.observe(overview)
    overview
      .querySelectorAll<HTMLElement>('[data-canvas-phase-section]')
      .forEach((section) => {
        resizeObserver.observe(section)
      })

    return () => {
      cancelAnimationFrame(frame1)
      cancelAnimationFrame(frame2)
      resizeObserver.disconnect()
    }
  }, [overviewEl, overviewRef])

  if (!geometry || !overviewEl) return null

  return (
    <svg
      className="pointer-events-none absolute left-0 top-0 z-[60] overflow-visible"
      width={geometry.width}
      height={geometry.height}
      viewBox={`0 0 ${geometry.width} ${geometry.height}`}
      data-phase-overview-loop-arrow=""
      aria-hidden
    >
      <path
        d={geometry.path}
        fill="none"
        stroke={CONNECTOR_STROKE}
        strokeWidth={2}
        vectorEffect="non-scaling-stroke"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d={geometry.headPath} fill={CONNECTOR_STROKE} />
    </svg>
  )
}
