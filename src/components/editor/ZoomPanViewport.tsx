import { useEffect, type ReactNode } from 'react'
import { useZoomPanViewport } from '@/hooks/useZoomPanViewport'
import { EditorSequenceNav } from '@/components/editor/EditorSequenceNav'
import { EditorZoomIndicator } from '@/components/editor/EditorZoomIndicator'
import { registerFocusCells } from '@/lib/canvasFocusCells'
import { BLUEPRINT_THEME } from '@/lib/blueprintTheme'
import { cn } from '@/lib/utils'

type ZoomPanViewportProps = {
  children: ReactNode
  className?: string
  resetKey?: string
  panIgnoreSelector?: string
  fitSelector?: string
  showSequenceNav?: boolean
  refitOnResize?: boolean
  /**
   * Registers this viewport's `focusCells` in the module registry under
   * this key (the focused scenario's slide id) — the fly-to-cell pipeline
   * for the difference ledger and the divergence strip.
   */
  focusCellsKey?: string
}

export function ZoomPanViewport({
  children,
  className,
  resetKey,
  panIgnoreSelector,
  fitSelector,
  showSequenceNav = true,
  refitOnResize = true,
  focusCellsKey,
}: ZoomPanViewportProps) {
  const {
    containerRef,
    contentRef,
    zoom,
    isPanning,
    pointerHandlers,
    focusCells,
  } = useZoomPanViewport({
    resetKey,
    panIgnoreSelector,
    fitSelector,
    refitOnResize,
  })

  // Cross-tree fly-to-cell: portalled surfaces (the ledger drawer) resolve
  // this at call time from the module registry — `focusCells` is
  // identity-stable, so this re-registers only on key moves.
  useEffect(() => {
    if (!focusCellsKey) return
    return registerFocusCells(focusCellsKey, focusCells)
  }, [focusCells, focusCellsKey])

  return (
    <div
      className={cn('relative min-h-0 flex-1', className)}
      data-zoom-pan-root
    >
      <div
        ref={containerRef}
        className={cn(
          'absolute inset-0 overflow-hidden touch-none dark:bg-[#1C1C1E]',
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
          {children}
        </div>
      </div>

      {showSequenceNav ? <EditorSequenceNav /> : null}
      <EditorZoomIndicator zoom={zoom} />
    </div>
  )
}