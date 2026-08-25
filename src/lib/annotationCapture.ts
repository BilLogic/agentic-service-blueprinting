import type { CanvasAnnotation } from '@/lib/canvasAnnotations'

/**
 * Getting marks *out* of the scratch lane.
 *
 * Annotations are deliberately not persisted. Saving every stroke would turn
 * markup into a record, and that changes what it is: people stop scribbling
 * once a scribble is permanent and shared, and costing nothing is the whole
 * value of the lane.
 *
 * So the lane stays ephemeral and capture becomes a decision. This is what
 * that decision produces.
 */

/** Bounding box of a mark, in canvas coordinates. */
export type MarkBounds = {
  left: number
  top: number
  right: number
  bottom: number
}

export type CapturedMark = {
  id: string
  type: CanvasAnnotation['type']
  bounds: MarkBounds
  /** Text carried by the mark, for sticky notes and text labels. */
  text?: string
  /** Cells the mark overlaps, by id. Empty when it sits over blank canvas. */
  overlaps: string[]
}

/**
 * A mark's extent, whatever kind it is.
 *
 * Pen strokes are a point list, shapes are two corners, text and stickies are
 * an origin plus a measured size. Returning one shape for all of them is what
 * lets overlap be answered once rather than per type.
 */
export function markBounds(annotation: CanvasAnnotation): MarkBounds | null {
  if (annotation.type === 'pen') {
    if (annotation.points.length === 0) return null
    let left = Infinity
    let top = Infinity
    let right = -Infinity
    let bottom = -Infinity
    for (const point of annotation.points) {
      left = Math.min(left, point.x)
      right = Math.max(right, point.x)
      top = Math.min(top, point.y)
      bottom = Math.max(bottom, point.y)
    }
    return { left, top, right, bottom }
  }

  if (annotation.type === 'text') {
    // Text carries no measured box — only an origin and a font size. The line
    // height is the honest approximation available without the DOM, and it is
    // enough: a label is used to point at the cell it sits on.
    return {
      left: annotation.x,
      top: annotation.y,
      right: annotation.x,
      bottom: annotation.y + annotation.fontSize,
    }
  }

  return {
    left: annotation.x,
    top: annotation.y,
    right: annotation.x + annotation.width,
    bottom: annotation.y + annotation.height,
  }
}

/** Do two boxes touch at all? Intersect, not contain — a partial mark counts. */
export function overlaps(mark: MarkBounds, cell: MarkBounds): boolean {
  return !(
    cell.right < mark.left ||
    cell.left > mark.right ||
    cell.bottom < mark.top ||
    cell.top > mark.bottom
  )
}

/**
 * Turn the live marks into something an agent can read.
 *
 * **Structure, not a screenshot.** The app already knows where every cell is,
 * so resolving a circle to "you circled these two cells" is exact, costs a
 * fraction of an image, and — the part that matters — produces a message whose
 * contents can be listed to the person sending it. Nothing travels that they
 * cannot see named.
 *
 * `cellRects` is supplied by the caller because only the rendering surface
 * knows the current camera; this stays a pure function so it can be tested.
 */
export function captureMarks(
  annotations: readonly CanvasAnnotation[],
  cellRects: ReadonlyArray<{ cellId: string; bounds: MarkBounds }>,
): CapturedMark[] {
  const captured: CapturedMark[] = []
  for (const annotation of annotations) {
    const bounds = markBounds(annotation)
    if (!bounds) continue
    const text = annotation.type === 'pen' ? undefined : annotation.text
    captured.push({
      id: annotation.id,
      type: annotation.type,
      bounds,
      ...(text ? { text } : {}),
      overlaps: cellRects
        .filter((entry) => overlaps(bounds, entry.bounds))
        .map((entry) => entry.cellId),
    })
  }
  return captured
}

/**
 * One line per mark, for the confirmation shown before anything is sent.
 *
 * Deliberately readable rather than complete: the point is that a person can
 * check what they are about to hand over at a glance.
 */
export function describeMarks(marks: readonly CapturedMark[]): string[] {
  return marks.map((mark) => {
    const noun = mark.type === 'pen' ? 'A drawn mark' : `A ${mark.type}`
    const over =
      mark.overlaps.length === 0
        ? 'over blank canvas'
        : `over ${mark.overlaps.length} cell${mark.overlaps.length === 1 ? '' : 's'}`
    return mark.text ? `${noun} reading “${mark.text}”, ${over}` : `${noun} ${over}`
  })
}
