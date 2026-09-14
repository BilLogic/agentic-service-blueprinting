// @vitest-environment jsdom
/**
 * THE ANNOTATION-DRAG SLICE.
 *
 * One flow, end to end, through the real code at every layer a split of
 * `CanvasAnnotationLayer.tsx` would move: a person opens annotation mode from
 * the real toolbar, draws a box across two cells of a rendered board, drags it
 * onto a third, captures the marks, and the capture names the cells the box
 * covers — the drawn two before the drag, the dragged-to one after it. The
 * layer is then unmounted and mounted again under the same provider, and the
 * mark is still where the drag left it.
 *
 * The layer is the real `CanvasAnnotationLayer`, the state is the real
 * `CanvasAnnotationProvider`, the tool is picked from the real
 * `CanvasAnnotationToolbar`, and the read-back is the real
 * `AnnotationCaptureMenu` over the real `captureMarks` — the pointer path, the
 * frame-batched drag queue and the camera un-projection all run as they ship.
 *
 * THERE IS NO PERSISTENCE; THE READ-BACK IS THE CAPTURE. The cell-edit slice
 * has a row to read back, so its fake is an in-memory table. This flow has no
 * row and no store of any kind: annotations are deliberately not persisted
 * (`src/lib/annotationCapture.ts` and `AnnotationCaptureMenu.tsx` both say why
 * — saving every stroke would turn markup into a record), and there is no
 * annotations table in the schema to stand one up for. So the read-back here
 * is the CAPTURE and nothing else — `setPendingAgentAttachment`, an in-memory
 * hand-off to the composer, read back with `takePendingAgentAttachment`. The
 * issue that asked for this slice called that persistence, and the issue's word
 * was wrong: nothing is stored, and the capture is the read-back because it is
 * the one thing the flow produces — each mark resolved to the cells it
 * overlaps, in board space, off the rendered grid. A mark that landed on the
 * wrong cells, or a drag that did not land at all, fails here rather than in a
 * browser.
 *
 * WHAT IS STUBBED, AND WHY. Two things, both geometry, both at the smallest
 * seam, because jsdom lays nothing out:
 *
 *   1. `getBoundingClientRect` on the annotation layer and on each cell, plus
 *      `offsetWidth`/`offsetHeight` on the layer. The layer reads exactly
 *      those to un-project the camera (`clientToLocal`, `getLayerScale`), and
 *      the capture menu divides the same pair to undo it again; unstubbed they
 *      are all zero, the scale degenerates, and every cell is dropped by the
 *      menu's own zero-rect filter. The board those rects belong to is
 *      therefore a stub too — a `[data-zoom-pan-root]` holding three
 *      `[data-blueprint-cell]` boxes — because a cell's only contribution to
 *      this flow is its id and its rectangle, and under jsdom the rectangle is
 *      the test's whichever component draws it. This is the pattern
 *      `src/hooks/useZoomPanViewport.cameraFlight.test.tsx` uses.
 *   2. `setPointerCapture` / `releasePointerCapture` on the layer element.
 *      jsdom implements neither, and the layer calls the first one bare.
 *
 * THE CAMERA IS NOT AT ZOOM 1, ON PURPOSE. The stubbed layer is twice as wide
 * in its own units as it is on screen, and it sits at an offset — so every
 * client pixel this file sends is HALF a board unit, and the drag's local
 * distance is twice the distance the pointer moved. The assertions are written
 * against the un-projection rather than against the raw pixels, which is what
 * makes them fail for a split that drops the scale term: at zoom 1 that
 * division is the identity and a dropped scale reads as a pass.
 *
 * FRAMES ARE TURNED BY HAND. The drag publishes once a FRAME
 * (`createFramePatchQueue`), not once a pointer sample, and `pointerup`
 * flushes whatever the last frame still owes. Under real timers the flush
 * would be the only publish this file ever saw, and the rAF path — the one
 * that runs while a person is actually dragging — would go untested. So
 * `requestAnimationFrame` is faked and turned explicitly: a move with no frame
 * after it must NOT have moved the mark, and the frame after it must.
 *
 * Everything between the pointer and the captured payload is the shipped code.
 * One leaf read that is not this flow's is mocked, the way the cell-edit slice
 * mocks its two: the Supabase provider, for the single `canWrite` the capture
 * menu reads to decide whether the agent item exists.
 *
 * THE GUARD HAS BEEN WATCHED GO RED. The third case injects the shape of
 * defect this slice exists to catch — the drag's position write dropped, which
 * is the `dropOnWrite` of a flow whose write is a context call rather than a
 * column — by overriding `updateAnnotation` to swallow `x` and `y`. The mark
 * then reads back on the cells it was drawn over instead of the one it was
 * dragged to, and the assertion the first case makes no longer holds.
 *
 * WHAT THIS FILE CANNOT SEE, AND WHERE THAT IS SEEN. The three stubs above are
 * the three things jsdom cannot do: lay a board out, apply the canvas's CSS
 * transform, and take a real pointer capture. Those are covered in a browser by
 * `render-walk/annotation-drag.spec.ts`, which draws and drags with real mouse
 * moves over the bundled sample board and reads the captured cell ids out of
 * the capture menu's own download.
 *
 * The hold this lifts — and the per-flow exit condition it satisfies — is
 * recorded in the decision that large component splits wait for an end-to-end
 * round, where the same account of the stubs above is kept.
 */
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { useMemo, type ReactNode } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

