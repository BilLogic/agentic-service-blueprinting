/**
 * What counts as scrollable inside the canvas — decided ONCE, for both input
 * paths that need the answer.
 *
 * The wheel path always knew: a delta over an overflowing region belongs to
 * that region, not to the camera (an overflowing grid, a text editor).
 * The touch path answered the opposite question by never asking it — every
 * `touchmove` in the subtree was prevented, on the stated grounds that the
 * board holds no scrollable region. It does: an overflowing band
 * (`BlueprintPathBand`) is one a few levels inside the viewport, so a finger could not reach rows the
 * same wheel reached happily.
 *
 * Both paths now walk this one function, which is why they cannot drift apart
 * again. They differ only in what they do with the answer, and that difference
 * is honest: the wheel knows its direction and can hand a delta on to the
 * camera when the region has hit its end (native scroll chaining), while a
 * touch is claimed or released before the finger has said which way it is
 * going.
 */

export type ScrollableRegion = {
  element: HTMLElement
  scrollsX: boolean
  scrollsY: boolean
}

const SCROLLING_OVERFLOW = /auto|scroll/

/**
 * Every genuinely scrolling element between `target` and `container`,
 * innermost first. "Genuinely" is both halves: an `overflow` that scrolls AND
 * content that actually overflows — a region with nothing to scroll is not a
 * region, it is canvas.
 *
 * `container` itself is excluded: it is the viewport, its overflow is hidden,
 * and the camera is its scroll.
 */
export function findScrollableRegions(
  target: Node | null,
  container: HTMLElement,
): ScrollableRegion[] {
  const regions: ScrollableRegion[] = []
  let node: Node | null = target
  while (node && node !== container) {
    if (node instanceof HTMLElement) {
      const style = getComputedStyle(node)
      const scrollsY =
        node.scrollHeight > node.clientHeight &&
        SCROLLING_OVERFLOW.test(style.overflowY)
      const scrollsX =
        node.scrollWidth > node.clientWidth &&
        SCROLLING_OVERFLOW.test(style.overflowX)
      if (scrollsX || scrollsY) regions.push({ element: node, scrollsX, scrollsY })
    }
    node = node.parentNode
  }
  return regions
}

/** Whether a finger landing here should be left to the browser to scroll. */
export function hasScrollableRegion(
  target: Node | null,
  container: HTMLElement,
): boolean {
  return findScrollableRegions(target, container).length > 0
}

/**
 * True when one of these regions can still move in the direction of this
 * wheel delta — in which case the wheel belongs to it, not to the camera.
 *
 * At-the-end counts as "cannot": a list scrolled to its bottom hands further
 * downward wheel to the canvas, which is how native scroll chaining behaves
 * everywhere else.
 */
export function regionsCanConsumeWheel(
  regions: readonly ScrollableRegion[],
  deltaX: number,
  deltaY: number,
): boolean {
  for (const { element, scrollsX, scrollsY } of regions) {
    if (scrollsY && deltaY !== 0) {
      const atTop = element.scrollTop <= 0
      const atBottom =
        element.scrollTop + element.clientHeight >= element.scrollHeight - 1
      if ((deltaY < 0 && !atTop) || (deltaY > 0 && !atBottom)) return true
    }
    if (scrollsX && deltaX !== 0) {
      const atLeft = element.scrollLeft <= 0
      const atRight =
        element.scrollLeft + element.clientWidth >= element.scrollWidth - 1
      if ((deltaX < 0 && !atLeft) || (deltaX > 0 && !atRight)) return true
    }
  }
  return false
}

/** The wheel path's whole question, in one call. */
export function scrollableAncestorCanConsume(
  target: Node | null,
  container: HTMLElement,
  deltaX: number,
  deltaY: number,
): boolean {
  return regionsCanConsumeWheel(
    findScrollableRegions(target, container),
    deltaX,
    deltaY,
  )
}
