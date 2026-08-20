import { describe, expect, it } from 'vitest'
import {
  CAMERA_TRAVEL_MAX_STRETCH,
  CAMERA_TRAVEL_REFERENCE_OCTAVES,
  cameraTransitionDurationMs,
  cameraTravelOctaves,
  CAMERA_APPROACH_EASE,
  CAMERA_WITHDRAW_EASE,
  cameraEaseFor,
  cameraTierChanges,
  createCameraTransitionClock,
  interpolateCameraTransform,
  transformCameraAroundPoint,
} from '@/lib/cameraTransition'

const viewport = { width: 1200, height: 800 }
const from = { pan: { x: -100, y: -50 }, zoom: 0.5 }
const to = { pan: { x: 240, y: 160 }, zoom: 1.4 }

describe('camera transition', () => {
  it('lands on exact endpoints', () => {
    expect(interpolateCameraTransform(from, to, viewport, 0)).toEqual(from)
    expect(interpolateCameraTransform(from, to, viewport, 1)).toEqual(to)
  })

  /*
    The regression this file exists to hold. Scale used to be derived from a
    LINEARLY interpolated rect width, and zoom is width's reciprocal — so the
    perceived rate of change was hyperbolic, not eased. Measured on a real
    zoom-out before the fix: 78% of the perceived travel was done by the
    halfway frame, 98% by 74% of the duration. The camera appeared to
    overshoot and then hang.
  */
  it('spends equal time on equal ratios of zoom', () => {
    const zoomAt = (t: number) =>
      interpolateCameraTransform(from, to, viewport, t).zoom

    // Each quarter of the transition multiplies the scale by the same factor.
    const q1 = zoomAt(0.25) / from.zoom
    const q2 = zoomAt(0.5) / zoomAt(0.25)
    const q3 = zoomAt(0.75) / zoomAt(0.5)
    const q4 = to.zoom / zoomAt(0.75)
    expect(q2).toBeCloseTo(q1, 6)
    expect(q3).toBeCloseTo(q1, 6)
    expect(q4).toBeCloseTo(q1, 6)

    // Stated as the measurement that caught it: at the halfway point, half
    // the perceived (log-scale) travel is done — not 78% of it.
    const perceived =
      Math.log(zoomAt(0.5) / from.zoom) / Math.log(to.zoom / from.zoom)
    expect(perceived).toBeCloseTo(0.5, 6)
  })

  it('is symmetric — zooming out mirrors zooming in', () => {
    const outward = interpolateCameraTransform(to, from, viewport, 0.5).zoom
    const inward = interpolateCameraTransform(from, to, viewport, 0.5).zoom
    // Same midpoint scale whichever way the camera travels. Linear width gave
    // two different answers, which is why one direction felt front-loaded and
    // the other back-loaded.
    expect(outward).toBeCloseTo(inward, 6)
  })

  const centreOf = (transform: typeof from) => ({
    x: (viewport.width / 2 - transform.pan.x) / transform.zoom,
    y: (viewport.height / 2 - transform.pan.y) / transform.zoom,
  })

  it('keeps the camera centre on the straight line between the two ends', () => {
    // The ROUTE is a straight chord, even though the camera does not walk it
    // at a constant world-space rate — see the pacing test below.
    const start = centreOf(from)
    const end = centreOf(to)
    const dx = end.x - start.x
    const dy = end.y - start.y
    const length = Math.hypot(dx, dy)

    for (const t of [0.1, 0.25, 0.5, 0.75, 0.9]) {
      const mid = centreOf(interpolateCameraTransform(from, to, viewport, t))
      const offLine = Math.abs(((mid.x - start.x) * dy - (mid.y - start.y) * dx) / length)
      expect(offLine).toBeCloseTo(0, 6)
    }
  })

  /*
    The regression behind "there is a huge bow in the transition path".

    Making the destination's screen offset shrink LINEARLY looks like the
    definition of steady motion and is not monotonic: on a big zoom-out the
    weight rose to 1.277, where 1.0 is the start, so the camera travelled
    backwards past its own origin before returning. This asserts the property
    that actually matters — the camera closes on its destination and never
    backs away from it — across ratios well past where the old form broke.
  */
  it('never travels away from where it is going', () => {
    const cases: Array<[number, number, string]> = [
      [0.39, 0.06, 'scenario to overview'],
      [0.28, 0.06, 'phase to overview'],
      [0.06, 0.39, 'overview to scenario'],
      [4, 0.01, 'far beyond anything the app does'],
      [0.01, 4, 'and the same the other way'],
    ]

    for (const [fromZoom, toZoom, what] of cases) {
      const a = { pan: { x: 0, y: 0 }, zoom: fromZoom }
      const b = { pan: { x: -900, y: -400 }, zoom: toZoom }
      const destination = {
        x: (viewport.width / 2 - b.pan.x) / b.zoom,
        y: (viewport.height / 2 - b.pan.y) / b.zoom,
      }
      const gapAt = (t: number) => {
        const frame = interpolateCameraTransform(a, b, viewport, t)
        const centre = {
          x: (viewport.width / 2 - frame.pan.x) / frame.zoom,
          y: (viewport.height / 2 - frame.pan.y) / frame.zoom,
        }
        return Math.hypot(destination.x - centre.x, destination.y - centre.y)
      }

      let previous = gapAt(0)
      for (let i = 1; i <= 200; i++) {
        const gap = gapAt(i / 200)
        expect(gap, `${what} widened its gap at t=${i / 200}`).toBeLessThanOrEqual(previous + 1e-9)
        previous = gap
      }
    }
  })

  it('still closes most of the screen gap by the time the ease says so', () => {
    // Not an exact match to the ease — see the weight's comment — but the
    // pan must stay in the same half of the journey as the zoom.
    const destination = { x: (viewport.width / 2 - to.pan.x) / to.zoom, y: (viewport.height / 2 - to.pan.y) / to.zoom }
    const offsetAt = (t: number) => {
      const frame = interpolateCameraTransform(from, to, viewport, t)
      const centre = { x: (viewport.width / 2 - frame.pan.x) / frame.zoom, y: (viewport.height / 2 - frame.pan.y) / frame.zoom }
      return Math.hypot(destination.x - centre.x, destination.y - centre.y) * frame.zoom
    }
    const start = offsetAt(0)
    const closedAtHalf = 1 - offsetAt(CAMERA_APPROACH_EASE(0.5)) / start
    expect(closedAtHalf).toBeGreaterThan(0.4)
    expect(closedAtHalf).toBeLessThan(0.8)
  })

  it('stays finite for pure pan and nearly equal zoom', () => {
    const value = interpolateCameraTransform(
      { pan: { x: 0, y: 0 }, zoom: 1 },
      { pan: { x: 300, y: -90 }, zoom: 1.0000001 },
      viewport,
      0.5,
    )
    expect(Number.isFinite(value.pan.x)).toBe(true)
    expect(Number.isFinite(value.pan.y)).toBe(true)
    expect(Number.isFinite(value.zoom)).toBe(true)
  })

})

