import { useEffect, type ReactNode } from 'react'
import {
  SEMANTIC_ZOOM_THRESHOLD,
  useZoomPanViewport,
} from '@/hooks/useZoomPanViewport'
import { CanvasAnnotationLayer } from '@/components/editor/CanvasAnnotationLayer'
import { CanvasAnnotationToolbar } from '@/components/editor/CanvasAnnotationToolbar'
import { CanvasSelectionProvider } from '@/components/editor/CanvasSelectionProvider'
import { CanvasPenCursor } from '@/components/editor/CanvasPenCursor'
import { EditorSequenceNav } from '@/components/editor/EditorSequenceNav'
import { registerAgentUiCommand } from '@/lib/agent/uiCommands'
import {
  registerActiveFocusCells,
  registerFocusCells,
} from '@/lib/canvasFocusCells'
import { registerAgentUiContext } from '@/lib/agent/uiBridge'
import { CanvasAnnotationProvider } from '@/contexts/CanvasAnnotationProvider'
import { usePublishCanvasZoomChrome } from '@/contexts/CanvasZoomChromeContext'
import { useCanvasAnnotations } from '@/contexts/canvasAnnotationContext'
import { BLUEPRINT_THEME } from '@/lib/blueprintTheme'
import { cn } from '@/lib/utils'

type ZoomPanViewportProps = {
  children: ReactNode
  className?: string
  resetKey?: string
  panIgnoreSelector?: string
  fitSelector?: string
  maxFitZoom?: number
  minFitZoom?: number
  semanticZoomThreshold?: number
  fitMargin?: number
  fitTopInset?: number
  fitBottomInset?: number
  animateFit?: boolean
  showSequenceNav?: boolean
  refitOnResize?: boolean
  /** Shows a "Reset View" action in the canvas navbar (focus mode). */
  onResetView?: () => void
  /**
   * Registers this viewport's `focusCells` in the module registry under
   * this key (the focused scenario's slide id) — the fly-to-cell pipeline
   * for the difference ledger and agent commands.
   */
  focusCellsKey?: string
}

/** Zoom/pan canvas wrapper. Provides the annotation context its layer and toolbar both read. */
export function ZoomPanViewport(props: ZoomPanViewportProps) {
  return (
    <CanvasAnnotationProvider>
      <ZoomPanViewportInner {...props} />
    </CanvasAnnotationProvider>
  )
}

