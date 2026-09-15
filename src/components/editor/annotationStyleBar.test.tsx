// @vitest-environment jsdom
/**
 * THE STYLE BAR, THROUGH THE TABLE THAT DRIVES IT.
 *
 * There were three bars and 692 lines of them, and no test anywhere could go
 * red on what any of them did. They are one bar over
 * `canvasAnnotationKinds.ts` now, so the table is the interface and this file
 * reaches through it: the cases below read `ANNOTATION_MARK_KINDS` and assert
 * that what a kind DECLARES is what a person is handed — every declared
 * control present under its own accessible name, nothing else present, a rule
 * between groups and none inside one, and each control writing the patch it
 * says it writes.
 *
 * That is deliberately not a list of nine hand-written cases. A fourth kind of
 * mark is a row in the table, and the row is what these cases enumerate, so
 * the row is covered the day it is added — and a row that declares a control
 * the bar cannot draw fails here rather than in front of somebody.
 */
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { AnnotationStyleBar } from '@/components/editor/AnnotationStyleBar'
import {
  ANNOTATION_MARK_KINDS,
  annotationMarkKind,
  type AnnotationBarControl,
  type AnnotationMarkKind,
} from '@/components/editor/canvasAnnotationKinds'
import {
  ANNOTATION_DEFAULT_STROKE,
  ANNOTATION_STICKY_SWATCHES,
  ANNOTATION_STROKE_SWATCHES,
  annotationSwatchName,
  type PlacedAnnotation,
} from '@/lib/canvasAnnotations'
import { annotationTextBox } from '@/components/editor/canvasAnnotationGeometry'

afterEach(cleanup)

/** One mark of each kind, all three styled, so no control reads a default. */
const MARKS: Record<AnnotationMarkKind, PlacedAnnotation> = {
  shape: {
    id: 's1',
    type: 'rect',
    x: 40,
    y: 80,
    width: 200,
    height: 120,
    strokeWidth: 2.5,
    color: ANNOTATION_STROKE_SWATCHES[0],
    fillColor: null,
    text: 'label',
  },
  sticky: {
    id: 'k1',
    type: 'sticky',
    x: 40,
    y: 80,
    width: 160,
    height: 120,
    color: ANNOTATION_STICKY_SWATCHES[0],
    text: 'note',
    fontSize: 14,
  },
  text: {
    id: 't1',
    type: 'text',
    x: 40,
    y: 80,
    text: 'words',
    color: ANNOTATION_STROKE_SWATCHES[0],
    fontSize: 14,
  },
}

/**
 * What a declared control is called on screen.
 *
 * This is the one mapping the table cannot carry — a label is the bar's copy,
 * not a fact about a kind — so it is written here and every kind is measured
 * against it. A control id with no entry is a control this file has not been
 * taught, and the exhaustive read below fails rather than skipping it.
 */
const CONTROL_NAME: Record<AnnotationBarControl['id'], string> = {
  shapeType: 'Shape',
  fill: 'Fill',
  stroke: 'Line style',
  color: 'Color',
  fontSize: 'Text size',
  bold: 'Bold',
  strike: 'Strikethrough',
  align: 'Alignment',
  delete: '',
}

function nameOf(control: AnnotationBarControl): string {
  return control.id === 'delete' ? control.label : CONTROL_NAME[control.id]
}

function declaredControls(kind: AnnotationMarkKind): AnnotationBarControl[] {
  return ANNOTATION_MARK_KINDS[kind].controls.flat()
}

function renderBar(kind: AnnotationMarkKind, over: Partial<PlacedAnnotation> = {}) {
  const onChange = vi.fn()
  const onDelete = vi.fn()
  const mark = { ...MARKS[kind], ...over } as PlacedAnnotation
  const view = render(
    <AnnotationStyleBar
      mark={mark}
      zoom={1}
      onChange={onChange}
      onDelete={onDelete}
    />,
  )
  return { ...view, onChange, onDelete }
}

const KINDS = Object.keys(ANNOTATION_MARK_KINDS) as AnnotationMarkKind[]

describe.each(KINDS)('the bar a %s declares', (kind) => {
  it('offers every control the table declares, and no other', () => {
    const { container } = renderBar(kind)
    const declared = declaredControls(kind)

    for (const control of declared) {
      expect(
        screen.getAllByLabelText(nameOf(control)),
        `${kind} declares ${control.id}`,
      ).toHaveLength(1)
    }

    // Nothing the table did not ask for: a bar is exactly its controls, so a
    // control drawn unconditionally would show up here as a surplus button.
    expect(
      container.querySelectorAll('[data-annotation-chrome] > button'),
    ).toHaveLength(declared.length)
  })

  it('draws a rule between groups and none inside one', () => {
    const { container } = renderBar(kind)
    expect(container.querySelectorAll('div.w-px')).toHaveLength(
      ANNOTATION_MARK_KINDS[kind].controls.length - 1,
    )
  })

  it('anchors over the mark it styles', () => {
    const { container } = renderBar(kind)
    const mark = MARKS[kind]
    const width =
      mark.type === 'text' ? annotationTextBox(mark.fontSize).width : mark.width
    const plate = container.querySelector<HTMLElement>('[data-annotation-chrome]')
    expect(plate?.style.left).toBe(`${mark.x + width / 2}px`)
  })

  it('names the thing its delete button deletes', () => {
    const { onDelete } = renderBar(kind)
    const label = nameOf(
      declaredControls(kind).find((control) => control.id === 'delete')!,
    )
    expect(label).toBe(`Delete ${kind}`)
    fireEvent.click(screen.getByLabelText(label))
    expect(onDelete).toHaveBeenCalledTimes(1)
  })
})

