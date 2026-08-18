import { useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { Eraser, Pencil } from 'lucide-react'
import { useCanvasAnnotations } from '@/contexts/canvasAnnotationContext'
import { ANNOTATION_INK, ANNOTATION_PAPER } from '@/lib/canvasAnnotations'

/** Fixed on-screen tool cursor size (px). */
const CURSOR_SCREEN_PX = 32

const TOOL_HOTSPOT = {
  pen: { x: 3, y: 30 },
  eraser: { x: 6, y: 28 },
} as const

const HIDE_OVER_SELECTOR =
  '[data-annotation-toolbar], [data-zoom-indicator], [data-canvas-nav], [data-slide-sticky-header], [data-editor-navbar]'

type CursorTool = keyof typeof TOOL_HOTSPOT

/**
 * Fixed-position tool cursor portaled to document.body so zoom, overflow, and
 * layer hit-testing cannot clip or detach it from the pointer.
 */
export function CanvasPenCursor() {
  const { tool, penColor } = useCanvasAnnotations()
  const cursorRef = useRef<HTMLDivElement | null>(null)
  const cursorTool: CursorTool | null =
    tool === 'pen' || tool === 'eraser' ? tool : null

  useEffect(() => {
    if (!cursorTool) {
      delete document.documentElement.dataset.penTool
      return
    }

    document.documentElement.dataset.penTool = cursorTool
    const hotspot = TOOL_HOTSPOT[cursorTool]

    const onMove = (event: PointerEvent) => {
      const cursor = cursorRef.current
      if (!cursor) return

      const target = event.target
      if (target instanceof Element && target.closest(HIDE_OVER_SELECTOR)) {
        cursor.hidden = true
        return
      }

      const viewports = document.querySelectorAll('[data-zoom-pan-viewport]')
      let overViewport = false
      for (const viewport of viewports) {
        const rect = viewport.getBoundingClientRect()
        if (
          event.clientX >= rect.left &&
          event.clientX <= rect.right &&
          event.clientY >= rect.top &&
          event.clientY <= rect.bottom
        ) {
          overViewport = true
          break
        }
      }

      if (!overViewport) {
        cursor.hidden = true
        return
      }

      cursor.hidden = false
      cursor.style.transform = `translate3d(${event.clientX - hotspot.x}px, ${event.clientY - hotspot.y}px, 0)`
    }

    document.addEventListener('pointermove', onMove, {
      capture: true,
      passive: true,
    })

    return () => {
      document.removeEventListener('pointermove', onMove, { capture: true })
      delete document.documentElement.dataset.penTool
    }
  }, [cursorTool])

  if (!cursorTool || typeof document === 'undefined') return null

  const Icon = cursorTool === 'eraser' ? Eraser : Pencil
  // A white pen would be invisible as a cursor tint, so it falls back to ink.
  const fill =
    cursorTool === 'pen' && penColor !== ANNOTATION_PAPER
      ? penColor
      : ANNOTATION_INK

  return createPortal(
    <div
      ref={cursorRef}
      aria-hidden
      hidden
      data-pen-cursor=""
      className="pointer-events-none fixed top-0 left-0 z-[9999] will-change-transform"
      style={{ transformOrigin: '0 0' }}
    >
      <Icon
        className="drop-shadow-md"
        style={{ width: CURSOR_SCREEN_PX, height: CURSOR_SCREEN_PX }}
        strokeWidth={2}
        absoluteStrokeWidth
        // Mode-invariant white, not `--color-gray-100`: the outline separates
        // the cursor from whatever ink sits under it, and must not flip dark
        // with the theme. `--colors-white` is global.css's fixed primitive —
        // the same one Supabase keeps for exactly this kind of use.
        color="hsl(var(--colors-white))"
        fill={fill}
      />
    </div>,
    document.body,
  )
}