// The one leaf read that is not this flow's: the capture menu asks whether
// this session can write, to decide whether the agent item exists at all.
vi.mock('@/contexts/SupabaseProvider', () => ({
  useSupabase: () => ({ client: null, configured: false, canWrite: true }),
}))

import { CanvasAnnotationLayer } from '@/components/editor/CanvasAnnotationLayer'
import { CanvasAnnotationToolbar } from '@/components/editor/CanvasAnnotationToolbar'
import { CanvasAnnotationProvider } from '@/contexts/CanvasAnnotationProvider'
import {
  CanvasAnnotationContext,
  useCanvasAnnotations,
} from '@/contexts/canvasAnnotationContext'
import { takePendingAgentAttachment } from '@/lib/agent/attachments'
import type { CanvasAnnotation } from '@/lib/canvasAnnotations'

/** A box in board coordinates — what the stubbed layout hands back. */
type Box = { left: number; top: number; width: number; height: number }

/**
 * The camera the stubbed layout stands for: the board is drawn at half size.
 *
 * Anything but 1 is the point. At 1 the layer's rect and its `offsetWidth` are
 * equal, `clientToLocal` and `getLayerScale` divide by 1, and a split that
 * dropped the scale term entirely would still pass every assertion here.
 */
const SCALE = 0.5

/**
 * Where the annotation layer sits on screen, and how big it is in board units.
 *
 * The width and height are the layer's OWN units (`offsetWidth`/`offsetHeight`);
 * on screen it is `SCALE` times that, at a non-zero offset, so the pan and the
 * zoom both have to be undone to get from a client point to a board point.
 */
const LAYER: Box = { left: 100, top: 60, width: 1200, height: 600 }

/** The layer's on-screen rectangle: the camera applied to the box above. */
const LAYER_ON_SCREEN: Box = {
  left: LAYER.left,
  top: LAYER.top,
  width: LAYER.width * SCALE,
  height: LAYER.height * SCALE,
}

/**
 * The board under the marks: three cells in a row with gaps between them, so a
 * box can cover two of them and a drag can carry it clear of both. Board
 * coordinates — the camera is applied when they are stamped.
 */
