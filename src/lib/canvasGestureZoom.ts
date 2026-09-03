/**
 * WebKit's `gesture*` events, as a zoom.
 *
 * Safari ships non-standard `gesturestart`/`gesturechange`/`gestureend`
 * carrying a CUMULATIVE `scale` — 1 at the start of the pinch, 1.4 when the
 * fingers have spread 40%. The camera wants a per-event RATIO, because it
 * multiplies. These two functions are that conversion plus the gate that
 * decides whether this platform's gesture is the canvas's to apply at all.
 *
 * The gate exists because the two pinch mechanisms overlap on exactly one
 * platform. On iOS a trackpad pinch is also a pair of touch pointers, and the
 * pointer map already zooms from them; applying the gesture's scale as well
 * would square every step. On macOS a trackpad pinch produces gesture events
 * and NOTHING else — no touch pointers, no synthesised ctrl+wheel — which is
 * why the canvas sat still there for so long. So: apply the gesture only when
 * no touch pointer is down.
 */

/** The scale to multiply the camera by, from two cumulative gesture scales. */
export function gestureScaleFactor(
  previousScale: number,
  nextScale: number,
): number {
  if (!Number.isFinite(nextScale) || nextScale <= 0) return 1
  const from =
    Number.isFinite(previousScale) && previousScale > 0 ? previousScale : 1
  return nextScale / from
}

/**
 * True when this gesture is the canvas's to apply — i.e. no touch pointer is
 * down, so the pointer map's pinch is not already handling it.
 */
export function shouldApplyGestureZoom(activeTouchPointerCount: number): boolean {
  return activeTouchPointerCount === 0
}
