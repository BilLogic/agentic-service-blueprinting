// @vitest-environment jsdom
/**
 * A drag must not reach the cells.
 *
 * `BlueprintCellButton` reads one field — the active tool — and there are
 * several hundred of it on a board. It used to read that field out of the
 * same context value the annotation marks travel in, and a context consumer
 * re-renders when the value's identity changes no matter which field it
 * reads. Dragging one sticky note replaced the marks array on every raw
 * `pointermove`, so every cell re-rendered sixty to a hundred and twenty
 * times a second, and memoizing the cell could not have helped.
 *
 * This asserts the subscription, which is the thing that was wrong: a mark
 * added or moved does not re-render a tool-only reader, and picking a tool
 * still does. Counting renders is the only honest way to say that — the
 * split is invisible to every assertion about what is on screen.
 */
import { act, cleanup, render } from '@testing-library/react'
import { useEffect } from 'react'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { CanvasAnnotationProvider } from '@/contexts/CanvasAnnotationProvider'
import {
  useCanvasAnnotationTool,
  useCanvasAnnotationToolOptional,
  useCanvasAnnotations,
  type CanvasAnnotationContextValue,
  type CanvasAnnotationToolContextValue,
} from '@/contexts/canvasAnnotationContext'
import {
  ANNOTATION_DEFAULT_STROKE,
  ANNOTATION_INK,
} from '@/lib/canvasAnnotations'

/**
 * Written from an effect, never during render — an effect runs once per
 * render that actually happened, which is exactly the quantity under test.
 */
const probe: {
  toolRenders: number
  tool: CanvasAnnotationToolContextValue | null
  marks: CanvasAnnotationContextValue | null
} = { toolRenders: 0, tool: null, marks: null }

beforeEach(() => {
  probe.toolRenders = 0
  probe.tool = null
  probe.marks = null
})
afterEach(cleanup)

/** Stands in for a cell: reads `tool`, reads nothing else. */
function ToolOnlyReader() {
  const value = useCanvasAnnotationTool()
  useEffect(() => {
    probe.toolRenders += 1
    probe.tool = value
  })
  return <span data-testid="tool">{value.tool}</span>
}

function MarksReader() {
  const value = useCanvasAnnotations()
  useEffect(() => {
    probe.marks = value
  })
  return null
}

function mount() {
  render(
    <CanvasAnnotationProvider>
      <ToolOnlyReader />
      <MarksReader />
    </CanvasAnnotationProvider>,
  )
}

const box = (id: string, x: number) => ({
  id,
  type: 'rect' as const,
  x,
  y: 0,
  width: 10,
  height: 10,
  strokeWidth: ANNOTATION_DEFAULT_STROKE,
  color: ANNOTATION_INK,
  fillColor: null,
  text: '',
})

describe('what a cell subscribes to', () => {
  it('does not re-render a tool reader when a mark is added', () => {
    mount()
    const before = probe.toolRenders
    act(() => probe.marks!.addAnnotation(box('a', 0)))
    expect(probe.toolRenders).toBe(before)
  })

  it('does not re-render a tool reader while a mark is dragged', () => {
    mount()
    act(() => probe.marks!.addAnnotation(box('a', 0)))
    const before = probe.toolRenders
    // Twenty pointer samples' worth of position patches.
    act(() => {
      for (let x = 1; x <= 20; x += 1) probe.marks!.updateAnnotation('a', { x })
    })
    expect(probe.toolRenders).toBe(before)
  })

  it('still re-renders a tool reader when the tool changes', () => {
    mount()
    const before = probe.toolRenders
    act(() => probe.tool!.setTool('pen'))
    expect(probe.toolRenders).toBe(before + 1)
    expect(probe.tool!.tool).toBe('pen')
  })

  it('still re-renders a tool reader when a pen setting changes', () => {
    mount()
    const before = probe.toolRenders
    act(() => probe.tool!.setPenStrokeWidth(9))
    expect(probe.toolRenders).toBe(before + 1)
  })

  it('keeps the hand out of isAnnotating, so it still pans', () => {
    mount()
    act(() => probe.tool!.setTool('hand'))
    expect(probe.tool!.isAnnotating).toBe(false)
    act(() => probe.tool!.setTool('pen'))
    expect(probe.tool!.isAnnotating).toBe(true)
  })
})

describe('outside the provider', () => {
  it('answers null rather than throwing, for the portalled drawer', () => {
    const seen: Array<CanvasAnnotationToolContextValue | null> = []
    function Outside() {
      const value = useCanvasAnnotationToolOptional()
      useEffect(() => {
        seen.push(value)
      })
      return null
    }
    render(<Outside />)
    expect(seen).toEqual([null])
  })
})