const CELLS: Array<{ id: string; box: Box }> = [
  { id: 'cell-a', box: { left: 0, top: 0, width: 100, height: 80 } },
  { id: 'cell-b', box: { left: 120, top: 0, width: 100, height: 80 } },
  { id: 'cell-c', box: { left: 240, top: 0, width: 100, height: 80 } },
]

/** The box the person draws, in board coordinates: over cell A and cell B. */
const DRAWN = { x0: 10, y0: 10, x1: 130, y1: 60 }

/**
 * How far the drag carries the mark, in CLIENT pixels — what a mouse moves.
 *
 * The board distance is `dx / SCALE`, which is 240 units and is what the mark's
 * own position has to move by: clear of A and B, onto C. The two numbers being
 * different is the whole reason this drag is stated in client pixels.
 */
const DRAG_CLIENT = { dx: 120, dy: 0 }

/** The same drag in board units — the un-projection this flow has to perform. */
const DRAG_LOCAL = { dx: DRAG_CLIENT.dx / SCALE, dy: DRAG_CLIENT.dy / SCALE }

/**
 * A move too small to be a drag, in board units.
 *
 * `DRAG_THRESHOLD` in the layer is 3 board units; this is under it. The layer
 * does not export the constant, so this is a number with a name — and a change
 * to the threshold that made this a real drag would turn the sub-threshold case
 * red rather than quiet, which is the failure mode worth having.
 */
const NUDGE_LOCAL = 2

function domRect(box: Box): DOMRect {
  const value = {
    x: box.left,
    y: box.top,
    left: box.left,
    top: box.top,
    width: box.width,
    height: box.height,
    right: box.left + box.width,
    bottom: box.top + box.height,
  }
  return { ...value, toJSON: () => value } as DOMRect
}

/**
 * Give an element the layout jsdom will not: the box it occupies on screen, and
 * the size it occupies in its own units. The layer divides one by the other to
 * recover the camera, so both halves have to be there.
 */
function stampLayout(element: HTMLElement, onScreen: Box, own: Box) {
  Object.defineProperties(element, {
    offsetWidth: { configurable: true, value: own.width },
    offsetHeight: { configurable: true, value: own.height },
    clientWidth: { configurable: true, value: own.width },
    clientHeight: { configurable: true, value: own.height },
  })
  element.getBoundingClientRect = () => domRect(onScreen)
}

/** Board coordinates to client coordinates, through the stubbed camera. */
const client = (x: number, y: number) => ({
  clientX: LAYER_ON_SCREEN.left + x * SCALE,
  clientY: LAYER_ON_SCREEN.top + y * SCALE,
})

/**
 * The board the marks are drawn over: the root the capture menu looks under,
 * holding one element per cell, each stamped where the camera puts it.
 */
function StubBoard() {
  return (
    <div data-zoom-pan-root="">
      {CELLS.map(({ id, box }) => (
        <div
          key={id}
          data-blueprint-cell={id}
          data-blueprint-cell-interactive=""
          ref={(node) => {
            if (!node) return
            stampLayout(
              node,
              {
                left: LAYER_ON_SCREEN.left + box.left * SCALE,
                top: LAYER_ON_SCREEN.top + box.top * SCALE,
                width: box.width * SCALE,
                height: box.height * SCALE,
              },
              box,
            )
          }}
        />
      ))}
    </div>
  )
}

/**
 * A drag whose position write never lands — the injected defect, and the only
 * thing separating the guard case from the first one. The real provider is
 * still underneath; this overrides the one call the drag publishes through, the
 * way a grant that forgot a column drops a patch on its way to the row.
 */
function DropTheDragWrite({ children }: { children: ReactNode }) {
  const real = useCanvasAnnotations()
  const value = useMemo(
    () => ({
      ...real,
      updateAnnotation: (id: string, patch: Partial<CanvasAnnotation>) => {
        const { x: _x, y: _y, ...rest } = patch as { x?: number; y?: number }
        real.updateAnnotation(id, rest as Partial<CanvasAnnotation>)
      },
    }),
    [real],
  )
  return (
    <CanvasAnnotationContext.Provider value={value}>
      {children}
    </CanvasAnnotationContext.Provider>
  )
}