describe('camera easing curves', () => {
  it('lands both curves on exact endpoints', () => {
    for (const ease of [CAMERA_APPROACH_EASE, CAMERA_WITHDRAW_EASE]) {
      expect(ease(0)).toBe(0)
      expect(ease(1)).toBe(1)
      // Monotonic, or a camera would double back mid-move.
      let previous = -1
      for (let i = 0; i <= 100; i += 1) {
        const value = ease(i / 100)
        expect(value).toBeGreaterThanOrEqual(previous)
        previous = value
      }
    }
  })

  it('pins each curve to the shape it was chosen for', () => {
    /*
      Tight on purpose. Every other assertion here — endpoints, monotonicity,
      the ordering BETWEEN the curves — survives moving both control points
      together, so the branch's headline feature was pinned by nothing.
      Measured values; change a control point and these fail, which is the
      whole point of writing them down.
    */
    expect(CAMERA_APPROACH_EASE(0.2)).toBeCloseTo(0.121, 3)
    expect(CAMERA_APPROACH_EASE(0.5)).toBeCloseTo(0.7705, 3)
    expect(CAMERA_APPROACH_EASE(0.8)).toBeCloseTo(0.975, 3)
    expect(CAMERA_WITHDRAW_EASE(0.2)).toBeCloseTo(0.354, 3)
    expect(CAMERA_WITHDRAW_EASE(0.5)).toBeCloseTo(0.817, 3)
    expect(CAMERA_WITHDRAW_EASE(0.8)).toBeCloseTo(0.977, 3)
  })

  it('solves both curves to full precision, which is why the factory is private', () => {
    /*
      The Newton solve has no residual check — where WebKit's equivalent
      falls back to bisection — so it is accurate for these two curves and
      not in general. That is an argument only while someone checks it.
    */
    for (const [ease, x1, x2] of [
      [CAMERA_APPROACH_EASE, 0.42, 0.2],
      [CAMERA_WITHDRAW_EASE, 0.18, 0.2],
    ] as const) {
      const bezier = (t: number, a: number, b: number) =>
        (((1 - 3 * b + 3 * a) * t + (3 * b - 6 * a)) * t + 3 * a) * t
      for (let i = 1; i < 200; i += 1) {
        const x = i / 200
        const y = ease(x)
        // Recover the curve parameter from y, then check it reproduces x.
        let lo = 0
        let hi = 1
        for (let k = 0; k < 60; k += 1) {
          const mid = (lo + hi) / 2
          if (bezier(mid, 0, 1) < y) lo = mid
          else hi = mid
        }
        expect(bezier((lo + hi) / 2, x1, x2)).toBeCloseTo(x, 9)
      }
    }
  })

  it('grades a withdrawal as a release and an approach as a commitment', () => {
    // The whole point of two curves: early in the move, letting go covers
    // more ground than committing does.
    expect(CAMERA_WITHDRAW_EASE(0.2)).toBeGreaterThan(CAMERA_APPROACH_EASE(0.2))
    expect(CAMERA_WITHDRAW_EASE(0.5)).toBeGreaterThan(CAMERA_APPROACH_EASE(0.5))
    // Both settle long, so neither is still rushing at the end.
    expect(CAMERA_APPROACH_EASE(0.9)).toBeGreaterThan(0.95)
    expect(CAMERA_WITHDRAW_EASE(0.9)).toBeGreaterThan(0.95)
  })

  it('picks the curve from the direction, and treats a pure pan as a commitment', () => {
    expect(cameraEaseFor(0.4, 0.06)).toBe(CAMERA_WITHDRAW_EASE)
    expect(cameraEaseFor(0.06, 0.4)).toBe(CAMERA_APPROACH_EASE)
    expect(cameraEaseFor(0.4, 0.4)).toBe(CAMERA_APPROACH_EASE)
  })

})