function ZoomPanViewportInner({
  children,
  className,
  resetKey,
  panIgnoreSelector,
  fitSelector,
  maxFitZoom,
  minFitZoom,
  semanticZoomThreshold = SEMANTIC_ZOOM_THRESHOLD,
  fitMargin,
  fitTopInset,
  fitBottomInset,
  animateFit = false,
  showSequenceNav = true,
  refitOnResize = true,
  onResetView,
  focusCellsKey,
}: ZoomPanViewportProps) {
  const { isAnnotating } = useCanvasAnnotations()
  const {
    containerRef,
    contentRef,
    zoom,
    isPanning,
    isSpaceHeld,
    pointerHandlers,
    zoomIn,
    zoomOut,
    fitToView,
    focusCells,
    panBy,
    cancelCamera,
    getCameraState,
  } = useZoomPanViewport({
    resetKey,
    panIgnoreSelector,
    // Draw / place tools own the drag gesture — don't pan the board.
    panEnabled: !isAnnotating,
    fitSelector,
    maxFitZoom,
    minFitZoom,
    semanticZoomThreshold,
    fitMargin,
    fitTopInset,
    fitBottomInset,
    animateFit,
    refitOnResize,
  })

  usePublishCanvasZoomChrome(onResetView)

  // Cross-tree fly-to-cell: portalled surfaces (ledger drawer, agent
  // commands) resolve this at call time from the module registry —
  // `focusCells` is identity-stable, so this re-registers only on key moves.
  useEffect(() => {
    if (!focusCellsKey) return
    return registerFocusCells(focusCellsKey, focusCells)
  }, [focusCells, focusCellsKey])

  useEffect(() => registerActiveFocusCells(focusCells), [focusCells])

  // Agent parity: camera controls (otherwise keyboard-only ⌘+/⌘−/⌘0).
  useEffect(() => {
    const waitForCamera = async () => {
      const deadline = performance.now() + 1000
      while (getCameraState().moving && performance.now() < deadline) {
        await new Promise((done) => setTimeout(done, 16))
      }
      return getCameraState().moving ? 'timed out while moving' : 'completed'
    }
    const unregister = [
      registerAgentUiCommand({
        name: 'zoom',
        description:
          'Zoom the active canvas camera. arg: in | out | fit (fit the current focus)',
        run: async (arg) => {
          if (arg === 'in') zoomIn()
          else if (arg === 'out') zoomOut()
          else {
            fitToView({ animate: true })
            const outcome = await waitForCamera()
            return `Camera fit ${outcome}.`
          }
          return `Camera: zoomed ${arg}.`
        },
      }),
      registerAgentUiCommand({
        name: 'canvas_camera',
        description:
          'Control the active canvas camera. arg: pan <dx> <dy> (screen px) | zoom_in | zoom_out | fit | cancel',
        run: async (arg) => {
          const input = arg?.trim() ?? ''
          if (input === 'zoom_in') zoomIn()
          else if (input === 'zoom_out') zoomOut()
          else if (input === 'fit') {
            fitToView({ animate: true })
            return `Camera fit ${await waitForCamera()}.`
          }
          else if (input === 'cancel') cancelCamera()
          else if (input.startsWith('pan ')) {
            const [, rawX, rawY] = input.split(/\s+/)
            const dx = Number(rawX)
            const dy = Number(rawY)
            if (!Number.isFinite(dx) || !Number.isFinite(dy))
              return 'Camera unchanged. Use: pan <dx> <dy> with finite screen-pixel numbers.'
            panBy(dx, dy)
          } else {
            return 'Camera unchanged. arg must be pan <dx> <dy>, zoom_in, zoom_out, fit, or cancel.'
          }
          return `Camera command completed: ${input}.`
        },
      }),
    ]
    return () => unregister.forEach((remove) => remove())
  }, [cancelCamera, fitToView, getCameraState, panBy, zoomIn, zoomOut])

  useEffect(
    () =>
      registerAgentUiContext('canvas-camera', () => {
        const camera = getCameraState()
        return `Canvas camera: ${Math.round(camera.zoom * 100)}%, ${camera.moving ? 'moving' : 'idle'}${focusCellsKey ? `, active scenario ${focusCellsKey}` : ''}.`
      }),
    [focusCellsKey, getCameraState],
  )

  return (
    // The mode provider is mounted per *surface* (EditorShell for the base
    // canvas, SliceView for a slice tab) rather than here — a slice tab has to
    // know the mode above its viewport to swap in the editor.
    <CanvasSelectionProvider>
    <div
      // Bound every canvas-local z-index to this surface. The transformed
      // world, screen-space chrome, and annotation tools keep their internal
      // order without competing with the editor shell or portalled dialogs.
      className={cn('relative isolate min-h-0 flex-1', className)}
      data-zoom-pan-root
      // Cell-corner overlays (slice sequence badges) scale with the canvas;
      // below this zoom they are illegible specks, so CSS hides them. Same
      // threshold the cells' own text uses — one "too far out to read"
      // line, not two that disagree by surface.
      data-canvas-zoom-far={zoom < semanticZoomThreshold ? '' : undefined}
    >
      <div
        ref={containerRef}
        className={cn(
          'absolute inset-0 overflow-hidden touch-none',
          (isPanning || isSpaceHeld) && 'cursor-grab',
          isPanning && 'cursor-grabbing',
        )}
        style={{ backgroundColor: BLUEPRINT_THEME.viewportPad }}
        data-zoom-pan-viewport
        data-canvas-space-pan={isSpaceHeld ? '' : undefined}
        {...pointerHandlers}
      >
        <div
          ref={contentRef}
          /*
           * `touch-none` here as well as on the viewport, and again on every
           * descendant in blueprint.css. `touch-action` is not inherited,
           * and this element is TRANSFORMED — a composited layer boundary
           * that WebKit does not reliably look past when it resolves an
           * ancestor's `none`. A finger on empty canvas lands on the
           * viewport and pans; a finger on a cell lands inside here, where
           * Safari saw `auto`, took the gesture natively, and cancelled the
           * pointer stream the app was listening to. The board went dead
           * exactly where there is something to touch. Chromium walks the
           * ancestor chain correctly, which is why this passed every check
           * run in a Chromium pane.
           */
          className="absolute left-0 top-0 origin-top-left touch-none"
          style={{ backfaceVisibility: 'hidden' }}
          data-zoom-pan-content
        >
          <div className="relative inline-block min-h-0 align-top">
            {children}
            <CanvasAnnotationLayer zoom={zoom} />
          </div>
        </div>
        <CanvasPenCursor />
      </div>

      {showSequenceNav ? <EditorSequenceNav /> : null}
      <CanvasAnnotationToolbar />
    </div>
    </CanvasSelectionProvider>
  )
}
