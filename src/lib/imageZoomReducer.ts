/**
 * Everything an image viewer decides about scale and position, as arithmetic.
 *
 * A reader opens an image, pushes the wheel, pinches, clicks and drags; each
 * of those has to become a scale and an offset, and the cursor has to say
 * which one the next gesture will be. None of that needs a DOM, so none of
 * it lives in one — the hook that owns the state calls these functions and
 * writes the result, and the behaviour is argued about here, in numbers,
 * rather than through a rendered popup.
 *
 * The genuinely hard cross-platform parts are NOT re-derived here. A wheel
 * notch means different numbers on different browsers and a macOS trackpad
 * pinch arrives as a cumulative gesture scale; `canvasWheelDelta` and
 * `canvasGestureZoom` already solved both for the board, and this module
 * consumes them so that the two surfaces cannot come to disagree about what
 * one notch of wheel is worth.
 *
 * Coordinates. An anchor is a point inside the viewport, measured in CSS
 * pixels from its top-left corner, which is what a pointer event reports
 * against the popup's box. The offset is the image CENTRE's displacement
 * from the viewport centre, so fit is `{0, 0}` in every image and the
 * clamping below is symmetric instead of having to subtract a top-left
 * corner that moves with the scale.
 */
import { gestureScaleFactor } from '@/lib/canvasGestureZoom'
import {
  normalizeWheelDelta,
  wheelZoomScaleFactor,
  type WheelDeltaInput,
} from '@/lib/canvasWheelDelta'

/**
 * The guard on a free gesture, as a multiple of natural size.
 *
 * Wheel and pinch are continuous — they stop where the hand stops, and all
 * they ask of this module is a point past which there is nothing left to
 * read. Three times natural size is that point: past it a screenshot is
 * mush. It is deliberately NOT where a click goes. A stop measured against
 * the image while fit is measured against the viewport is the pairing that
 * made a click on a wide display appear to do nothing, and the two stops
 * below are what replaced it.
 */
export const IMAGE_ZOOM_GESTURE_MAX_NATURAL_MULTIPLE = 3

/**
 * The least a click may be worth, as the ratio between the two stops.
 *
 * A ratio, not a scale, because fit moves with the viewport and a rule
 * stated in scales would mean something different on every screen: 880px of
 * artwork fits at 1.14 on a laptop and at 2.18 on a wide display. Doubling
 * is a change the eye reads as a change; a fifth reads as a click that did
 * nothing.
 */
export const IMAGE_ZOOM_MIN_CLICK_STEP = 2

/**
 * How far a pointer may travel between press and release and still be a
 * click. A distance, not a timer: a timer punishes a slow deliberate click,
 * and it would force a fake clock into every test of this file.
 */
export const IMAGE_CLICK_DRAG_THRESHOLD_PX = 4

/**
 * Scale comparisons decide which of the two stops a click is standing on,
 * and they are asked of a scale the clamp may have arrived at by a different
 * route than the one that named it. A relative tolerance keeps that decision
 * from turning on the last bit of a float.
 */
const SCALE_TOLERANCE = 1e-9

export type ImageSize = { width: number; height: number }
export type ImagePoint = { x: number; y: number }

export type ImageZoomViewport = {
  /** The popup's content box, in CSS pixels. */
  viewport: ImageSize
  /** The image's intrinsic size, in CSS pixels. */
  natural: ImageSize
  /** Multiplier on natural size: 1 is natural, `fitImageScale` is the floor. */
  scale: number
  /** The image centre's displacement from the viewport centre, in screen px. */
  offset: ImagePoint
}

/** The cursors this viewer offers, spelled as the CSS keywords they become. */
export type ImageZoomCursor = 'zoom-in' | 'zoom-out' | 'grab' | 'grabbing'

const isMeasured = (size: ImageSize): boolean =>
  Number.isFinite(size.width) &&
  Number.isFinite(size.height) &&
  size.width > 0 &&
  size.height > 0

/** `-0` compares and renders as its own number, and nobody ever means it. */
const zeroSafe = (value: number): number => (value === 0 ? 0 : value)