/*
  The measured board, so these read as the moves they are rather than as
  arbitrary numbers. Phases differ in width by a factor of eight, which is
  why the same navigation crosses the threshold on one and not on another.
*/
const THRESHOLD = 0.25
const OVERVIEW = 0.0582
const PHASE_NARROW = 0.4436 // Program Administration, 1794px wide
const PHASE_WIDE = 0.0975 // Onboarding, 9434px wide
const SCENARIO = 0.4441

describe('camera tier change', () => {
  const changes = (fromZoom: number, toZoom: number) =>
    cameraTierChanges(fromZoom, toZoom, THRESHOLD)

  it('leaves the tier alone when both ends are the same side of it', () => {
    // Overview to a wide phase: both below the threshold, so the board is
    // blocks at both ends and there is nothing to write.
    expect(changes(OVERVIEW, PHASE_WIDE)).toBe(false)
    expect(changes(PHASE_WIDE, OVERVIEW)).toBe(false)
    // Two readable targets.
    expect(changes(PHASE_NARROW, SCENARIO)).toBe(false)
    // A pure pan.
    expect(changes(SCENARIO, SCENARIO)).toBe(false)
  })

  it('changes the tier whenever the two ends differ, including sibling moves', () => {
    // Phase to phase looks like a same-level move and is not: the two fit at
    // different zooms because they are different widths.
    expect(changes(PHASE_NARROW, PHASE_WIDE)).toBe(true)
    expect(changes(PHASE_WIDE, PHASE_NARROW)).toBe(true)
    expect(changes(OVERVIEW, SCENARIO)).toBe(true)
    expect(changes(SCENARIO, OVERVIEW)).toBe(true)
  })

  it('sees a move that starts exactly on the threshold', () => {
    // The bug this shape exists to make impossible: asking where the crossing
    // falls puts a move starting ON the boundary at 0, which reads as "no
    // crossing" while the tier plainly changes.
    expect(changes(THRESHOLD, 0.05)).toBe(true)
    expect(changes(0.05, THRESHOLD)).toBe(true)
    // A zoom AT the threshold renders the text tier, so this one does not.
    expect(changes(THRESHOLD, 0.9)).toBe(false)
  })

  it('agrees with the zoom the animation loop renders, on every frame', () => {
    /*
      The loop does not use a predicted moment; it watches its own zoom cross
      the threshold. This pins the two to the same answer: if the tier changes
      end to end, exactly one sampled frame is the first on the far side.
    */
    for (const [from, to] of [
      [SCENARIO, OVERVIEW],
      [OVERVIEW, SCENARIO],
      [PHASE_NARROW, PHASE_WIDE],
      [PHASE_WIDE, PHASE_NARROW],
      [OVERVIEW, PHASE_WIDE],
    ]) {
      const ease = cameraEaseFor(from, to)
      const fromBlocks = from < THRESHOLD
      let crossings = 0
      let previous = fromBlocks
      for (let i = 0; i <= 400; i += 1) {
        const zoom = from * Math.pow(to / from, ease(i / 400))
        const blocks = zoom < THRESHOLD
        if (blocks !== previous) crossings += 1
        previous = blocks
      }
      expect(crossings).toBe(changes(from, to) ? 1 : 0)
    }
  })

  it('never crosses more than once, so the loop can latch on the first', () => {
    // Zoom is monotone in eased progress, so a move cannot cross back.
    const ease = cameraEaseFor(SCENARIO, OVERVIEW)
    let previous = Infinity
    for (let i = 0; i <= 200; i += 1) {
      const zoom = SCENARIO * Math.pow(OVERVIEW / SCENARIO, ease(i / 200))
      expect(zoom).toBeLessThanOrEqual(previous + 1e-12)
      previous = zoom
    }
  })

})

