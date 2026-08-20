import { describe, expect, it } from 'vitest'
import {
  createCameraTransitionClock,
  easeCameraTransition,
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

  it('holds the viewport centre on a straight world path', () => {
    const centerOf = (transform: typeof from) => ({
      x: (viewport.width / 2 - transform.pan.x) / transform.zoom,
      y: (viewport.height / 2 - transform.pan.y) / transform.zoom,
    })
    const start = centerOf(from)
    const end = centerOf(to)
    const mid = centerOf(interpolateCameraTransform(from, to, viewport, 0.5))

    expect(mid.x).toBeCloseTo((start.x + end.x) / 2, 6)
    expect(mid.y).toBeCloseTo((start.y + end.y) / 2, 6)
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

  it('eases gently without making the camera hesitate at either end', () => {
    expect(easeCameraTransition(0)).toBe(0)
    expect(easeCameraTransition(0.1)).toBeGreaterThan(0.02)
    expect(easeCameraTransition(0.1)).toBeLessThan(0.03)
    expect(easeCameraTransition(0.5)).toBeCloseTo(0.5)
    expect(easeCameraTransition(0.9)).toBeGreaterThan(0.97)
    expect(easeCameraTransition(0.9)).toBeLessThan(0.98)
    expect(easeCameraTransition(1)).toBe(1)
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