describe('the controls a kind declares write what they say', () => {
  it('a colour swatch patches the ink and is drawn from the kind’s own set', () => {
    for (const [kind, swatches] of [
      ['sticky', ANNOTATION_STICKY_SWATCHES],
      ['text', ANNOTATION_STROKE_SWATCHES],
    ] as const) {
      const { onChange, container } = renderBar(kind)
      fireEvent.click(screen.getByLabelText('Color'))
      const popup = screen.getByText('Color', { selector: 'span' }).parentElement!
      const declared = ANNOTATION_MARK_KINDS[kind].controls
        .flat()
        .find((control) => control.id === 'color')
      expect(declared?.id === 'color' && declared.swatches).toEqual(swatches)

      const swatch = swatches[1]
      fireEvent.click(
        within(popup).getByLabelText(
          `${declared?.id === 'color' ? declared.swatchLabel : ''} ${annotationSwatchName(swatch)}`,
        ),
      )
      expect(onChange).toHaveBeenCalledWith({ color: swatch })
      expect(container).toBeTruthy()
      cleanup()
    }
  })

  it('a size rung patches the font size', () => {
    const { onChange } = renderBar('sticky')
    fireEvent.click(screen.getByLabelText('Text size'))
    fireEvent.click(screen.getByRole('button', { name: 'Huge' }))
    expect(onChange).toHaveBeenCalledWith({ fontSize: 48 })
  })

  it('bold and strikethrough toggle away from what the mark carries', () => {
    const { onChange } = renderBar('text', { bold: true })
    const bold = screen.getByLabelText('Bold')
    expect(bold.getAttribute('aria-pressed')).toBe('true')
    fireEvent.click(bold)
    expect(onChange).toHaveBeenCalledWith({ bold: false })

    const strike = screen.getByLabelText('Strikethrough')
    expect(strike.getAttribute('aria-pressed')).toBe('false')
    fireEvent.click(strike)
    expect(onChange).toHaveBeenCalledWith({ strike: true })
  })

  it('alignment patches the edge the type is set against', () => {
    const { onChange } = renderBar('text')
    fireEvent.click(screen.getByLabelText('Alignment'))
    fireEvent.click(screen.getByRole('button', { name: 'Center' }))
    expect(onChange).toHaveBeenCalledWith({ align: 'center' })
  })

  it('the shape control changes what the mark is', () => {
    const { onChange } = renderBar('shape')
    fireEvent.click(screen.getByLabelText('Shape'))
    fireEvent.click(screen.getByRole('menuitem', { name: 'Ellipse' }))
    expect(onChange).toHaveBeenCalledWith({ type: 'ellipse' })
  })

  it('a fill can be taken away, and taking it away is not the same as choosing one', () => {
    const { onChange } = renderBar('shape', { fillColor: null })
    fireEvent.click(screen.getByLabelText('Fill'))
    fireEvent.click(screen.getByLabelText('No fill'))
    expect(onChange).toHaveBeenCalledWith({ fillColor: null })
  })

  it('choosing a stroke colour for an unstroked shape gives it a weight to draw with', () => {
    const { onChange } = renderBar('shape', { color: null, strokeWidth: 0 })
    fireEvent.click(screen.getByLabelText('Line style'))
    // With no stroke there is no weight to pick, so the rungs are absent.
    expect(screen.queryByLabelText('Outline weight 2.5px')).toBeNull()

    const swatch = ANNOTATION_STROKE_SWATCHES[2]
    fireEvent.click(
      screen.getByLabelText(`Stroke ${annotationSwatchName(swatch)}`),
    )
    expect(onChange).toHaveBeenCalledWith({
      color: swatch,
      strokeWidth: ANNOTATION_DEFAULT_STROKE,
    })
  })
})

describe('the table names the kind a mark is', () => {
  it.each([
    ['rect', 'shape'],
    ['ellipse', 'shape'],
    ['sticky', 'sticky'],
    ['text', 'text'],
  ] as const)('%s is the %s row', (type, kind) => {
    const mark = { ...MARKS[kind === 'shape' ? 'shape' : kind], type }
    expect(annotationMarkKind(mark as PlacedAnnotation)).toBe(kind)
  })
})