/**
 * Mount the flow, and hand back the one control the leave-and-return case
 * needs: whether the LAYER is on the page. The provider around it stays
 * mounted either way, which is what makes the remount a remount rather than a
 * fresh session.
 */
function mount({ dropDragWrites = false }: { dropDragWrites?: boolean } = {}) {
  const tree = (withLayer: boolean) => {
    const canvas = (
      <>
        <StubBoard />
        {/* `zoom` is chrome sizing only — the geometry under test comes from
            the layer measuring itself, which is why the camera above is
            stamped rather than declared here. */}
        {withLayer ? <CanvasAnnotationLayer zoom={SCALE} /> : null}
        <CanvasAnnotationToolbar />
      </>
    )
    return (
      <CanvasAnnotationProvider>
        {dropDragWrites ? <DropTheDragWrite>{canvas}</DropTheDragWrite> : canvas}
      </CanvasAnnotationProvider>
    )
  }

  const view = render(tree(true))

  /** Find the layer and give it the layout and the pointer capture jsdom owes it. */
  const stampLayer = () => {
    const layer = document.querySelector<HTMLElement>(
      '[data-canvas-annotation-layer]',
    )
    if (!layer) throw new Error('the annotation layer did not mount')
    stampLayout(layer, LAYER_ON_SCREEN, LAYER)
    layer.setPointerCapture = () => {}
    layer.releasePointerCapture = () => {}
    return layer
  }

  return {
    layer: stampLayer(),
    /** Take the layer off the page and put it back, provider untouched. */
    remountLayer: () => {
      view.rerender(tree(false))
      expect(
        document.querySelector('[data-canvas-annotation-layer]'),
        'the layer really left the page',
      ).toBeNull()
      view.rerender(tree(true))
      return stampLayer()
    },
  }
}

/** The tool button the toolbar offers under this accessible name. */
const pickTool = (name: string) =>
  fireEvent.click(screen.getByRole('button', { name }))

/**
 * Whether the toolbar shows that tool as the live one. A family slot renames
 * its face once the family holds the tool — "Rectangle" becomes "Rectangle —
 * Shapes tools" — so the live name is the one asked for here.
 */
const toolIsLive = (liveName: string) =>
  screen.getByRole('button', { name: liveName }).getAttribute('aria-pressed')

/**
 * Turn one frame.
 *
 * `requestAnimationFrame` is faked for this file, so the drag queue publishes
 * only when this is called. Inside `act`, because the publish is a state
 * update: outside it React would warn and the assertion after it could read
 * the DOM before the re-render.
 */
const turnAFrame = () => act(() => void vi.advanceTimersByTime(16))

/** Draw the box: press on the layer, move, release. The stroke listens on the window. */
function drawTheBox(layer: HTMLElement) {
  fireEvent.pointerDown(layer, {
    pointerId: 1,
    button: 0,
    ...client(DRAWN.x0, DRAWN.y0),
  })
  fireEvent.pointerMove(window, { pointerId: 1, ...client(DRAWN.x1, DRAWN.y1) })
  turnAFrame()
  fireEvent.pointerUp(window, { pointerId: 1, ...client(DRAWN.x1, DRAWN.y1) })
}

/** The mark's own element, which carries its position as its style. */
function markNode(): HTMLElement {
  const node = document.querySelector<HTMLElement>(
    '[data-canvas-annotation-layer] [data-annotation-id]',
  )
  if (!node) throw new Error('no mark is on the layer')
  return node
}

/** Where the mark says it is, in board units. */
const markLeft = () => markNode().style.left
const markTop = () => markNode().style.top

/** Where the drag grabs the mark, in board coordinates. */
const GRAB = { x: DRAWN.x0 + 20, y: DRAWN.y0 + 20 }

