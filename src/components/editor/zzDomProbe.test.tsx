// @vitest-environment jsdom
/** TEMPORARY probe — dumps the rendered DOM of every annotation bar and mark. */
import { writeFileSync } from 'node:fs'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, expect, it, vi } from 'vitest'
import { AnnotationStyleBar } from '@/components/editor/AnnotationStyleBar'
import { AnnotationMarkNode } from '@/components/editor/AnnotationMarkNode'
import type {
  ShapeAnnotation,
  StickyAnnotation,
  TextAnnotation,
} from '@/lib/canvasAnnotations'

afterEach(cleanup)

const OUT = process.env.PROBE_OUT ?? '/tmp/probe.txt'

const shape: ShapeAnnotation = {
  id: 's1', type: 'rect', x: 10, y: 20, width: 100, height: 60,
  strokeWidth: 2.5, color: 'var(--color-violet-1100)',
  fillColor: 'var(--color-lime-300)', text: 'hello',
}
const sticky: StickyAnnotation = {
  id: 'k1', type: 'sticky', x: 10, y: 20, width: 160, height: 120,
  color: 'var(--color-yellow-500)', text: 'note', fontSize: 14,
  bold: true, strike: true,
}
const text: TextAnnotation = {
  id: 't1', type: 'text', x: 10, y: 20, text: 'words',
  color: 'var(--color-slate-1200)', fontSize: 14, bold: true,
  strike: true, align: 'center',
}

const movable = (over: Record<string, unknown> = {}) => ({
  selected: true, editing: false, canInteract: true, isEraser: false,
  canDrag: true, onSelect: vi.fn(), onStartEdit: vi.fn(), onStopEdit: vi.fn(),
  onErase: vi.fn(), onDragStart: vi.fn(), onResizeStart: vi.fn(), ...over,
})

const chunks: string[] = []

function snap(name: string) {
  chunks.push(`\n===== ${name} =====\n${document.body.innerHTML}`)
}

/** Open every trigger in turn, snapping the popup each time. */
function snapWithPopups(name: string, labels: string[]) {
  snap(`${name} · closed`)
  for (const label of labels) {
    cleanupless(label)
    snap(`${name} · ${label} open`)
  }
}
function cleanupless(label: string) {
  const trigger = screen.getAllByLabelText(label)[0]
  fireEvent.click(trigger)
}

it('dumps every annotation surface', () => {
  render(<AnnotationStyleBar mark={shape} zoom={1} onChange={vi.fn()} onDelete={vi.fn()} />)
  snapWithPopups('bar/shape', ['Shape', 'Fill', 'Line style'])
  cleanup()

  render(<AnnotationStyleBar mark={{ ...shape, color: null, fillColor: null, type: 'ellipse' }} zoom={1} onChange={vi.fn()} onDelete={vi.fn()} />)
  snapWithPopups('bar/shape-empty', ['Shape', 'Fill', 'Line style'])
  cleanup()

  render(<AnnotationStyleBar mark={sticky} zoom={1} onChange={vi.fn()} onDelete={vi.fn()} />)
  snapWithPopups('bar/sticky', ['Color', 'Text size'])
  cleanup()

  render(<AnnotationStyleBar mark={{ ...sticky, bold: false, strike: false }} zoom={2} onChange={vi.fn()} onDelete={vi.fn()} />)
  snap('bar/sticky-plain')
  cleanup()

  render(<AnnotationStyleBar mark={text} zoom={1} onChange={vi.fn()} onDelete={vi.fn()} />)
  snapWithPopups('bar/text', ['Color', 'Text size', 'Alignment'])
  cleanup()

  render(<AnnotationStyleBar mark={{ ...text, bold: false, strike: false, align: undefined }} zoom={1} onChange={vi.fn()} onDelete={vi.fn()} />)
  snapWithPopups('bar/text-plain', ['Alignment'])
  cleanup()

  for (const [label, over] of [
    ['selected', {}],
    ['editing', { editing: true }],
    ['idle', { selected: false }],
    ['eraser', { isEraser: true }],
    ['locked', { canInteract: false, canDrag: false, selected: false }],
  ] as Array<[string, Record<string, unknown>]>) {
    render(<AnnotationMarkNode annotation={shape} zoom={1} onUpdate={vi.fn()} {...movable(over)} />)
    snap(`node/shape · ${label}`)
    cleanup()
    render(<AnnotationMarkNode annotation={{ ...shape, type: 'ellipse', fillColor: null, color: null, text: '' }} zoom={1} onUpdate={vi.fn()} {...movable(over)} />)
    snap(`node/shape-empty · ${label}`)
    cleanup()
    render(<AnnotationMarkNode annotation={sticky} zoom={1} onUpdate={vi.fn()} {...movable(over)} />)
    snap(`node/sticky · ${label}`)
    cleanup()
    render(<AnnotationMarkNode annotation={{ ...sticky, bold: false, strike: false }} zoom={1} onUpdate={vi.fn()} {...movable(over)} />)
    snap(`node/sticky-plain · ${label}`)
    cleanup()
    render(<AnnotationMarkNode annotation={text} zoom={1} onUpdate={vi.fn()} {...movable(over)} />)
    snap(`node/text · ${label}`)
    cleanup()
    render(<AnnotationMarkNode annotation={{ ...text, text: '', align: 'right', bold: false, strike: false, fontSize: 32 }} zoom={1} onUpdate={vi.fn()} {...movable(over)} />)
    snap(`node/text-empty · ${label}`)
    cleanup()
  }

  writeFileSync(OUT, chunks.join('\n'))
  expect(chunks.length).toBeGreaterThan(0)
})
