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
 * `cubic-bezier(x1, 0, x2, 1)` — the y control points are fixed at 0 and 1.
 *
 * Not a simplification for its own sake. With those endpoints the vertical
 * polynomial collapses to `3u² - 2u³`, so the two directions differ ONLY in
 * horizontal control points: one family, graded, rather than two unrelated
 * animations that happen to sit at either end of a move.
 *
 * Module-private on purpose. The Newton solve below is accurate to 1e-13 for
 * the two curves this exports and NOT accurate in general — it has no
 * residual check, where WebKit's equivalent falls back to bisection when
 * Newton wanders. Measured on legal control points it does not ship:
 * `cubic-bezier(0, 0, 0, 1)` comes back wrong by 0.92. Export the factory and
 * that becomes someone's silent bug; keep it here and the contract is "these
 * two curves, verified".
 */
function cubicBezierEase(x1: number, x2: number): (t: number) => number {
  const at = (t: number, a: number, b: number) =>
    (((1 - 3 * b + 3 * a) * t + (3 * b - 6 * a)) * t + 3 * a) * t
  const slope = (t: number, a: number, b: number) =>
    3 * (1 - 3 * b + 3 * a) * t * t + 2 * (3 * b - 6 * a) * t + 3 * a

  return (time: number) => {
    const x = Math.min(1, Math.max(0, time))
    if (x === 0 || x === 1) return x
    let t = x
    for (let i = 0; i < 6; i += 1) {
      const d = slope(t, x1, x2)
      if (d === 0) break
      t -= (at(t, x1, x2) - x) / d
    }
    return at(t, 0, 1)
  }
}

/**
 * COMMITTING to a target: a slow departure, then a long landing, so the
 * detail has room to resolve while the last of the motion is still running.
 *
 * Pairs with `CAMERA_WITHDRAW_EASE`, and the two differ in one number. Almost
 * all of the grading lives in the first quarter — a fifth of the way through,
 * a withdrawal has covered 0.354 of its journey against this curve's 0.121 —
 * and by the last fifth the two are within a thousandth of each other,
 * settling identically. Deliberate: two moves should differ in how they
 * LEAVE and agree on how they arrive.
 */
export const CAMERA_APPROACH_EASE = cubicBezierEase(0.42, 0.2)

/**
 * RELEASING a target: no hesitation at the start, into the same long settle.
 * The payoff of a zoom-out is the wide view, and nothing is waiting for you
 * there. See `CAMERA_APPROACH_EASE` for the pair and the measured shape.
 */
export const CAMERA_WITHDRAW_EASE = cubicBezierEase(0.18, 0.2)

/**
 * Grade by direction. A push in and a pull out are not the same event.
 *
 * A move that does not change scale is still committing to somewhere new, so
 * it takes the approach curve. That tie-break is why this is a function
 * rather than a ternary at the call site.
 */
export function cameraEaseFor(
  fromZoom: number,
  toZoom: number,
): (t: number) => number {
  return toZoom < fromZoom ? CAMERA_WITHDRAW_EASE : CAMERA_APPROACH_EASE
}

/**
 * Does a move change which tier the board renders?
 *
 * This is the whole rule, and it is deliberately a comparison rather than a
 * schedule. Two hand-picked constants used to answer a different question —
 * 0.10 into every zoom-out and 0.88 into every zoom-in — and no pair of
 * numbers could have been right, because the moment they stood in for shifts
 * with the phase, the direction and the size of the window.
 *
 * WHEN it changes is not computed here, and an earlier version of this file
 * did compute it: it inverted the ease to predict the frame on which the
 * rendered zoom would cross the threshold. That prediction was exactly the
 * value the animation loop already holds — the loop interpolates the zoom
 * every frame — so the two could only ever agree, and the inverse existed to
 * tell the loop something it could see for itself. Worse, a predicted moment
 * can drift from the rendered one when `CameraTransitionClock.absorb` warps
 * the clock; a moment read off the zoom cannot.
 *
 * Returning false is the common case and the valuable one: on this board most
 * navigation never crosses, and those moves perform no tier write, and so no
 * whole-board style recalculation, at all.
 */
export function cameraTierChanges(
  fromZoom: number,
  toZoom: number,
  threshold: number,
): boolean {
  if (!Number.isFinite(threshold)) return false
  const fromBlocks = fromZoom < threshold
  const toBlocks = toZoom < threshold
  return fromBlocks !== toBlocks
}

/**
 * Returns transition progress measured from the first frame the browser can
 * actually draw. Work scheduled before requestAnimationFrame (notably React
 * reconciliation for a large canvas) may block the main thread; counting
 * that blocked time makes the first visible frame jump toward the target.
 */
