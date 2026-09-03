export type CameraTransform = {
  pan: { x: number; y: number }
  zoom: number
}

export type CameraTransitionResult =
  | { kind: 'completed'; transform: CameraTransform }
  | { kind: 'cancelled'; transform: CameraTransform }
  | { kind: 'superseded'; transform: CameraTransform }

/**
 * Changes camera scale while mapping one viewport point to another.
 *
 * A wheel zoom passes the same point twice, keeping the world beneath the
 * cursor stationary. A pinch passes the previous and current midpoint, so
 * midpoint drift and scale are solved in one transform instead of applying
 * the finger movement twice.
 */
export function transformCameraAroundPoint(
  from: CameraTransform,
  fromPoint: { x: number; y: number },
  toPoint: { x: number; y: number },
  nextZoom: number,
): CameraTransform {
  const fromZoom = Math.max(0.0001, from.zoom)
  const safeNextZoom = Math.max(0.0001, nextZoom)
  const world = {
    x: (fromPoint.x - from.pan.x) / fromZoom,
    y: (fromPoint.y - from.pan.y) / fromZoom,
  }

  return {
    pan: {
      x: toPoint.x - world.x * safeNextZoom,
      y: toPoint.y - world.y * safeNextZoom,
    },
    zoom: safeNextZoom,
  }
}

/**
 * Sine ease-in-out: a calm departure and landing without smootherstep's
 * long near-still endpoints and steep middle acceleration.
 */
export function easeCameraTransition(value: number): number {
  const t = Math.min(1, Math.max(0, value))
  if (t === 0 || t === 1) return t
  return -(Math.cos(Math.PI * t) - 1) / 2
}

/**
 * Returns transition progress measured from the first frame the browser can
 * actually draw. Work scheduled before requestAnimationFrame (notably React
 * reconciliation for a large canvas) may block the main thread; counting
 * that blocked time makes the first visible frame jump toward the target.
 */
export function createCameraTransitionClock(durationMs: number) {
  // `Math.max(1, NaN)` is NaN, so the clamp alone is not a clamp. A NaN
  // duration makes every progress NaN, and `t < 1` is false for NaN — so the
  // loop writes NaN into the transform, reports `completed`, and every later
  // pan, zoom and fit reads that NaN. The canvas vanishes and cannot recover
  // without a remount. Unreachable today; silent and unrecoverable if it ever
  // is.
  const duration = Number.isFinite(durationMs) ? Math.max(1, durationMs) : 420
  let firstFrameAt: number | null = null

  return (frameAt: number): number => {
    firstFrameAt ??= frameAt
    return Math.min(1, Math.max(0, (frameAt - firstFrameAt) / duration))
  }
}

/**
 * Interpolate the visible world CENTRE linearly and the scale GEOMETRICALLY,
 * then derive the transform. Pan and zoom stay coupled — a destination never
 * moves away before arriving — and the perceived rate of zoom is constant.
 *
 * The geometric half is the part that matters, and it is not a refinement.
 * This used to interpolate the visible rectangle's WIDTH linearly and derive
 * `zoom = viewportWidth / width`. Zoom is the RECIPROCAL of width, so a
 * straight line in width is a hyperbola in zoom, and the visible rate of
 * change is wildly uneven at both ends of it. Measured on a real zoom-out
 * (0.157 → 0.051 over 455 ms): 78% of the perceived travel was over by the
 * halfway frame and 98% by 74% of the duration, leaving the last quarter of
 * the animation to deliver 2% of the visible change. What that looks like is
 * the camera flying past the destination and then hanging — the "overshoot
 * and settle back" it was reported as. Zooming IN is the same defect
 * mirrored: almost nothing happens, then it rushes at the end.
 *
 * Scale is perceived as a ratio, so equal time must buy an equal RATIO of
 * change: `z(t) = z0 · (z1/z0)^t`. That makes the ease curve mean what it
 * says — the eased progress IS the perceived progress — and it makes the
 * two directions symmetric, which linear width can never be.
 *
 * The centre (not the top-left corner) is the anchor: with the scale moving
 * geometrically, interpolating an edge would let the frame drift sideways
 * on its way, because the distance from edge to centre is itself scaling.
 */
export function interpolateCameraTransform(
  from: CameraTransform,
  to: CameraTransform,
  viewport: { width: number; height: number },
  t: number,
): CameraTransform {
  const progress = Math.min(1, Math.max(0, t))
  if (progress === 0) return from
  if (progress === 1) return to
  const width = Math.max(1, viewport.width)
  const height = Math.max(1, viewport.height)
  const fromZoom = Math.max(0.0001, from.zoom)
  const toZoom = Math.max(0.0001, to.zoom)

  const zoom = fromZoom * Math.pow(toZoom / fromZoom, progress)

  // The world point currently under the middle of the viewport, at each end.
  const fromCenter = {
    x: (width / 2 - from.pan.x) / fromZoom,
    y: (height / 2 - from.pan.y) / fromZoom,
  }
  const toCenter = {
    x: (width / 2 - to.pan.x) / toZoom,
    y: (height / 2 - to.pan.y) / toZoom,
  }
  const center = {
    x: fromCenter.x + (toCenter.x - fromCenter.x) * progress,
    y: fromCenter.y + (toCenter.y - fromCenter.y) * progress,
  }

  return {
    pan: {
      x: width / 2 - center.x * zoom,
      y: height / 2 - center.y * zoom,
    },
    zoom,
  }
}
