import type { CSSProperties } from 'react'
import type { CanvasPoint } from '@/lib/canvasAnnotations'

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