const sameScale = (a: number, b: number): boolean =>
  Math.abs(a - b) <= Math.max(1, Math.abs(b)) * SCALE_TOLERANCE

/**
 * The scale at which the image exactly fills the viewport in one axis.
 *
 * This is the floor for every image large enough to need shrinking, which is
 * the whole reason the popup is fullscreen — see `imageScaleBounds` for the
 * one shape where the guard caps it. Before either box has been
 * measured — a first render, an image whose `naturalWidth` is still 0 —
 * there is no fit to compute, and natural size is the honest answer rather
 * than a division by zero that poisons every offset downstream.
 */
export function fitImageScale(viewport: ImageSize, natural: ImageSize): number {
  if (!isMeasured(viewport) || !isMeasured(natural)) return 1
  return Math.min(
    viewport.width / natural.width,
    viewport.height / natural.height,
  )
}

/**
 * The two scales a click chooses between: fit, and the one stop above it.
 *
 * Natural size is the meaningful place to stop. It is the scale a
 * screenshot's text was captured at, the scale a reader cannot arrive at by
 * pushing a wheel, and past it there is no further detail to uncover. But it
 * is measured against the image while fit is measured against the viewport,
 * so on a wide display the two cross: 880px of artwork fits at 2.18 there,
 * and a stop at natural size would sit BELOW the scale the viewer opened at.
 *
 * So the stop is whichever is higher — natural size, or a doubling of fit.
 * Natural size wherever it can be had, and a visible jump everywhere else,
 * because a toggle that lands where the reader already stands reads as a
 * broken control rather than as an answer. Scale is a multiple of natural
 * size, which is why natural size is the literal 1 below.
 *
 * The lower stop is the FLOOR rather than the raw fit scale, and the two
 * differ for one shape: an image small enough that fitting it would blow it
 * past the guard. Nothing is floating small there — the picture is simply
 * tiny, and stretching a hundred-pixel image across the viewport produces
 * exactly the mush the guard exists to prevent — so it opens at the guard,
 * and the stop above is stated against the scale it actually opened at.
 */
function imageZoomStops(
  viewport: ImageSize,
  natural: ImageSize,
): { fit: number; ceiling: number } {
  const fit = Math.min(
    fitImageScale(viewport, natural),
    IMAGE_ZOOM_GESTURE_MAX_NATURAL_MULTIPLE,
  )
  return { fit, ceiling: Math.max(1, fit * IMAGE_ZOOM_MIN_CLICK_STEP) }
}

/**
 * The scales this image may take, floor first — the range a free gesture
 * moves inside, which is wider than the two stops a click uses.
 *
 * The top of the range is the guard, except where the click's own stop is
 * above it. That is the tiny image again: its floor is already the guard, so
 * its stop is twice the guard, and a range that stopped short would clamp
 * the click's destination back onto its origin and hand the reader a gesture
 * that does nothing. Where the two disagree the stop wins, and a pinch is
 * allowed to follow a click up there rather than being held at a scale a
 * click can pass.
 */
function imageScaleBounds(
  viewport: ImageSize,
  natural: ImageSize,
): { min: number; max: number } {
  const { fit, ceiling } = imageZoomStops(viewport, natural)
  return {
    min: fit,
    max: Math.max(IMAGE_ZOOM_GESTURE_MAX_NATURAL_MULTIPLE, ceiling),
  }
}

export function clampImageScale(
  scale: number,
  viewport: ImageSize,
  natural: ImageSize,
): number {
  const { min, max } = imageScaleBounds(viewport, natural)
  if (!Number.isFinite(scale)) return min
  return Math.min(max, Math.max(min, scale))
}

/**
 * How far the image centre may travel from the viewport centre before an
 * edge comes inside the frame, per axis.
 *
 * Zero on an axis the image does not overflow, which is what makes "a drag
 * at fit does not pan" fall out of the clamp instead of needing a guard: at
 * fit the image overflows nothing.
 */
