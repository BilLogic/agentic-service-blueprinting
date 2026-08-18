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
import { IconTooltip } from '@/components/editor/IconTooltip'
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
  /**
   * Panel-chrome bar (the divergence strip) docked above the content.
   * Rendered OUTSIDE `contentMeasureRef` on purpose: measuring it would
   * feed its own height back into the panel size — a measure loop.
   */
  chromeBar?: ReactNode
  /** The chrome bar's fixed height, added to the panel's target height. */
  chromeBarHeight?: number
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
  /** Optional info note shown inside the panel title badge. */
  panelTitleInfoTooltip?: string | null
  /** Anchor id for canvas camera focus framing. */
  focusSlideId?: string
  /** When true, this panel is visually de-emphasized (canvas focus mode). */
  dimmed?: boolean
  /** When true, this panel is the camera focus target — no hover chrome. */
  focusActive?: boolean
  className?: string
  scrollContainerRef?: RefObject<HTMLDivElement | null>
}

/**
 * Scenario panel on the overview canvas, resizable from its corner by pointer
 * or keyboard. Grows to fit measured content unless the user overrides the
 * size or `lockHeight` pins it.
 */
export function ResizableComparePanel({
  children,
  chromeBar,
  chromeBarHeight = 0,
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
  panelTitleInfoTooltip,
  focusSlideId,
  dimmed = false,
  focusActive = false,
  className,
  scrollContainerRef,
}: ResizableComparePanelProps) {
  const resolvedMinWidth = minWidth ?? COMPARE_MIN_PANEL_WIDTH
  const resolvedMinHeight = minHeight ?? COMPARE_MIN_PANEL_HEIGHT
  const contentMeasureRef = useRef<HTMLDivElement>(null)
  const [measuredContent, setMeasuredContent] = useState({
    width: 0,
    height: 0,
  })
  const measuredContentHeight = measuredContent.height
  const [userSize, setUserSize] = useState({ width: 0, height: 0 })

  useEffect(() => {
    if (lockHeight) return
    // eslint-disable-next-line react-hooks/set-state-in-effect -- deliberate reset of the user's drag-resize when the fit key or defaults change; part of the panel's measurement flow
    setUserSize({ width: 0, height: 0 })
  }, [fitContentKey, defaultWidth, defaultHeight, lockHeight])

  useEffect(() => {
    const element = contentMeasureRef.current
    if (!element) return

    const measure = () => {
      // Layout size only. `scrollHeight` also counts arrow overlays and path
      // frames that bleed past the board, which would pad the panel with gray.
      setMeasuredContent({
        width: element.offsetWidth,
        height: element.offsetHeight,
      })
    }

    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(element)
    return () => observer.disconnect()
  }, [fitContentKey])

  const scrollChrome = { lockHeight }
  const scrollPaddingY = getComparePanelScrollPaddingY(scrollChrome)
  const measuredPanelHeight =
    measuredContentHeight > 0
      ? measuredContentHeight + scrollPaddingY
      : null
  // Horizontal chrome around the content — must match the padding applied to
  // the content container below.
  const contentPaddingX =
    ARROW_VIEWPORT_PAD * 2 +
    (COMPARE_PANEL_PADDING_RIGHT - COMPARE_PANEL_PADDING)
  const measuredPanelWidth =
    measuredContent.width > 0 ? measuredContent.width + contentPaddingX : null

  /*
    The panel never scrolls internally. It lives on a zoomable, pannable
    canvas — that camera *is* the scrolling — so a second scrollbar inside
    the panel meant two nested viewports fighting over the same wheel. The
    estimate functions size the panel up front; when the rendered content
    turns out larger than the estimate, the panel grows to fit instead of
    growing a scrollbar. `lockHeight` still sets the shared floor across a
    phase row, but it is a floor, not a ceiling.
  */
  // The default is a pre-measure placeholder, not a floor: once the content
  // has been measured, the measurement replaces it. Keeping the estimate as
  // a floor left compare panels wider than their columns.
  const targetWidth = Math.max(
    resolvedMinWidth,
    measuredPanelWidth ?? defaultWidth ?? resolvedMinWidth,
  )
  // The chrome bar (divergence strip) sits outside the measured content, so
  // its fixed height is added here rather than observed — no measure loop.
  const chromeHeight = chromeBar ? chromeBarHeight : 0
  const targetHeight =
    Math.max(
      resolvedMinHeight,
      lockHeight ? (defaultHeight ?? resolvedMinHeight) : 0,
      measuredPanelHeight ?? defaultHeight ?? resolvedMinHeight,
    ) + chromeHeight
  const size = {
    width: Math.max(targetWidth, userSize.width),
    height: lockHeight ? targetHeight : Math.max(targetHeight, userSize.height),
  }
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

  /**
   * Keyboard equivalent of the drag (SC 2.1.1, and SC 2.5.7 dragging movements).
   * Arrows nudge, Shift jumps, Home returns to the measured default by clearing
   * the user override rather than guessing a size.
   */
  const handleResizeKeyDown = useCallback(
    (event: KeyboardEvent<HTMLButtonElement>) => {
      const step = event.shiftKey ? 64 : 16
      const nudge = (dx: number, dy: number) => {
        event.preventDefault()
        setUserSize({
          width: Math.max(resolvedMinWidth, size.width + dx),
          height: Math.max(resolvedMinHeight, size.height + dy),
        })
      }

      switch (event.key) {
        case 'ArrowRight':
          return nudge(step, 0)
        case 'ArrowLeft':
          return nudge(-step, 0)
        case 'ArrowDown':
          return nudge(0, step)
        case 'ArrowUp':
          return nudge(0, -step)
        case 'Home':
          // Zeroing the override falls back to the measured target size, which
          // is what `size` maxes against — see the `Math.max` pair above.
          event.preventDefault()
          return setUserSize({ width: 0, height: 0 })
        default:
          return
      }
    },
    [resolvedMinHeight, resolvedMinWidth, size.height, size.width],
  )

  const scrollInsetY = getComparePanelScrollInsetY(scrollChrome)
  const panelRef = useRef<HTMLDivElement>(null)
  const interactive = Boolean(onNavigate)
  const navigable = interactive && !focusActive

  const handleNavigateKeyDown = useCallback(
    (event: KeyboardEvent<HTMLDivElement>) => {
      if (!onNavigate || focusActive) return
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault()
        onNavigate()
      }
    },
    [focusActive, onNavigate],
  )

  return (
    <div
      className={cn(
        'relative shrink-0 transition-[opacity,filter] duration-(--motion-fade) ease-out',
        dimmed &&
          'opacity-30 saturate-50 [&_[data-blueprint-cell-interactive]]:pointer-events-none',
        className,
      )}
      data-focus-slide-id={focusSlideId}
      data-canvas-focus-dimmed={dimmed ? '' : undefined}
    >
      {panelTitleLabel ? (
        <ScenarioTitleBadge
          name={panelTitleLabel}
          description={panelTitleDescription}
          infoTooltip={panelTitleInfoTooltip}
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
          navigable &&
            'cursor-pointer transition-[box-shadow,border-color] duration-(--motion-micro) ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:ring-offset-0',
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
        {...(focusActive ? { 'data-canvas-focus-active': '' } : {})}
        role={navigable ? 'button' : undefined}
        tabIndex={navigable ? 0 : undefined}
        aria-label={navigable ? navigateLabel : undefined}
        onClick={
          navigable
            ? (event) => {
                event.stopPropagation()
                onNavigate?.()
              }
            : undefined
        }
        onKeyDown={navigable ? handleNavigateKeyDown : undefined}
        onMouseLeave={
          navigable
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
        // Pointer events flow through to the canvas: a drag that starts on
        // board space PANS (the viewport's tracker is slop-gated, so plain
        // clicks still land on cells/buttons). Mouse used to be stopped
        // here — which made every drag inside a path board a dead drag.
        // Interactive chrome opts out via the viewport's panIgnoreSelector.
      >
      {chromeBar}
      <div
        ref={scrollContainerRef}
        className={cn(
          'min-h-0 flex-1 overflow-hidden',
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
        <IconTooltip label="Arrow keys resize this too">
          <button
            type="button"
            aria-label="Resize comparison panel"
            className="absolute bottom-1 right-1 z-20 flex cursor-se-resize items-end justify-end rounded-sm p-1 text-muted-foreground/60 hover:bg-muted/70 hover:text-foreground"
            style={{
              width: COMPARE_RESIZE_HANDLE_SIZE + 8,
              height: COMPARE_RESIZE_HANDLE_SIZE + 8,
            }}
            onPointerDown={handleResizePointerDown}
            onKeyDown={handleResizeKeyDown}
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
        </IconTooltip>
      ) : null}
      </div>
    </div>
  )
}
