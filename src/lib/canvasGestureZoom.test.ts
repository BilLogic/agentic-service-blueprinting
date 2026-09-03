import { describe, expect, it } from 'vitest'
import {
  gestureScaleFactor,
  shouldApplyGestureZoom,
} from '@/lib/canvasGestureZoom'

describe('gestureScaleFactor', () => {
  it('turns a cumulative scale stream into per-event ratios that compose', () => {
    // Safari's stream for one steady spread: 1 → 1.2 → 1.5 → 2.
    const stream = [1, 1.2, 1.5, 2]
    let previous = 1
    let applied = 1
    for (const scale of stream) {
      applied *= gestureScaleFactor(previous, scale)
      previous = scale
    }
    // The camera has ended up exactly where the gesture said, once.
    expect(applied).toBeCloseTo(2, 12)
  })

  it('reads a pinch in as a shrink and a pinch out as a growth', () => {
    expect(gestureScaleFactor(1, 0.5)).toBeCloseTo(0.5, 12)
    expect(gestureScaleFactor(0.5, 1)).toBeCloseTo(2, 12)
  })

  it('changes nothing when the gesture repeats or reports nonsense', () => {
    expect(gestureScaleFactor(1.4, 1.4)).toBe(1)
    expect(gestureScaleFactor(1, 0)).toBe(1)
    expect(gestureScaleFactor(1, -2)).toBe(1)
    expect(gestureScaleFactor(1, NaN)).toBe(1)
    // A `gesturechange` that arrives without its `gesturestart` rebases on 1
    // rather than dividing by a scale nobody recorded.
    expect(gestureScaleFactor(0, 1.5)).toBeCloseTo(1.5, 12)
  })
})

describe('shouldApplyGestureZoom', () => {
  it('applies the gesture on macOS, where a pinch has no touch pointers', () => {
    expect(shouldApplyGestureZoom(0)).toBe(true)
  })

  it('stands down on iOS, where the pointer map already pinches', () => {
    // Both fingers, and the moment mid-gesture when only one is registered:
    // either way the pointer path owns it and scale must not be applied twice.
    expect(shouldApplyGestureZoom(2)).toBe(false)
    expect(shouldApplyGestureZoom(1)).toBe(false)
  })
})
