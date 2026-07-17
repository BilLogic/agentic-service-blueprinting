import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactNode,
  type RefObject,
  type KeyboardEvent,
} from 'react'
import { ScenarioTitleBadge } from '@/components/blueprint/ScenarioTitleBadge'
import { ARROW_VIEWPORT_PAD } from '@/lib/blueprintArrowGeometry'
import {
  COMPARE_MIN_PANEL_HEIGHT,
  COMPARE_MIN_PANEL_WIDTH,
  COMPARE_PANEL_PADDING,
  COMPARE_PANEL_PADDING_RIGHT,
  COMPARE_RESIZE_HANDLE_SIZE,
  getComparePanelScrollInsetY,
  getComparePanelScrollPaddingY,
} from '@/lib/sideBySideCompareLayout'
import {
  BLUEPRINT_THEME,
} from '@/lib/blueprintTheme'
import { cn } from '@/lib/utils'

type ResizableComparePanelProps = {
  children: ReactNode
  minWidth?: number
  minHeight?: number
  defaultWidth?: number
  defaultHeight?: number
  /** When this changes, manual resize is cleared and content is re-measured. */
  fitContentKey?: string
  /** When true, panel height stays at defaultHeight (no content-driven growth). */
  lockHeight?: boolean
  /** When set, clicking the panel navigates (phase overview). */
  onNavigate?: () => void
  navigateLabel?: string
  /** Scenario title on the gray panel top edge (service overview). */
  panelTitleLabel?: string
  panelTitleDescription?: string | null
  className?: string
  scrollContainerRef?: RefObject<HTMLDivElement | null>
}

