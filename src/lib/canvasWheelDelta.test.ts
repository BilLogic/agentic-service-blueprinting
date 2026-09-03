import { describe, expect, it } from 'vitest'
import {
  normalizeWheelDelta,
  wheelZoomScaleFactor,
  WHEEL_LINE_HEIGHT_PX,
  WHEEL_PAGE_HEIGHT_PX,
} from '@/lib/canvasWheelDelta'

/** One notch of a wheel mouse, as each engine reports it. */
const CHROMIUM_NOTCH = { deltaX: 0, deltaY: 100, deltaMode: 0 }
const FIREFOX_NOTCH = { deltaX: 0, deltaY: 3, deltaMode: 1 }
/** A trackpad's smallest honest push, always in pixels. */
const TRACKPAD_NUDGE = { deltaX: 0, deltaY: 4, deltaMode: 0 }

describe('normalizeWheelDelta', () => {
  it('leaves pixel mode exactly as it found it', () => {
    expect(normalizeWheelDelta(TRACKPAD_NUDGE)).toEqual({
      deltaX: 0,
      deltaY: 4,
    })
    expect(normalizeWheelDelta(CHROMIUM_NOTCH).deltaY).toBe(100)
  })

  it('converts line and page mode to pixels', () => {
    expect(normalizeWheelDelta(FIREFOX_NOTCH).deltaY).toBe(
      3 * WHEEL_LINE_HEIGHT_PX,
    )
    expect(
      normalizeWheelDelta({ deltaX: -1, deltaY: 0, deltaMode: 2 }).deltaX,
    ).toBe(-WHEEL_PAGE_HEIGHT_PX)
  })

  it('pans a comparable distance per notch under both delta modes', () => {
    const chromium = normalizeWheelDelta(CHROMIUM_NOTCH).deltaY
    const firefox = normalizeWheelDelta(FIREFOX_NOTCH).deltaY
    // The board is a screen tall; 20px apart is a distance no hand can feel.
    // Before normalisation this ratio was 33:1.
    expect(Math.abs(chromium - firefox)).toBeLessThanOrEqual(20)
  })

  it('keeps the sign, which is all the scroll-region test reads', () => {
    const up = normalizeWheelDelta({ deltaX: -2, deltaY: -3, deltaMode: 1 })
    expect(Math.sign(up.deltaX)).toBe(-1)
    expect(Math.sign(up.deltaY)).toBe(-1)
    const still = normalizeWheelDelta({ deltaX: 0, deltaY: 0, deltaMode: 1 })
    expect(still).toEqual({ deltaX: 0, deltaY: 0 })
  })

  it('survives the deltas a broken event can carry', () => {
    expect(normalizeWheelDelta({ deltaX: NaN, deltaY: 5, deltaMode: 0 })).toEqual(
      { deltaX: 0, deltaY: 5 },
    )
    expect(
      normalizeWheelDelta({ deltaX: 0, deltaY: 7, deltaMode: NaN }).deltaY,
    ).toBe(7)
  })
})

describe('wheelZoomScaleFactor', () => {
  it('gives a notch a comparable scale change under both delta modes', () => {
    const chromium = wheelZoomScaleFactor(
      normalizeWheelDelta(CHROMIUM_NOTCH).deltaY,
    )
    const firefox = wheelZoomScaleFactor(
      normalizeWheelDelta(FIREFOX_NOTCH).deltaY,
    )
    expect(chromium).toBeCloseTo(firefox, 5)
  })

  it('caps one notch well short of the 2.7x it used to jump', () => {
    const notch = wheelZoomScaleFactor(
      normalizeWheelDelta(CHROMIUM_NOTCH).deltaY,
    )
    // Zooming OUT: deltaY positive, so the factor shrinks the camera.
    expect(notch).toBeGreaterThan(1 / 1.35)
    expect(notch).toBeLessThan(1)
    expect(1 / notch).toBeLessThan(1.35)
  })

  it('leaves the Mac trackpad baseline untouched', () => {
    // Every trackpad event sits far below the clamp, so the factor is still
    // exactly the exponential the constant was tuned for.
    expect(wheelZoomScaleFactor(4)).toBeCloseTo(Math.exp(-0.04), 12)
    expect(wheelZoomScaleFactor(-4)).toBeCloseTo(Math.exp(0.04), 12)
  })

  it('is symmetric, and a still wheel changes nothing', () => {
    expect(wheelZoomScaleFactor(0)).toBe(1)
    expect(wheelZoomScaleFactor(9) * wheelZoomScaleFactor(-9)).toBeCloseTo(1, 12)
    expect(wheelZoomScaleFactor(NaN)).toBe(1)
  })
})
