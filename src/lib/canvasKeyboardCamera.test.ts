import { describe, expect, it } from 'vitest'
import {
  computeFocusRevealPan,
  resolveKeyboardPan,
  FOCUS_REVEAL_MARGIN_PX,
  KEYBOARD_PAN_STEP_PX,
  KEYBOARD_PAN_STRIDE_MULTIPLIER,
  type KeyboardPanInput,
} from '@/lib/canvasKeyboardCamera'

const press = (patch: Partial<KeyboardPanInput>) =>
  resolveKeyboardPan({
    key: 'ArrowRight',
    shiftKey: false,
    metaKey: false,
    ctrlKey: false,
    altKey: false,
    ...patch,
  })

describe('resolveKeyboardPan', () => {
  it('pans the camera opposite the arrow, one step per press', () => {
    expect(press({ key: 'ArrowRight' })).toEqual({
      dx: -KEYBOARD_PAN_STEP_PX,
      dy: 0,
    })
    expect(press({ key: 'ArrowLeft' })).toEqual({
      dx: KEYBOARD_PAN_STEP_PX,
      dy: 0,
    })
    expect(press({ key: 'ArrowDown' })).toEqual({
      dx: 0,
      dy: -KEYBOARD_PAN_STEP_PX,
    })
    expect(press({ key: 'ArrowUp' })).toEqual({ dx: 0, dy: KEYBOARD_PAN_STEP_PX })
  })

  it('makes Shift a stride', () => {
    expect(press({ key: 'ArrowDown', shiftKey: true })?.dy).toBe(
      -KEYBOARD_PAN_STEP_PX * KEYBOARD_PAN_STRIDE_MULTIPLIER,
    )
  })

  it('leaves modified arrows and every other key alone', () => {
    expect(press({ metaKey: true })).toBeNull()
    expect(press({ ctrlKey: true })).toBeNull()
    expect(press({ altKey: true })).toBeNull()
    expect(press({ key: 'Tab' })).toBeNull()
    expect(press({ key: ' ' })).toBeNull()
  })
})

const VIEWPORT = { left: 0, top: 0, width: 1000, height: 800 }

describe('computeFocusRevealPan', () => {
  it('leaves a comfortably visible cell exactly where it is', () => {
    expect(
      computeFocusRevealPan(
        { left: 300, top: 300, width: 120, height: 60 },
        VIEWPORT,
      ),
    ).toEqual({ dx: 0, dy: 0 })
  })

  it('brings a cell off the right edge into view, with its margin', () => {
    const { dx, dy } = computeFocusRevealPan(
      { left: 1400, top: 200, width: 120, height: 60 },
      VIEWPORT,
    )
    expect(dy).toBe(0)
    expect(1400 + dx + 120).toBe(1000 - FOCUS_REVEAL_MARGIN_PX)
  })

  it('brings a cell off the top-left corner in on both axes at once', () => {
    const { dx, dy } = computeFocusRevealPan(
      { left: -600, top: -90, width: 120, height: 60 },
      VIEWPORT,
    )
    expect(-600 + dx).toBe(FOCUS_REVEAL_MARGIN_PX)
    expect(-90 + dy).toBe(FOCUS_REVEAL_MARGIN_PX)
  })

  it('anchors a cell too big for the viewport instead of centring it', () => {
    const { dx } = computeFocusRevealPan(
      { left: 1200, top: 100, width: 4000, height: 60 },
      VIEWPORT,
    )
    expect(1200 + dx).toBe(FOCUS_REVEAL_MARGIN_PX)
  })

  it('honours a viewport that does not start at the origin', () => {
    const viewport = { left: 240, top: 64, width: 600, height: 400 }
    const { dx, dy } = computeFocusRevealPan(
      { left: 100, top: 20, width: 80, height: 40 },
      viewport,
    )
    expect(100 + dx).toBe(240 + FOCUS_REVEAL_MARGIN_PX)
    expect(20 + dy).toBe(64 + FOCUS_REVEAL_MARGIN_PX)
  })

  it('degrades to no margin rather than inverted bounds in a tiny viewport', () => {
    const { dx } = computeFocusRevealPan(
      { left: 500, top: 0, width: 10, height: 10 },
      { left: 0, top: 0, width: 40, height: 40 },
    )
    expect(500 + dx + 10).toBe(40)
  })
})