export function ResizableComparePanel({
  children,
  minWidth,
  minHeight,
  defaultWidth,
  defaultHeight,
  fitContentKey,
  lockHeight = false,
  onNavigate,
  navigateLabel,
  panelTitleLabel,
  panelTitleDescription,
  className,
  scrollContainerRef,
}: ResizableComparePanelProps) {
  const resolvedMinWidth = minWidth ?? COMPARE_MIN_PANEL_WIDTH
  const resolvedMinHeight = minHeight ?? COMPARE_MIN_PANEL_HEIGHT
  const contentMeasureRef = useRef<HTMLDivElement>(null)
  const [measuredContentHeight, setMeasuredContentHeight] = useState(0)
  const [userSize, setUserSize] = useState({ width: 0, height: 0 })

  useEffect(() => {
    if (lockHeight) return
    setUserSize({ width: 0, height: 0 })
  }, [fitContentKey, defaultWidth, defaultHeight, lockHeight])

  useEffect(() => {
    const element = contentMeasureRef.current
    if (!element) return

    const measure = () => {
      setMeasuredContentHeight(element.scrollHeight)
    }

    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(element)
    return () => observer.disconnect()
  }, [fitContentKey])

  const measuredPanelHeight =
    measuredContentHeight > 0
      ? measuredContentHeight + getComparePanelScrollPaddingY()
      : null

  const targetWidth = Math.max(
    resolvedMinWidth,
    defaultWidth ?? resolvedMinWidth,
  )
  const targetHeight = lockHeight
    ? Math.max(resolvedMinHeight, defaultHeight ?? resolvedMinHeight)
    : Math.max(
        resolvedMinHeight,
        measuredPanelHeight ?? defaultHeight ?? resolvedMinHeight,
      )
  const size = {
    width: Math.max(targetWidth, userSize.width),
    height: lockHeight ? targetHeight : Math.max(targetHeight, userSize.height),
  }
  const scrollPaddingY = getComparePanelScrollPaddingY()
  const contentFitsWithPadding =
    lockHeight &&
    measuredContentHeight > 0 &&
    measuredContentHeight + scrollPaddingY <= size.height
  const resizeStart = useRef({
    x: 0,
    y: 0,
    width: 0,
    height: 0,
  })

  const handleResizePointerDown = useCallback(
    (e: React.PointerEvent<HTMLButtonElement>) => {
      e.preventDefault()
      e.stopPropagation()
      e.currentTarget.setPointerCapture(e.pointerId)
      resizeStart.current = {
        x: e.clientX,
        y: e.clientY,
        width: size.width,
        height: size.height,
      }

      const onMove = (moveEvent: PointerEvent) => {
        setUserSize({
          width: Math.max(
            resolvedMinWidth,
            resizeStart.current.width +
              (moveEvent.clientX - resizeStart.current.x),
          ),
          height: Math.max(
            resolvedMinHeight,
            resizeStart.current.height +
              (moveEvent.clientY - resizeStart.current.y),
          ),
        })
      }

      const target = e.currentTarget

      const onUp = (upEvent: PointerEvent) => {
        target.releasePointerCapture(upEvent.pointerId)
        window.removeEventListener('pointermove', onMove)
        window.removeEventListener('pointerup', onUp)
      }

      window.addEventListener('pointermove', onMove)
      window.addEventListener('pointerup', onUp)
    },
    [resolvedMinHeight, resolvedMinWidth, size.height, size.width],
  )

  const scrollInsetY = getComparePanelScrollInsetY()
  const panelRef = useRef<HTMLDivElement>(null)
  const interactive = Boolean(onNavigate)

  const handleNavigateKeyDown = useCallback(
    (event: KeyboardEvent<HTMLDivElement>) => {
      if (!onNavigate) return
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault()
        onNavigate()
      }
    },
    [onNavigate],
  )

  return (
    <div className={cn('relative shrink-0', className)}>
      {panelTitleLabel ? (
        <ScenarioTitleBadge
          name={panelTitleLabel}
          description={panelTitleDescription}
          tone="panel"
          className="pointer-events-auto absolute z-30 max-w-[min(calc(100%-3rem),28rem)]"
          style={{
            top: 0,
            left: COMPARE_PANEL_PADDING,
            transform: 'translateY(-50%)',
          }}
        />
      ) : null}
      <div
        ref={panelRef}
        className={cn(
          'relative flex shrink-0 flex-col overflow-hidden rounded-2xl border shadow-sm',
          interactive &&
            'cursor-pointer transition-[box-shadow,border-color] duration-150 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:ring-offset-0',
        )}
        style={{
          width: size.width,
          height: size.height,
          backgroundColor: interactive
            ? undefined
            : BLUEPRINT_THEME.labelRail,
          borderColor: interactive ? undefined : BLUEPRINT_THEME.canvasBorder,
        }}
        data-compare-panel
        data-blueprint-artboard
        {...(interactive ? { 'data-phase-scenario-panel': '' } : {})}
        role={interactive ? 'button' : undefined}
        tabIndex={interactive ? 0 : undefined}
        aria-label={interactive ? navigateLabel : undefined}
        onClick={
          interactive
            ? (event) => {
                event.stopPropagation()
                onNavigate?.()
              }
            : undefined
        }
        onKeyDown={interactive ? handleNavigateKeyDown : undefined}
        onMouseLeave={
          interactive
            ? () => {
                if (
                  panelRef.current?.contains(document.activeElement) &&
                  document.activeElement instanceof HTMLElement
                ) {
                  document.activeElement.blur()
                }
              }
            : undefined
        }
        onPointerDown={(e) => e.stopPropagation()}
      >
      <div
        ref={scrollContainerRef}
        className={cn(
          'min-h-0 flex-1 overflow-auto blueprint-scroll',
          contentFitsWithPadding && !lockHeight && 'flex flex-col justify-center',
        )}
        style={{
          paddingTop: ARROW_VIEWPORT_PAD + scrollInsetY,
          paddingLeft: ARROW_VIEWPORT_PAD,
          paddingRight:
            ARROW_VIEWPORT_PAD + (COMPARE_PANEL_PADDING_RIGHT - COMPARE_PANEL_PADDING),
          paddingBottom: ARROW_VIEWPORT_PAD + scrollInsetY,
        }}
      >
        <div
          ref={contentMeasureRef}
          data-blueprint-panel-content
          className="w-max shrink-0"
        >
          {children}
        </div>
      </div>
      {!lockHeight ? (
        <button
          type="button"
          aria-label="Resize comparison panel"
          className="absolute bottom-1 right-1 z-20 flex cursor-se-resize items-end justify-end rounded-sm p-1 text-muted-foreground/60 hover:bg-muted/70 hover:text-foreground"
          style={{
            width: COMPARE_RESIZE_HANDLE_SIZE + 8,
            height: COMPARE_RESIZE_HANDLE_SIZE + 8,
          }}
          onPointerDown={handleResizePointerDown}
        >
          <svg
            viewBox="0 0 12 12"
            className="size-3"
            aria-hidden
            fill="currentColor"
          >
            <path d="M12 12H8V10H10V8H12V12ZM12 8H10V6H8V4H10V6H12V8ZM8 8H6V6H8V8Z" />
          </svg>
        </button>
      ) : null}
      </div>
    </div>
  )
}