function panLimits(
  scale: number,
  viewport: ImageSize,
  natural: ImageSize,
): ImagePoint {
  if (!isMeasured(viewport) || !isMeasured(natural)) return { x: 0, y: 0 }
  return {
    x: Math.max(0, (natural.width * scale - viewport.width) / 2),
    y: Math.max(0, (natural.height * scale - viewport.height) / 2),
  }
}

/**
 * The offset with the image held against the viewport: never a gap along an
 * axis it overflows, and centred along one it does not.
 */
function clampOffset(
  offset: ImagePoint,
  scale: number,
  viewport: ImageSize,
  natural: ImageSize,
): ImagePoint {
  const limit = panLimits(scale, viewport, natural)
  const axis = (value: number, bound: number) =>
    zeroSafe(
      Number.isFinite(value) ? Math.min(bound, Math.max(-bound, value)) : 0,
    )
  return { x: axis(offset.x, limit.x), y: axis(offset.y, limit.y) }
}

/**
 * The viewer's opening state, and the state a sibling step returns to.
 *
 * Stepping deliberately drops the scale and pan the reader had built up:
 * carrying them across would have to reason about two images with different
 * aspect ratios, which is more than this state is worth.
 */
export function fitImageZoom(
  viewport: ImageSize,
  natural: ImageSize,
): ImageZoomViewport {
  return {
    viewport,
    natural,
    // The lower STOP rather than the raw fit scale, and not the clamp
    // either: the range a free gesture moves inside now reaches above the
    // guard for a small enough image, so clamping the raw fit would open one
    // of those at twice the guard rather than at the floor.
    scale: imageZoomStops(viewport, natural).fit,
    offset: { x: 0, y: 0 },
  }
}

/**
 * Rescales while holding the image point under `anchor` where it is.
 *
 * Every zoom in this module goes through here, so a wheel notch and a click
 * cannot end up anchoring differently. The clamp on the way out is what makes
 * a zoom out land back at fit dead centre rather than leaving the image
 * hanging off one side at the scale it was dragged to.
 */
export function zoomImageToScale(
  state: ImageZoomViewport,
  targetScale: number,
  anchor: ImagePoint,
): ImageZoomViewport {
  const scale = clampImageScale(targetScale, state.viewport, state.natural)
  const ratio =
    state.scale > 0 && Number.isFinite(state.scale) ? scale / state.scale : 1
  const from = {
    x: Number.isFinite(anchor.x) ? anchor.x - state.viewport.width / 2 : 0,
    y: Number.isFinite(anchor.y) ? anchor.y - state.viewport.height / 2 : 0,
  }
  const offset = {
    x: from.x + (state.offset.x - from.x) * ratio,
    y: from.y + (state.offset.y - from.y) * ratio,
  }
  return {
    ...state,
    scale,
    offset: clampOffset(offset, scale, state.viewport, state.natural),
  }
}

/** Multiplies the scale — the shape both continuous gestures arrive in. */
export function zoomImageByFactor(
  state: ImageZoomViewport,
  factor: number,
  anchor: ImagePoint,
): ImageZoomViewport {
  if (!Number.isFinite(factor) || factor <= 0) return state
  return zoomImageToScale(state, state.scale * factor, anchor)
}

/**
 * One wheel event, in whatever unit the browser reported it, as a zoom.
 *
 * Continuous: no step, no snap, and the caller is expected not to tween it —
 * a tween on a gesture the hand is still making reads as lag.
 */
export function zoomImageByWheel(
  state: ImageZoomViewport,
  event: WheelDeltaInput,
  anchor: ImagePoint,
): ImageZoomViewport {
  const { deltaY } = normalizeWheelDelta(event)
  return zoomImageByFactor(state, wheelZoomScaleFactor(deltaY), anchor)
}

/**
 * One step of a trackpad pinch, from the cumulative scales WebKit reports.
 *
 * Whether this platform's pinch is ours to apply at all is the caller's
 * question — `shouldApplyGestureZoom` answers it from the touch pointers the
 * caller can see, and this module cannot.
 */