describe('camera transition clock', () => {
  it('lands a stalled move late rather than freezing or jumping it', () => {
    /*
      The stall this absorbs used to land on frame one, where refusing to
      count it was free. It lands at the legibility crossing now, which can
      be anywhere in the move — so the repair has to keep the picture MOVING
      across the stall, not merely keep the travel honest.
    */
    const progressAt = createCameraTransitionClock(1000)
    progressAt(0)
    const before = progressAt(500)
    expect(before).toBeCloseTo(0.5, 6)

    progressAt.absorb(100)

    // The frame after an 100 ms stall must have advanced — a clock that
    // shifted its origin instead would return 0.5 here, and the camera
    // would visibly stop.
    const after = progressAt(600)
    expect(after).toBeGreaterThan(before)
    expect(after).toBeCloseTo(600 / 1100, 6)

    // And the move finishes exactly the stall later than it meant to.
    expect(progressAt(1100)).toBe(1)
    expect(progressAt(1099)).toBeLessThan(1)
  })

  it('ignores a stall it cannot make sense of', () => {
    const progressAt = createCameraTransitionClock(1000)
    progressAt(0)
    for (const bad of [Number.NaN, 0, -50, Number.POSITIVE_INFINITY]) {
      progressAt.absorb(bad)
    }
    // Infinity would push the deadline out of reach and strand the move.
    expect(progressAt(500)).toBeCloseTo(0.5, 6)
  })

  it('ignores a stall reported before the first frame', () => {
    const progressAt = createCameraTransitionClock(1000)
    progressAt.absorb(400)
    progressAt(0)
    expect(progressAt(500)).toBeCloseTo(0.5, 6)
  })

  it('starts elapsed time on the first drawable frame', () => {
    const progressAt = createCameraTransitionClock(420)

    // React may occupy the main thread for most of the nominal duration
    // before requestAnimationFrame can draw. That delay must not consume the
    // animation: the first frame is still the exact starting transform.
    expect(progressAt(338)).toBe(0)
    expect(progressAt(548)).toBeCloseTo(0.5)
    expect(progressAt(758)).toBe(1)
  })

})