/** Press on the mark itself; the layer holds the capture from here. */
const pressOnTheMark = () =>
  fireEvent.pointerDown(markNode(), {
    pointerId: 2,
    button: 0,
    ...client(GRAB.x, GRAB.y),
  })

/** Move the captured pointer to a point given in BOARD coordinates. */
const movePointer = (layer: HTMLElement, x: number, y: number) =>
  fireEvent.pointerMove(layer, { pointerId: 2, ...client(x, y) })

/** Release the captured pointer, which flushes whatever the frame still owes. */
const releasePointer = (layer: HTMLElement, x: number, y: number) =>
  fireEvent.pointerUp(layer, { pointerId: 2, ...client(x, y) })

/**
 * The read-back: capture the marks the way a person does — the menu on the
 * toolbar, then its agent item — and answer what the payload says each mark
 * covers.
 */
function captureCoveredCells(): Array<{ type: string; cells: string[] }> {
  fireEvent.click(
    screen.getByRole('button', { name: 'Save or send these marks' }),
  )
  fireEvent.click(screen.getByText('Send to the agent'))
  const attachment = takePendingAgentAttachment()
  if (!attachment) throw new Error('the capture menu sent nothing')
  const marks = JSON.parse(attachment.payload) as Array<{
    type: string
    overlapping_cell_ids: string[]
  }>
  return marks.map((mark) => ({
    type: mark.type,
    cells: mark.overlapping_cell_ids,
  }))
}

beforeEach(() => {
  // Frames, driven by hand: see `turnAFrame`. The timers go with them because
  // the layer's text-edit focus schedules a `setTimeout` inside a frame, and a
  // faked frame that queued a real timeout would outlive the test.
  vi.useFakeTimers({
    toFake: [
      'requestAnimationFrame',
      'cancelAnimationFrame',
      'setTimeout',
      'clearTimeout',
    ],
  })
  // jsdom has no `matchMedia`; the toolbar reads it for the mobile shell, which
  // has no annotation tools at all, so the desktop posture is what this flow is.
  window.matchMedia = ((query: string) => ({
    media: query,
    matches: false,
    addEventListener() {},
    removeEventListener() {},
  })) as unknown as typeof window.matchMedia
  takePendingAgentAttachment()
})

afterEach(() => {
  cleanup()
  vi.useRealTimers()
  takePendingAgentAttachment()
})

