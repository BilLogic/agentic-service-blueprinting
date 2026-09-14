---
'agentic-service-blueprinting': patch
---

**The annotation-drag flow has a CI slice and a browser case, and the annotation
layer's split is unblocked.** `src/slices/annotationDrag.slice.test.tsx` opens
annotation mode from the real toolbar, draws a box across two cells of a board
through the real `CanvasAnnotationLayer` — the real pointer sequence, the real
camera un-projection, the real frame-batched drag queue — drags it onto a third
cell, and reads it back through the real capture menu: the captured payload names
the cells the box covers, the two it was drawn over before the drag and the one
it was dragged onto after it, and taking the layer off the page and mounting it
again under the same provider leaves the mark where the drag left it (the marks
are the provider's state, so a layer remount keeps them and a provider remount
would not). CI runs it as `npm run slice:annotation-drag`.

**There is no persistence; the read-back is the capture, and the issue's word was
wrong.** The cell-edit slice reads a cell back because a cell is a row; an
annotation never becomes one. Annotations are deliberately not persisted —
saving every stroke would turn markup into a record, and costing nothing is the
point of the scratch layer — and nothing in this flow is stored anywhere. The
capture is an in-memory hand-off to the composer (`setPendingAgentAttachment`),
and it is the read-back because it is the one thing the flow produces: each mark
resolved to the cells it overlaps, in board space, which is exactly the answer a
bad split of a two-thousand-line drag-and-geometry file would get wrong.

What is stubbed is geometry, at the smallest seam, because jsdom lays nothing
out: `getBoundingClientRect` on the layer and on each cell, `offsetWidth`/
`offsetHeight` on the layer, and `setPointerCapture`/`releasePointerCapture`,
which jsdom does not implement. The stubbed camera is deliberately not zoom 1 —
the layer is twice as wide in its own units as on screen, and offset — so a
split that dropped the scale term goes red instead of dividing by one, and
frames are faked and turned by hand so the drag queue is watched publishing
mid-gesture rather than only at the `pointerup` flush. Two cases watch the guard
fail: one drops the drag's position write, one moves under `DRAG_THRESHOLD` and
requires the mark not to move.

**The three stubs are the three things jsdom cannot do at all, so they are
covered in a browser.** `render-walk/annotation-drag.spec.ts` runs beside the
sample-board walk under the same config: it opens the bundled sample board,
draws a box across two cells of one lane with real mouse moves under the
canvas's live CSS-transform camera, drags it onto a third under a real pointer
capture, and asserts the captured cell ids out of the capture menu's own
`Save N marks` download — nothing was added to the app to make that observable.
`npm run check:render-walk` now runs two cases, both under the walk's
console-error rule.

ADR 0017 now marks annotation drag covered and names
`src/components/editor/CanvasAnnotationLayer.tsx`'s split as unblocked. An agent
session is the one flow still uncovered, and `AgentPanel.tsx` stays held.