export type CameraTransitionClock = ((frameAt: number) => number) & {
  /**
   * Give the move back time it spent stalled, by moving its DEADLINE rather
   * than its origin.
   *
   * Restyling the board at a tier change blocks the main thread for 54-81 ms.
   * Counted as travel, the next frame drawn lands far down the ease and the
   * camera JUMPS. That was the original complaint and it is why this exists.
   *
   * The obvious repair — push the origin forward, so the same wall clock
   * reads as less elapsed — is right only where the stall is, and this one
   * has moved. When the tier changed on frame one, refusing to count the
   * stall was free: progress was zero either way. Now the tier changes at the
   * legibility crossing, which can fall anywhere in the move, and an origin
   * shift there renders the SAME zoom on the frame after the stall as on the
   * frame before it. The camera does not jump; it stops dead for six frames
   * in the middle of a glide, then resumes. A freeze mid-flight is worse than
   * the jump it replaced, and it is invisible in every measurement because
   * the ease still keeps its full travel.
   *
   * Extending the duration instead re-paces the REMAINDER: progress advances
   * a little across the stall rather than not at all, every frame after it is
   * continuous, and the move simply lands `ms` later than it meant to. No
   * jump, no stop — the cost is paid as a slightly longer journey, which is
   * the only currency the reader cannot see.
   *
   * Only ever call this with time actually spent inside the move.
   */
  absorb(ms: number): void
}

export function createCameraTransitionClock(
  durationMs: number,
): CameraTransitionClock {
  // `Math.max(1, NaN)` is NaN, so the clamp alone is not a clamp. A NaN
  // duration makes every progress NaN, and `t < 1` is false for NaN — so the
  // loop writes NaN into the transform, reports `completed`, and every later
  // pan, zoom and fit reads that NaN. The canvas vanishes and cannot recover
  // without a remount. Unreachable today; silent and unrecoverable if it ever
  // is.
  let duration = Number.isFinite(durationMs) ? Math.max(1, durationMs) : 420
  let firstFrameAt: number | null = null

  const clock = (frameAt: number): number => {
    firstFrameAt ??= frameAt
    return Math.min(1, Math.max(0, (frameAt - firstFrameAt) / duration))
  }

  clock.absorb = (ms: number) => {
    if (!Number.isFinite(ms) || ms <= 0 || firstFrameAt === null) return
    // Move the finish line, not the start. See the doc above for why the
    // start is the wrong end once the stall can land mid-flight.
    duration += ms
  }

  return clock
}

/**
 * Interpolate the scale GEOMETRICALLY and the visible world centre so that
 * the picture crosses the SCREEN at a steady rate, then derive the
 * transform. Pan and zoom stay coupled — a destination never moves away
 * before arriving — and the perceived rate of zoom is constant.
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
  /*
    Interpolate so the picture moves at a STEADY rate across the screen.

    Interpolating the centre linearly in world space looks obviously right
    and is not: what a reader watches is a world point's SCREEN position,
    which is `(point - centre) x zoom`. A centre moving linearly against a
    zoom moving geometrically is neither.

    Measured on this board, with the eased clock at 25/50/75% of the way
    through, the destination had crossed this fraction of its screen travel:

      zooming IN    12 / 26 / 30 %   — 70% of the pan crammed into the last
                                       quarter, a late rush
      zooming OUT   37 / 81 / 98 %   — over by halfway, then it hangs

    against a zoom that was a faithful 14/51/86 and 16/51/89 in both
    directions. The route was dead straight the whole time — measured at
    0 px off the chord — so what "the path feels wrong" was describing is
    this: the right line, walked at the wrong speed.
  */
  /*
    A PERSPECTIVE-CORRECT weight, and the shape of it is load-bearing.

    The obvious way to make the screen motion steady — shrink the
    destination's screen offset linearly, `(1 - progress) * fromZoom / zoom`
    — is not monotonic on a big zoom-out. Zoom shrinks geometrically, so to
    keep the product linear the world distance has to GROW, and the camera
    travels backwards past its own origin before returning. Measured: the
    weight peaks at 1.277 going overview-ward from a scenario and 1.114 from
    a phase, where 1.0 is the start. Reported, accurately, as a huge bow in
    the path. Moves that zoom in, or that zoom out by less than a factor of
    e, never exceed 1 and never showed it.

    This form cannot reverse: both terms are positive and the denominator
    always exceeds the numerator's growth, so it falls from 1 to 0 without
    turning. It is the same weighting a renderer uses to interpolate across
    a perspective divide, for the same reason — the quantity being
    interpolated lives in screen space while the parameter lives in world
    space.

    It does not track the ease as exactly as the reversing version did
    (26/66/89 against the ease's 15/50/85 on the longest move), but it is far
    closer than interpolating the centre linearly in world space, which is
    what this replaced and which measured 37/81/98 zooming out and 12/26/30
    zooming in.
  */
  const screenWeight =
    ((1 - progress) * fromZoom) / ((1 - progress) * fromZoom + progress * toZoom)
  const center = {
    x: toCenter.x + (fromCenter.x - toCenter.x) * screenWeight,
    y: toCenter.y + (fromCenter.y - toCenter.y) * screenWeight,
  }

  return {
    pan: {
      x: width / 2 - center.x * zoom,
      y: height / 2 - center.y * zoom,
    },
    zoom,
  }
}