describe('a box is drawn across cells, dragged, and read back where it landed', () => {
  it('covers the drawn cells, then the dragged-to cell, and keeps its place across a layer remount', () => {
    const { layer, remountLayer } = mount()

    // Annotation mode: the Shapes slot's face is the rectangle, and picking it
    // is what makes the layer take the pointer at all.
    pickTool('Rectangle')
    expect(toolIsLive('Rectangle — Shapes tools')).toBe('true')

    drawTheBox(layer)
    // The box committed where it was drawn — in BOARD units, which are not the
    // client pixels it was drawn with.
    expect(markLeft()).toBe(`${DRAWN.x0}px`)
    expect(markTop()).toBe(`${DRAWN.y0}px`)
    expect(captureCoveredCells()).toEqual([
      { type: 'rect', cells: ['cell-a', 'cell-b'] },
    ])

    // Drawing leaves the new mark in text-edit; a drag starts only once that
    // is dismissed, which is what Escape is for.
    fireEvent.keyDown(window, { key: 'Escape' })

    // THE DRAG, one frame at a time. Halfway first, with no frame after it:
    // the queue is holding a patch nobody has published yet, so the mark has
    // not moved.
    pressOnTheMark()
    movePointer(layer, GRAB.x + DRAG_LOCAL.dx / 2, GRAB.y)
    expect(
      markLeft(),
      'a pointer sample with no frame after it publishes nothing',
    ).toBe(`${DRAWN.x0}px`)

    // The frame publishes it, mid-drag, before any pointerup — and it lands at
    // the UN-PROJECTED distance: sixty client pixels are a hundred and twenty
    // board units at this camera.
    turnAFrame()
    expect(markLeft(), 'the frame published the half-way position').toBe(
      `${DRAWN.x0 + DRAG_LOCAL.dx / 2}px`,
    )

    // The rest of the move, then the release, whose flush publishes whatever
    // the last frame still owed.
    movePointer(layer, GRAB.x + DRAG_LOCAL.dx, GRAB.y + DRAG_LOCAL.dy)
    releasePointer(layer, GRAB.x + DRAG_LOCAL.dx, GRAB.y + DRAG_LOCAL.dy)

    expect(markLeft()).toBe(`${DRAWN.x0 + DRAG_LOCAL.dx}px`)
    expect(markTop()).toBe(`${DRAWN.y0 + DRAG_LOCAL.dy}px`)
    expect(captureCoveredCells()).toEqual([{ type: 'rect', cells: ['cell-c'] }])

    // LEAVE AND COME BACK. Out of annotation mode by the toolbar, then the
    // layer off the page entirely and back on — which is what the app does
    // when the canvas that holds it is unmounted. The marks are the
    // PROVIDER's state, not the layer's, so they survive this; they would not
    // survive the provider going with it, and that is the deliberate
    // ephemerality rather than a gap.
    pickTool('Pen')
    pickTool('Select / pan')
    const remounted = remountLayer()
    expect(remounted, 'the layer came back').toBeTruthy()
    expect(markLeft()).toBe(`${DRAWN.x0 + DRAG_LOCAL.dx}px`)
    expect(markTop()).toBe(`${DRAWN.y0 + DRAG_LOCAL.dy}px`)
    expect(captureCoveredCells()).toEqual([{ type: 'rect', cells: ['cell-c'] }])
  })

  // The threshold, which is what keeps a click on a mark from nudging it: a
  // press, a move too small to mean a drag, and a release leave the mark
  // exactly where it was, on the cells it was drawn over.
  it('does not move the mark for a press and a move under the drag threshold', () => {
    const { layer } = mount()
    pickTool('Rectangle')
    drawTheBox(layer)
    fireEvent.keyDown(window, { key: 'Escape' })

    pressOnTheMark()
    movePointer(layer, GRAB.x + NUDGE_LOCAL, GRAB.y)
    turnAFrame()
    releasePointer(layer, GRAB.x + NUDGE_LOCAL, GRAB.y)

    expect(markLeft(), 'a sub-threshold move is not a drag').toBe(
      `${DRAWN.x0}px`,
    )
    expect(markTop()).toBe(`${DRAWN.y0}px`)
    expect(captureCoveredCells()).toEqual([
      { type: 'rect', cells: ['cell-a', 'cell-b'] },
    ])
  })

  // The instrument, against the shape of defect it exists for: the drag's
  // position write does not land, so the mark reads back on the cells it was
  // drawn over rather than the one it was dragged to.
  it('goes red on a wrong read-back: a drag whose position write is dropped', () => {
    const { layer } = mount({ dropDragWrites: true })
    pickTool('Rectangle')
    drawTheBox(layer)
    fireEvent.keyDown(window, { key: 'Escape' })

    pressOnTheMark()
    movePointer(layer, GRAB.x + DRAG_LOCAL.dx, GRAB.y + DRAG_LOCAL.dy)
    turnAFrame()
    releasePointer(layer, GRAB.x + DRAG_LOCAL.dx, GRAB.y + DRAG_LOCAL.dy)

    expect(markLeft()).toBe(`${DRAWN.x0}px`)
    const covered = captureCoveredCells()
    expect(covered).not.toEqual([{ type: 'rect', cells: ['cell-c'] }])
    expect(covered).toEqual([{ type: 'rect', cells: ['cell-a', 'cell-b'] }])
  })
})
