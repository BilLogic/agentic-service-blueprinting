/**
 * Chrome-driven canvas resizes.
 *
 * The canvas viewport watches its container with a ResizeObserver so real
 * window resizes re-center the camera. Shell chrome resizes that same
 * container for reasons that carry no navigational intent — the sidebar
 * wipe animation, the tab strip mounting when the first slice tab opens —
 * and the camera must sit still through those.
 *
 * The shell announces those moments here; viewports consult the window and
 * drop resize observations that fall inside it. A module-level window (not
 * a prop or context) because the announcing chrome lives above the tab
 * content and the viewports live several layers below it, with no shared
 * provider in between.
 */

let suppressedUntil = 0

/**
 * Comfortably longer than the 320 ms sidebar width ease. The slack matters:
 * the observer's final callback lands a frame or more after the transition
 * ends, and later still when the main thread is busy — measured overshoot
 * past a 380 ms window on sidebar expand.
 */
export const CHROME_RESIZE_SUPPRESS_MS = 600

/**
 * Ignore container resizes for the next `durationMs`. Safe to call again
 * while a window is already open — the longer deadline wins.
 */
export function suppressCanvasResizeRefit(
  durationMs: number = CHROME_RESIZE_SUPPRESS_MS,
) {
  suppressedUntil = Math.max(suppressedUntil, performance.now() + durationMs)
}

/** True while a chrome-driven resize window is open. */
export function isCanvasResizeRefitSuppressed() {
  return performance.now() < suppressedUntil
}