/**
 * How much perceptual ground a camera move covers, in OCTAVES.
 *
 * One octave is one doubling (or halving) of scale. Screen-space pan is
 * converted into the same unit — one viewport diagonal of travel counts as
 * one octave — so a move that both zooms and crosses the board is measured
 * as the sum of what the eye has to follow, not as whichever half is larger.
 *
 * This exists because the camera used to spend the SAME 420 ms on every
 * move, however far it went. Measured on this board (849x818 viewport):
 * overview fits at zoom 0.05 and a focused scenario at 0.396 — 2.99 octaves
 * apart, while a neighbouring step is roughly half that. Equal time for
 * double the distance is double the speed, and that is exactly the report:
 * a one-level move glides, and the move that skips a level feels like a cut
 * even though it runs the identical ease.
 *
 * The pan term uses the same world CENTRES `interpolateCameraTransform`
 * interpolates, at the geometric mean of the two scales — the scale the
 * midpoint of the move is actually seen at, and the one the geometric
 * interpolation spends the most time near.
 */
export function cameraTravelOctaves(
  from: CameraTransform,
  to: CameraTransform,
  viewport: { width: number; height: number },
): number {
  const fromZoom = Math.max(0.0001, from.zoom)
  const toZoom = Math.max(0.0001, to.zoom)
  const width = Math.max(1, viewport.width)
  const height = Math.max(1, viewport.height)

  const scaleOctaves = Math.abs(Math.log2(toZoom / fromZoom))

  const fromCenter = {
    x: (width / 2 - from.pan.x) / fromZoom,
    y: (height / 2 - from.pan.y) / fromZoom,
  }
  const toCenter = {
    x: (width / 2 - to.pan.x) / toZoom,
    y: (height / 2 - to.pan.y) / toZoom,
  }
  const meanZoom = Math.sqrt(fromZoom * toZoom)
  const panOctaves =
    (Math.hypot(toCenter.x - fromCenter.x, toCenter.y - fromCenter.y) *
      meanZoom) /
    Math.hypot(width, height)

  const total = scaleOctaves + panOctaves
  return Number.isFinite(total) ? total : 0
}

/**
 * The travel a camera move covers in the BASE duration. Beyond this it
 * takes proportionally longer, so the perceived rate stays put.
 *
 * 1.5 octaves is one step of this app's navigation ladder — overview to a
 * phase, or a phase to a focused scenario. Those are the moves reported as
 * correct, so they are the ones that must come out unchanged, and anchoring
 * here is what guarantees it.
 */
export const CAMERA_TRAVEL_REFERENCE_OCTAVES = 1.5

/**
 * Ceiling on the stretch. A constant rate with no cap would let a move
 * across the whole board run for seconds; past roughly a second a camera
 * stops reading as smooth and starts reading as slow. Two levels at once
 * lands right on this cap, which is the case this was written for.
 */
export const CAMERA_TRAVEL_MAX_STRETCH = 2

/**
 * Base duration stretched by distance — never shortened.
 *
 * The lower clamp is deliberate. Constant rate would also make SHORT moves
 * quicker, and short moves are the ones already reported as feeling right;
 * speeding them up to satisfy the formula would trade a real complaint for
 * a new one. This only ever slows the long moves down to match them.
 */
export function cameraTransitionDurationMs(
  baseMs: number,
  travelOctaves: number,
): number {
  const base = Number.isFinite(baseMs) ? Math.max(1, baseMs) : 420
  const travel = Number.isFinite(travelOctaves) ? Math.max(0, travelOctaves) : 0
  const stretch = Math.min(
    CAMERA_TRAVEL_MAX_STRETCH,
    Math.max(1, travel / CAMERA_TRAVEL_REFERENCE_OCTAVES),
  )
  return base * stretch
}
