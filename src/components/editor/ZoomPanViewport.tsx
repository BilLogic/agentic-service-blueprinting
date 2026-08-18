import { useEffect, type ReactNode } from 'react'
import { useZoomPanViewport } from '@/hooks/useZoomPanViewport'
import { CanvasAnnotationLayer } from '@/components/editor/CanvasAnnotationLayer'
import { CanvasAnnotationToolbar } from '@/components/editor/CanvasAnnotationToolbar'
import { CanvasSelectionProvider } from '@/components/editor/CanvasSelectionProvider'
import { CanvasPenCursor } from '@/components/editor/CanvasPenCursor'
import { EditorSequenceNav } from '@/components/editor/EditorSequenceNav'
import { registerAgentUiCommand } from '@/lib/agent/uiCommands'
import { registerFocusCells } from '@/lib/canvasFocusCells'
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
   * for the difference ledger, the divergence strip and agent commands.
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
    pointerHandlers,
    zoomIn,
    zoomOut,
    fitToView,
    focusCells,
  } = useZoomPanViewport({
    resetKey,
    panIgnoreSelector,
    // Draw / place tools own the drag gesture — don't pan the board.
    panEnabled: !isAnnotating,
    fitSelector,
    maxFitZoom,
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

  // Agent parity: camera controls (otherwise keyboard-only ⌘+/⌘−/⌘0).
  useEffect(() => {
    return registerAgentUiCommand({
      name: 'zoom',
      description:
        'Zoom the canvas camera. arg: in | out | fit (fit the current focus)',
      run: (arg) => {
        if (arg === 'in') zoomIn()
        else if (arg === 'out') zoomOut()
        else fitToView({ animate: true })
        return `Camera: ${arg === 'in' || arg === 'out' ? `zoomed ${arg}` : 'fit to view'}.`
      },
    })
  }, [zoomIn, zoomOut, fitToView])

  return (
    // The mode provider is mounted per *surface* (EditorShell for the base
    // canvas, SliceView for a slice tab) rather than here — a slice tab has to
    // know the mode above its viewport to swap in the editor.
    <CanvasSelectionProvider>
    <div
      className={cn('relative min-h-0 flex-1', className)}
      data-zoom-pan-root
      // Cell-corner overlays (slice sequence badges) scale with the canvas;
      // below this zoom they are illegible specks, so CSS hides them.
      data-canvas-zoom-far={zoom < 0.25 ? '' : undefined}
    >
      <div
        ref={containerRef}
        className={cn(
          'absolute inset-0 overflow-hidden touch-none',
          isPanning && 'cursor-grabbing',
        )}
        style={{ backgroundColor: BLUEPRINT_THEME.viewportPad }}
        data-zoom-pan-viewport
        {...pointerHandlers}
      >
        <div
          ref={contentRef}
          className="absolute left-0 top-0 origin-top-left"
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