export function zoomImageByGesture(
  state: ImageZoomViewport,
  previousGestureScale: number,
  nextGestureScale: number,
  anchor: ImagePoint,
): ImageZoomViewport {
  return zoomImageByFactor(
    state,
    gestureScaleFactor(previousGestureScale, nextGestureScale),
    anchor,
  )
}

/**
 * Where a click goes from here: the stop the reader is not standing on.
 *
 * Two stops, and nothing between them. Three stops is what produced the
 * defects this replaced — a second stop that could coincide with the first,
 * a ladder whose leftover landed on the last rung where it was worst, and a
 * cursor that had to predict which rung came next. With one stop above fit
 * there is nothing left to coincide and nothing left to divide.
 *
 * Everything that is not fit comes back to fit, including the scales between
 * the stops that a wheel can leave a reader on. So the way back is the same
 * gesture that got them there, and no click is a dead end.
 */
function clickZoomTarget(state: ImageZoomViewport): number {
  const { fit, ceiling } = imageZoomStops(state.viewport, state.natural)
  return sameScale(state.scale, fit) ? ceiling : fit
}

/**
 * A click on the image: fit and the stop above it, either way round.
 *
 * Both directions go through `zoomImageToScale`, which is what makes the way
 * back land dead centre rather than at the pan the reader had built up — at
 * fit the image overflows nothing, so the offset clamp has only one answer.
 *
 * A double click is two of these, and the caller lets the first one speak.
 * There is no separate second stop left for it to toggle to, and minting one
 * would be a second opinion about what closer means.
 */
export function clickZoomImage(
  state: ImageZoomViewport,
  anchor: ImagePoint,
): ImageZoomViewport {
  return zoomImageToScale(state, clickZoomTarget(state), anchor)
}

/** The image follows the pointer, as far as the clamp allows. */
export function panImageBy(
  state: ImageZoomViewport,
  delta: ImagePoint,
): ImageZoomViewport {
  const moved = {
    x: state.offset.x + (Number.isFinite(delta.x) ? delta.x : 0),
    y: state.offset.y + (Number.isFinite(delta.y) ? delta.y : 0),
  }
  return {
    ...state,
    offset: clampOffset(moved, state.scale, state.viewport, state.natural),
  }
}

/** True when the image overflows the viewport in either axis. */
export function canPanImage(state: ImageZoomViewport): boolean {
  const limit = panLimits(state.scale, state.viewport, state.natural)
  return limit.x > 0 || limit.y > 0
}

/** A press and a release close enough together in space to be one click. */
export function isImageClick(from: ImagePoint, to: ImagePoint): boolean {
  const dx = to.x - from.x
  const dy = to.y - from.y
  if (!Number.isFinite(dx) || !Number.isFinite(dy)) return false
  return Math.hypot(dx, dy) <= IMAGE_CLICK_DRAG_THRESHOLD_PX
}

/**
 * Which cursor this state implies — the viewer's only running explanation of
 * what the next gesture does, so the reader does not have to find the
 * gestures by accident.
 *
 * Where a click would go is ASKED of the click rather than re-derived here.
 * A cursor carrying its own copy of the rule is one of the three defects the
 * two stops removed: the copy drifted, and the cursor promised a zoom that
 * would not happen.
 *
 * The stop above fit outranks the grab, because there the click is the
 * interesting affordance — it is the way back to the whole image — and a
 * reader who is mid-drag is told so by `grabbing`, which outranks
 * everything. Between the two stops, which is where only a wheel or a pinch
 * can leave a reader, the drag is the thing worth advertising.
 */
export function resolveImageZoomCursor(
  state: ImageZoomViewport,
  options: { dragging?: boolean } = {},
): ImageZoomCursor {
  if (options.dragging) return 'grabbing'
  const { ceiling } = imageZoomStops(state.viewport, state.natural)
  if (clickZoomTarget(state) > state.scale) return 'zoom-in'
  if (canPanImage(state) && state.scale < ceiling) return 'grab'
  return 'zoom-out'
}
