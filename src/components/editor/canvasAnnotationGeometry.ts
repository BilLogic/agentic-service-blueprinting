import type { CSSProperties } from 'react'
import type {
  CanvasPoint,
  PlacedAnnotation,
} from '@/lib/canvasAnnotations'

/**
 * The annotation layer's board-space arithmetic, held apart from the machine
 * that calls it. Every function here is a function of its arguments alone: the
 * layer owns the pointers and the state, and asks these where things are.
 */

/** Keep annotation chrome at a constant screen size as the canvas zooms. */
export function chromeScreenScale(zoom: number): number {
  return 1 / Math.max(zoom, 0.05)
}

/** Where a floating style bar sits above the box it styles, in board space. */
export function chromeAnchorStyle(
  x: number,
  y: number,
  width: number,
  zoom: number,
  gap = 12,
): CSSProperties {
  const scale = chromeScreenScale(zoom)
  return {
    left: x + width / 2,
    top: Math.max(0, y - gap),
    transform: `translate(-50%, -100%) scale(${scale})`,
    transformOrigin: 'center bottom',
  }
}

/** Un-project a client point into the layer's own units, through the camera. */
export function clientToLocal(
  el: HTMLElement,
  clientX: number,
  clientY: number,
): CanvasPoint {
  const rect = el.getBoundingClientRect()
  const scaleX = rect.width / Math.max(el.offsetWidth, 1)
  const scaleY = rect.height / Math.max(el.offsetHeight, 1)
  return {
    x: (clientX - rect.left) / scaleX,
    y: (clientY - rect.top) / scaleY,
  }
}

/** Live CSS scale of the annotation layer (more reliable than React zoom state). */
export function getLayerScale(el: HTMLElement): number {
  const rect = el.getBoundingClientRect()
  return Math.max(rect.width / Math.max(el.offsetWidth, 1), 0.05)
}

/** An SVG path `d` through a pen stroke's points. */
export function pointsToPath(points: CanvasPoint[]): string {
  if (points.length === 0) return ''
  return points
    .map((point, index) =>
      index === 0 ? `M ${point.x} ${point.y}` : `L ${point.x} ${point.y}`,
    )
    .join(' ')
}

/**
 * The box a text mark occupies, from its font size alone.
 *
 * A text mark carries no width or height of its own — it is a font size and a
 * string — so the box has to be derived, and it was derived twice: the mark
 * drew itself at a floor of 120 while the layer handed the drag and resize
 * machine a floor of 80. Both stand for the same box, so the two floors were a
 * disagreement rather than two rules.
 *
 * Nobody ever saw it, and that is worth saying rather than dressing up: a drag
 * takes only the mark's `x` and `y`, and a text resize scales the font off the
 * box's HEIGHT alone (`CanvasAnnotationLayer.tsx`, where `originFontSize` is
 * set) and discards the width it was handed. So the 80 was a number nothing
 * read. It is gone because a second floor for one box is a bug waiting for its
 * first reader, not because it was already biting.
 */
const ANNOTATION_TEXT_MIN_WIDTH = 120
const ANNOTATION_TEXT_MIN_HEIGHT = 32

export function annotationTextBox(fontSize: number): {
  width: number
  height: number
} {
  return {
    width: Math.max(ANNOTATION_TEXT_MIN_WIDTH, fontSize * 8),
    height: Math.max(ANNOTATION_TEXT_MIN_HEIGHT, fontSize * 2.2),
  }
}

/**
 * Where a mark sits and how big it is, in board units — what the drag and
 * resize machine is handed, and what a floating style bar anchors over. Every
 * kind but text carries its own box; text's is a reading of its font size.
 */
export function annotationMarkBox(mark: PlacedAnnotation): {
  x: number
  y: number
  width: number
  height: number
  fontSize?: number
} {
  if (mark.type === 'text') {
    return {
      x: mark.x,
      y: mark.y,
      ...annotationTextBox(mark.fontSize),
      fontSize: mark.fontSize,
    }
  }
  return { x: mark.x, y: mark.y, width: mark.width, height: mark.height }
}
