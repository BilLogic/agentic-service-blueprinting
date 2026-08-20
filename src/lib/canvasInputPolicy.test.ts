import { describe, expect, it } from 'vitest'
import {
  resolveCanvasIntent,
  type CanvasInputSnapshot,
} from '@/lib/canvasInputPolicy'

const base: CanvasInputSnapshot = {
  mode: 'view',
  tool: 'select',
  pointerType: 'mouse',
  button: 0,
  modifiers: { space: false, shift: false, meta: false, ctrl: false, alt: false },
  target: 'canvas',
  activePointerCount: 1,
}

const intent = (patch: Partial<CanvasInputSnapshot>) =>
  resolveCanvasIntent({ ...base, ...patch })

describe('resolveCanvasIntent', () => {
  it('gives two-finger navigation, context menu, and middle pan precedence', () => {
    expect(intent({ pointerType: 'touch', activePointerCount: 2, button: 0 })).toBe('pinch')
    expect(intent({ button: 2 })).toBe('context-menu')
    expect(intent({ button: 1, target: 'activate' })).toBe('pan')
  })

  it('makes Space a temporary desktop pan without changing tools', () => {
    expect(intent({ tool: 'rect', modifiers: { ...base.modifiers, space: true } })).toBe('pan')
  })

  it('preserves feature-owned and native targets', () => {
    expect(intent({ target: 'drag-handle' })).toBe('manipulate')
    expect(intent({ target: 'scroll' })).toBe('native-scroll')
    expect(intent({ target: 'text' })).toBe('native-scroll')
  })

  it('routes drawing, design marquee, hand, and view pan explicitly', () => {
    expect(intent({ tool: 'pen' })).toBe('draw')
    expect(intent({ mode: 'design', target: 'canvas' })).toBe('marquee')
    expect(intent({ mode: 'design', tool: 'hand' })).toBe('pan')
    expect(intent({ mode: 'view', target: 'canvas' })).toBe('pan')
  })

  it('keeps touch activation pending until movement crosses slop', () => {
    expect(intent({ pointerType: 'touch', target: 'activate' })).toBe('pending-tap')
  })
})
