import { useEffect, useRef, useState } from 'react'
import { useCanvasAnnotationTool } from '@/contexts/canvasAnnotationContext'
import { useCellPick } from '@/contexts/cellPickContext'
import { useCanvasModeValue } from '@/contexts/canvasModeContext'
import { getCanvasSpaceHeld } from '@/lib/canvasKeyboardState'
import { pickModeForMarquee } from '@/lib/cellPickGrammar'

/** Chrome a marquee must never start on — these own their own drags. */
const IGNORE = [
  '[data-blueprint-cell-anchor]',
  '[data-annotation-toolbar]',
  '[data-cell-detail-panel]',
  '[data-editor-navbar]',
  '[data-canvas-nav]',
  '[data-zoom-indicator]',
  '[data-slide-sticky-header]',
  'button',
  'input',
  'textarea',
].join(', ')

/** Below this the gesture was a click, not a drag — don't clear on a stray px. */
const DRAG_THRESHOLD_PX = 4

type Rect = { left: number; top: number; width: number; height: number }

/**
 * Drag a rectangle on empty canvas to select the cells it touches.
 *
 * Intersect, not contain: a partly-covered cell counts, which is what Figma
 * does and what makes a quick sweep across a lane usable at any zoom.
 *
 * The gesture is claimed in the **capture phase** on the viewport root, so the
 * pan handler never sees the pointerdown. That is deliberately done from here
 * rather than by teaching `useZoomPanViewport` about modes: the camera is the
 * one piece of this codebase where a regression is expensive, and this way it
 * keeps exactly the behaviour it has today.
 *
 * Panning stays available on space-drag, the trackpad and the wheel — none of
 * which route through this listener — and, since a slice may span blueprints
 * that are nowhere near each other, on the Hand tool, which suspends this
 * listener outright.
 */
export function MarqueeSelection() {
  const mode = useCanvasModeValue()
  const { tool } = useCanvasAnnotationTool()
  const pick = useCellPick()
  const [rect, setRect] = useState<Rect | null>(null)
  // Refs, not state: these change on every pointermove and must not re-render.
  const origin = useRef<{ x: number; y: number; additive: boolean } | null>(null)
  const moved = useRef(false)

  useEffect(() => {
    // Hand stands down entirely: the whole point of the tool is that a drag
    // means "move the camera", and this listener claims the gesture in the
    // capture phase before the pan handler can ever see it.
    if (mode !== 'design' || tool === 'hand' || !pick) return
    const root = document.querySelector('[data-zoom-pan-root]')
    if (!(root instanceof HTMLElement)) return

    const onPointerDown = (event: PointerEvent) => {
      // Middle-button and Space temporarily belong to the camera even in
      // Design + Select. The selected tool is not mutated.
      if (event.button !== 0 || getCanvasSpaceHeld()) return
      const target = event.target
      if (target instanceof Element && target.closest(IGNORE)) return

      origin.current = {
        x: event.clientX,
        y: event.clientY,
        additive: event.shiftKey,
      }
      moved.current = false
      // Claim the gesture before the viewport's pan handler runs.
      event.stopPropagation()
      event.preventDefault()
    }

    const onPointerMove = (event: PointerEvent) => {
      const start = origin.current
      if (!start) return
      const dx = event.clientX - start.x
      const dy = event.clientY - start.y
      if (!moved.current && Math.hypot(dx, dy) < DRAG_THRESHOLD_PX) return
      moved.current = true
      setRect({
        left: Math.min(start.x, event.clientX),
        top: Math.min(start.y, event.clientY),
        width: Math.abs(dx),
        height: Math.abs(dy),
      })
    }

    const onPointerUp = (event: PointerEvent) => {
      const start = origin.current
      origin.current = null
      if (!start) return

      if (!moved.current) {
        // A click on empty canvas does **not** clear.
        //
        // It does in every canvas tool, and it is wrong here, because this
        // selection is not the subject of the next verb — it is a set being
        // assembled over minutes, across blueprints that need panning between.
        // Every miss between two cells threw the work away, and a gesture that
        // destroys minutes of work while meaning nothing is not a gesture.
        // Clearing is the ✕ in the bar, where it can be aimed at.
        setRect(null)
        return
      }

      // Recomputed from the gesture rather than read back out of state — the
      // rendered rectangle is a frame of this, not the source of truth.
      const marquee: Rect = {
        left: Math.min(start.x, event.clientX),
        top: Math.min(start.y, event.clientY),
        width: Math.abs(event.clientX - start.x),
        height: Math.abs(event.clientY - start.y),
      }
      setRect(null)
      moved.current = false

      const hits = Array.from(
        root.querySelectorAll(
          '[data-blueprint-cell][data-blueprint-cell-interactive]',
        ),
      )
        .filter((cell) => intersects(cell.getBoundingClientRect(), marquee))
        .map((cell) => ({
          id: cell.getAttribute('data-blueprint-cell'),
          step: Number.parseInt(cell.getAttribute('data-step-index') ?? '', 10),
        }))
        .filter((entry): entry is { id: string; step: number } => entry.id !== null)

      // Reading order: columns left to right, lanes top to bottom within a
      // column. DOM order is lane-major, so sort by step and let the stable
      // sort keep lane order inside each column.
      hits.sort((left, right) => (left.step || 0) - (right.step || 0))
      const ids = [...new Set(hits.map((entry) => entry.id))]
      // A sweep says "these", not "these as well" — replace unless shift asked
      // to widen. This is the one gesture that still narrows a selection in one
      // move, now that a plain click gathers. (See `cellPickGrammar`.)
      if (ids.length > 0) {
        pick.pickMany(ids, pickModeForMarquee({ shiftKey: start.additive }))
      }
    }

    // A cancelled gesture (touch takeover, browser gesture, window blur)
    // must not leave the ghost rectangle glued to the screen.
    const onCancel = () => {
      origin.current = null
      moved.current = false
      setRect(null)
    }

    root.addEventListener('pointerdown', onPointerDown, true)
    window.addEventListener('pointermove', onPointerMove)
    window.addEventListener('pointerup', onPointerUp)
    window.addEventListener('pointercancel', onCancel)
    window.addEventListener('blur', onCancel)
    return () => {
      root.removeEventListener('pointerdown', onPointerDown, true)
      window.removeEventListener('pointermove', onPointerMove)
      window.removeEventListener('pointerup', onPointerUp)
      window.removeEventListener('pointercancel', onCancel)
      window.removeEventListener('blur', onCancel)
    }
  }, [mode, pick, tool])

  if (!rect) return null

  return (
    <div
      aria-hidden
      data-marquee=""
      className="pointer-events-none fixed z-50 rounded-sm border border-primary bg-primary/10"
      style={{
        left: rect.left,
        top: rect.top,
        width: rect.width,
        height: rect.height,
      }}
    />
  )
}

function intersects(cell: DOMRect, marquee: Rect): boolean {
  return !(
    cell.right < marquee.left ||
    cell.left > marquee.left + marquee.width ||
    cell.bottom < marquee.top ||
    cell.top > marquee.top + marquee.height
  )
}
