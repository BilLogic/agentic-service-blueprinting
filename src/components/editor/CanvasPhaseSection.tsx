import {
  useLayoutEffect,
  useRef,
  type KeyboardEvent,
  type MouseEvent,
  type ReactNode,
  type RefObject,
} from 'react'
import { PhaseSectionFlowArrow } from '@/components/editor/PhaseSectionFlowArrow'
import {
  PHASE_SECTION_BOTTOM_INSET,
  PHASE_SECTION_INSET,
  PHASE_SECTION_TOP_INSET,
} from '@/components/editor/canvasPhaseSectionLayout'
import {
  OVERVIEW_PHASE_FLOW_ARROW_HEIGHT,
  OVERVIEW_PHASE_ROW_GAP,
  OVERVIEW_PHASE_SECTION_BOTTOM_INSET,
  OVERVIEW_PHASE_SECTION_INSET,
  OVERVIEW_PHASE_SECTION_TOP_INSET,
} from '@/lib/overviewLayout'
import { ScenarioTitleBadge } from '@/components/blueprint/ScenarioTitleBadge'
import { SLIDE_GAP } from '@/lib/slideLayout'
import { cn } from '@/lib/utils'

export {
  PHASE_SECTION_BOTTOM_INSET,
  PHASE_SECTION_INSET,
  PHASE_SECTION_TOP_INSET,
} from '@/components/editor/canvasPhaseSectionLayout'

type CanvasPhaseSectionProps = {
  title: string
  description?: string | null
  phaseId: string
  children: ReactNode
  className?: string
  /** Service overview uses tighter insets and row gaps. */
  variant?: 'default' | 'overview'
  /** Flow arrow from bottom center of this section to the next phase below. */
  showFlowArrow?: boolean
  /** Marks Application — other flow arrows align to this section's center. */
  isFlowArrowAnchor?: boolean
  /** Post-session lifecycle loop exits this section on the left. */
  isLoopArrowFrom?: boolean
  /** Pre-session lifecycle loop enters this section on the left. */
  isLoopArrowTo?: boolean
  /** Overview: hover + click opens the phase detail view. */
  onNavigate?: () => void
}

function useAlignedFlowArrowLeft(
  sectionRef: RefObject<HTMLElement | null>,
  showFlowArrow: boolean,
) {
  useLayoutEffect(() => {
    const section = sectionRef.current
    if (!showFlowArrow || !section) return

    const overview = section.closest('[data-service-overview]')
    if (!overview) return

    const updateArrowLeft = () => {
      const anchor = overview.querySelector<HTMLElement>(
        '[data-flow-arrow-anchor]',
      )
      const anchorCenter = anchor
        ? anchor.offsetLeft + anchor.offsetWidth / 2
        : section.offsetLeft + section.offsetWidth / 2
      const arrowLeft = anchorCenter - section.offsetLeft
      section.style.setProperty('--phase-flow-arrow-left', `${arrowLeft}px`)
    }

    updateArrowLeft()

    const resizeObserver = new ResizeObserver(updateArrowLeft)
    resizeObserver.observe(overview)
    overview
      .querySelectorAll<HTMLElement>('[data-canvas-phase-section]')
      .forEach((phaseSection) => {
        resizeObserver.observe(phaseSection)
      })

    return () => resizeObserver.disconnect()
  }, [sectionRef, showFlowArrow])
}

function isBlueprintPanelTarget(target: EventTarget | null): boolean {
  return Boolean(
    target instanceof HTMLElement &&
      target.closest('[data-phase-scenario-panel]'),
  )
}

/** Figma-style canvas section grouping a lifecycle phase and its scenarios. */
export function CanvasPhaseSection({
  title,
  description,
  phaseId,
  children,
  className,
  showFlowArrow = false,
  isFlowArrowAnchor = false,
  isLoopArrowFrom = false,
  isLoopArrowTo = false,
  onNavigate,
  variant = 'default',
}: CanvasPhaseSectionProps) {
  const sectionRef = useRef<HTMLElement>(null)
  useAlignedFlowArrowLeft(sectionRef, showFlowArrow)

  const isOverview = variant === 'overview'
  const sectionInset = isOverview
    ? OVERVIEW_PHASE_SECTION_INSET
    : PHASE_SECTION_INSET
  const sectionTopInset = isOverview
    ? OVERVIEW_PHASE_SECTION_TOP_INSET
    : PHASE_SECTION_TOP_INSET
  const sectionBottomInset = isOverview
    ? OVERVIEW_PHASE_SECTION_BOTTOM_INSET
    : PHASE_SECTION_BOTTOM_INSET
  const phaseRowGap = isOverview ? OVERVIEW_PHASE_ROW_GAP : SLIDE_GAP
  const flowArrowHeight = isOverview
    ? OVERVIEW_PHASE_FLOW_ARROW_HEIGHT
    : undefined

  const handleNavigateKeyDown = (event: KeyboardEvent<HTMLElement>) => {
    if (!onNavigate) return
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      onNavigate()
    }
  }

  const interactive = Boolean(onNavigate)

  const handleSectionClick = (event: MouseEvent<HTMLElement>) => {
    if (!interactive || isBlueprintPanelTarget(event.target)) return
    onNavigate?.()
  }

  return (
    <section
      ref={sectionRef}
      className={cn(
        'relative inline-flex w-max flex-col items-start',
        interactive &&
          'cursor-pointer rounded-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:ring-offset-0',
        className,
      )}
      data-canvas-phase-section=""
      data-phase-id={phaseId}
      data-phase-section-inset={sectionInset}
      {...(interactive ? { 'data-canvas-phase-interactive': '' } : {})}
      {...(isFlowArrowAnchor ? { 'data-flow-arrow-anchor': '' } : {})}
      {...(isLoopArrowFrom ? { 'data-phase-loop-from': '' } : {})}
      {...(isLoopArrowTo ? { 'data-phase-loop-to': '' } : {})}
      style={showFlowArrow ? { marginBottom: phaseRowGap } : undefined}
      role={interactive ? 'button' : undefined}
      tabIndex={interactive ? 0 : undefined}
      aria-label={interactive ? `Open ${title} phase` : undefined}
      onClick={interactive ? handleSectionClick : undefined}
      onKeyDown={interactive ? handleNavigateKeyDown : undefined}
      onMouseLeave={
        interactive
          ? () => {
              if (
                sectionRef.current?.contains(document.activeElement) &&
                document.activeElement instanceof HTMLElement
              ) {
                document.activeElement.blur()
              }
            }
          : undefined
      }
    >
      <div
        aria-hidden
        data-phase-frame=""
        className="pointer-events-none absolute rounded-2xl border border-solid"
        style={{
          top: -sectionTopInset,
          left: -sectionInset,
          right: -sectionInset,
          bottom: -sectionBottomInset,
        }}
      />
      <ScenarioTitleBadge
        name={title}
        description={description}
        tone={interactive ? 'phase' : 'default'}
        className="pointer-events-auto absolute z-10 max-w-[min(100%,28rem)] border-transparent"
        style={{
          top: -sectionTopInset,
          left: sectionInset,
          transform: 'translateY(-50%)',
        }}
      />
      <div className="relative flex flex-col gap-4">{children}</div>
      {showFlowArrow ? (
        <div
          className="pointer-events-none absolute z-50 -translate-x-1/2"
          style={{
            left: 'var(--phase-flow-arrow-left, 50%)',
            top: `calc(100% + ${sectionBottomInset}px)`,
            width: 24,
          }}
        >
          <PhaseSectionFlowArrow height={flowArrowHeight} />
        </div>
      ) : null}
    </section>
  )
}
