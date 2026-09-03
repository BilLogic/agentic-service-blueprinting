/**
 * A wheel notch means the same thing on every browser.
 *
 * `WheelEvent` reports its delta in whatever unit the platform felt like:
 * Chromium sends pixels, Firefox sends LINES for a wheel mouse, and a
 * page-mode delta exists too. The camera consumed those numbers raw, so a
 * Firefox notch moved the board `3` pixels — a board that looks frozen —
 * while the same notch in Chromium moved it a hundred. Normalising once,
 * here, is what lets every consumer downstream keep speaking pixels.
 *
 * The multipliers are the well-worn ones (40px a line, 800px a page): they
 * put a Firefox wheel notch (3 lines) at 120px against Chromium's ~100, which
 * is "comparable" in the only sense that matters — the hand cannot tell them
 * apart. The Mac trackpad is untouched by any of this: it already reports
 * pixels, and pixel mode is the identity.
 */

/** `WheelEvent.DOM_DELTA_*`, spelled out — the constants are on the class. */
const DOM_DELTA_PIXEL = 0
const DOM_DELTA_LINE = 1
const DOM_DELTA_PAGE = 2

export const WHEEL_LINE_HEIGHT_PX = 40
export const WHEEL_PAGE_HEIGHT_PX = 800

/**
 * How hard a pixel of wheel pushes the zoom. Tuned against Mac trackpad
 * deltas and deliberately NOT re-tuned — that feel is the baseline this
 * whole normalisation exists to extend to everyone else.
 */
export const WHEEL_ZOOM_RATE = 0.01

/**
 * Ceiling on how much ONE wheel event may zoom, in normalised pixels.
 *
 * A trackpad pinch arrives as dozens of ctrl+wheel events carrying a few
 * pixels each; a mouse wheel arrives as ONE event carrying a whole notch
 * (100px in Chromium, 120 normalised in Firefox). At `WHEEL_ZOOM_RATE` that
 * notch is `e^1 ≈ 2.7×` in a single click of the wheel, which is the Windows
 * complaint. Clamping the exponent's input caps a notch at ~1.27× while
 * leaving every trackpad event — all of them far below the limit — bit-for-bit
 * unchanged.
 */
export const WHEEL_ZOOM_DELTA_LIMIT_PX = 24

export type WheelDeltaInput = {
  deltaX: number
  deltaY: number
  deltaMode: number
}

export type NormalizedWheelDelta = {
  deltaX: number
  deltaY: number
}

function unitToPixels(deltaMode: number): number {
  if (deltaMode === DOM_DELTA_LINE) return WHEEL_LINE_HEIGHT_PX
  if (deltaMode === DOM_DELTA_PAGE) return WHEEL_PAGE_HEIGHT_PX
  // Pixel mode, and anything a future browser invents: trust the number.
  return 1
}

/**
 * The event's deltas in CSS pixels. Sign is preserved exactly, because one
 * consumer (the scrollable-ancestor test) reads nothing else.
 */
export function normalizeWheelDelta(
  event: WheelDeltaInput,
): NormalizedWheelDelta {
  const unit = unitToPixels(
    Number.isFinite(event.deltaMode) ? event.deltaMode : DOM_DELTA_PIXEL,
  )
  const scale = (value: number) => (Number.isFinite(value) ? value * unit : 0)
  return { deltaX: scale(event.deltaX), deltaY: scale(event.deltaY) }
}

/** The scale a ctrl/⌘+wheel event applies, from an already-normalised delta. */
export function wheelZoomScaleFactor(normalizedDeltaY: number): number {
  if (!Number.isFinite(normalizedDeltaY)) return 1
  const clamped = Math.max(
    -WHEEL_ZOOM_DELTA_LIMIT_PX,
    Math.min(WHEEL_ZOOM_DELTA_LIMIT_PX, normalizedDeltaY),
  )
  return Math.exp(-clamped * WHEEL_ZOOM_RATE)
}
