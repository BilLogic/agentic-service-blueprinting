import type { CanvasAnnotationTool } from '@/lib/canvasAnnotations'
import type { CanvasMode } from '@/contexts/canvasModeContext'

export type CanvasIntent =
  | 'pending-tap'
  | 'pan'
  | 'pinch'
  | 'marquee'
  | 'draw'
  | 'manipulate'
  | 'activate'
  | 'native-scroll'
  | 'context-menu'
  | 'ignore'

export type CanvasTargetCapability =
  | 'canvas'
  | 'activate'
  | 'text'
  | 'scroll'
  | 'drag-handle'
  | 'menu'

export type CanvasInputSnapshot = {
  mode: CanvasMode
  tool: CanvasAnnotationTool
  pointerType: 'mouse' | 'touch' | 'pen'
  button: number
  modifiers: {
    space: boolean
    shift: boolean
    meta: boolean
    ctrl: boolean
    alt: boolean
  }
  target: CanvasTargetCapability
  activePointerCount: number
}

const DRAW_TOOLS = new Set<CanvasAnnotationTool>([
  'pen',
  'rect',
  'ellipse',
  'text',
  'sticky',
  'eraser',
])

/** Pure ownership decision. Gesture slop and DOM classification live outside. */
export function resolveCanvasIntent(input: CanvasInputSnapshot): CanvasIntent {
  if (input.activePointerCount >= 2 && input.pointerType === 'touch')
    return 'pinch'
  if (input.button === 2) return 'context-menu'
  if (input.button === 1) return 'pan'
  if (input.button !== 0) return 'ignore'
  if (input.modifiers.space && input.pointerType !== 'touch') return 'pan'
  if (input.target === 'drag-handle') return 'manipulate'
  if (input.target === 'text' || input.target === 'scroll')
    return 'native-scroll'
  if (input.target === 'menu') return 'activate'
  if (DRAW_TOOLS.has(input.tool)) return 'draw'
  if (input.tool === 'hand') return 'pan'
  if (input.pointerType === 'touch' && input.target === 'activate')
    return 'pending-tap'
  if (input.mode === 'design' && input.tool === 'select') {
    return input.target === 'canvas' ? 'marquee' : 'activate'
  }
  if (input.target === 'activate') return 'pending-tap'
  return input.target === 'canvas' ? 'pan' : 'activate'
}
