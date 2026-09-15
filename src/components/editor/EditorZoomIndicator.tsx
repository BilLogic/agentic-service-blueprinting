import { Maximize2, Minus, Plus, RotateCcw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useCanvasZoomChrome } from '@/contexts/CanvasZoomChromeContext'
import { cn } from '@/lib/utils'

/** Elevated chrome shared by the zoom buttons that float over the canvas. */
const ZOOM_CHROME_BUTTON_CLASS =
  'pointer-events-auto shrink-0 rounded-lg border-border bg-card text-muted-foreground shadow-md hover:text-foreground'

type EditorZoomIndicatorProps = {
  /** Exit canvas focus and reframe the full overview. */
  onResetView: () => void
  /** Step the camera in. Omitted when the publisher only has Reset View. */
  zoomIn?: () => void
  /** Step the camera out. Omitted when the publisher only has Reset View. */
  zoomOut?: () => void
  /**
   * Frame the fit target. When this is the viewport hook's function, the
   * button calls it with `{ animate: true }`.
   */
  fitToView?: (options?: { animate?: boolean }) => unknown
  className?: string
}

/** Current canvas zoom with reset and optional zoom/fit controls. */
export function EditorZoomIndicator({
  onResetView,
  zoomIn,
  zoomOut,
  fitToView,
  className,
}: EditorZoomIndicatorProps) {
  return (
    <div
      data-zoom-indicator=""
      className={cn('pointer-events-none flex items-center gap-1', className)}
    >
      {zoomOut ? (
        <Button
          type="button"
          variant="outline"
          size="icon"
          aria-label="Zoom out"
          onClick={zoomOut}
          className={ZOOM_CHROME_BUTTON_CLASS}
        >
          <Minus className="size-3" aria-hidden />
        </Button>
      ) : null}
      {zoomIn ? (
        <Button
          type="button"
          variant="outline"
          size="icon"
          aria-label="Zoom in"
          onClick={zoomIn}
          className={ZOOM_CHROME_BUTTON_CLASS}
        >
          <Plus className="size-3" aria-hidden />
        </Button>
      ) : null}
      {fitToView ? (
        <Button
          type="button"
          variant="outline"
          size="icon"
          aria-label="Fit to view"
          onClick={() => fitToView({ animate: true })}
          className={ZOOM_CHROME_BUTTON_CLASS}
        >
          <Maximize2 className="size-3" aria-hidden />
        </Button>
      ) : null}
      {/* Floats over the canvas, so it wears the same elevated card the
          bottom-center annotation toolbar does — a bare ghost button reads
          as stray text against the board. */}
      <Button
        type="button"
        variant="outline"
        size="sm"
        aria-label="Reset view"
        onClick={onResetView}
        className={cn(ZOOM_CHROME_BUTTON_CLASS, 'h-8 gap-2 px-3 font-medium')}
      >
        <RotateCcw className="size-3" aria-hidden />
        Reset View
      </Button>
    </div>
  )
}

/** Renders Reset View in the canvas navbar when focus mode is active. */
export function NavbarZoomIndicator({ className }: { className?: string }) {
  const ctx = useCanvasZoomChrome()
  if (!ctx?.chrome?.onResetView) return null

  return (
    <EditorZoomIndicator
      onResetView={ctx.chrome.onResetView}
      zoomIn={ctx.chrome.zoomIn}
      zoomOut={ctx.chrome.zoomOut}
      fitToView={ctx.chrome.fitToView}
      className={className}
    />
  )
}