describe('pointer-anchored zoom', () => {
  it('keeps the world point beneath a wheel cursor stationary', () => {
    const cursor = { x: 320, y: 240 }
    const next = transformCameraAroundPoint(from, cursor, cursor, 0.8)
    const world = {
      x: (cursor.x - from.pan.x) / from.zoom,
      y: (cursor.y - from.pan.y) / from.zoom,
    }

    expect(next.pan.x + world.x * next.zoom).toBeCloseTo(cursor.x)
    expect(next.pan.y + world.y * next.zoom).toBeCloseTo(cursor.y)
  })

  it('maps the old pinch midpoint directly to the moving midpoint', () => {
    const previousMidpoint = { x: 280, y: 210 }
    const currentMidpoint = { x: 340, y: 250 }
    const next = transformCameraAroundPoint(
      from,
      previousMidpoint,
      currentMidpoint,
      0.75,
    )
    const world = {
      x: (previousMidpoint.x - from.pan.x) / from.zoom,
      y: (previousMidpoint.y - from.pan.y) / from.zoom,
    }

    expect(next.pan.x + world.x * next.zoom).toBeCloseTo(currentMidpoint.x)
    expect(next.pan.y + world.y * next.zoom).toBeCloseTo(currentMidpoint.y)
  })
})

describe('distance-scaled duration', () => {
  /*
    The numbers below are measured off this app's own fits at an 849x818
    viewport: the overview lands at zoom 0.05, a focused phase at 0.0507, a
    focused scenario at 0.396. What the eye reported — one step glides, two
    steps at once reads as a cut — is that last pair being 2.99 octaves
    apart and getting the same 420 ms as everything else.
  */
  const VIEWPORT = { width: 849, height: 818 }
  /*
    A camera looking at `world` at `zoom`. Building these from a raw `pan`
    would make every "zoom only" case a large pan as well — the world point
    under a fixed pan slides right across the board as the scale changes —
    and the travel numbers below would be measuring the wrong thing.
  */
  const at = (zoom: number, world = { x: 0, y: 0 }) => ({
    pan: {
      x: VIEWPORT.width / 2 - world.x * zoom,
      y: VIEWPORT.height / 2 - world.y * zoom,
    },
    zoom,
  })

  it('leaves a move that does not travel at the base duration', () => {
    const travel = cameraTravelOctaves(at(0.2), at(0.2), VIEWPORT)
    expect(travel).toBe(0)
    expect(cameraTransitionDurationMs(420, travel)).toBe(420)
  })

  it('leaves one navigation step exactly as it was', () => {
    // Half the reference is still short; the clamp holds it at the base.
    expect(cameraTransitionDurationMs(420, 0.75)).toBe(420)
    // And the reference itself is the boundary, not something past it.
    expect(
      cameraTransitionDurationMs(420, CAMERA_TRAVEL_REFERENCE_OCTAVES),
    ).toBe(420)
  })

  it('gives a move that skips a level proportionally longer', () => {
    const overviewToDetail = cameraTravelOctaves(at(0.05), at(0.396), VIEWPORT)
    expect(overviewToDetail).toBeCloseTo(2.99, 2)
    // Just under the ceiling — the real move this was written for is the
    // one that sets the cap's scale, not one the cap has to rescue.
    expect(cameraTransitionDurationMs(420, overviewToDetail)).toBeCloseTo(
      836,
      0,
    )
    expect(cameraTransitionDurationMs(420, overviewToDetail)).toBeLessThan(
      420 * CAMERA_TRAVEL_MAX_STRETCH,
    )
  })

  it('never shortens a duration, however small the move', () => {
    for (const travel of [0, 0.01, 0.1, 1, CAMERA_TRAVEL_REFERENCE_OCTAVES]) {
      expect(cameraTransitionDurationMs(420, travel)).toBe(420)
    }
  })

  it('counts pan as travel even when the scale does not change', () => {
    const still = cameraTravelOctaves(at(0.2), at(0.2), VIEWPORT)
    const crossBoard = cameraTravelOctaves(
      at(0.2),
      at(0.2, { x: -2000, y: -1500 }),
      VIEWPORT,
    )
    expect(still).toBe(0)
    expect(crossBoard).toBeGreaterThan(still)
  })

  it('costs the same in both directions', () => {
    expect(cameraTravelOctaves(at(0.396), at(0.05), VIEWPORT)).toBeCloseTo(
      cameraTravelOctaves(at(0.05), at(0.396), VIEWPORT),
      10,
    )
  })

  it('falls back on degenerate input rather than poisoning the clock', () => {
    expect(cameraTravelOctaves(at(Number.NaN), at(0.2), VIEWPORT)).toBe(0)
    expect(cameraTransitionDurationMs(420, Number.NaN)).toBe(420)
    expect(cameraTransitionDurationMs(Number.NaN, 3)).toBe(
      420 * CAMERA_TRAVEL_MAX_STRETCH,
    )
  })
})
