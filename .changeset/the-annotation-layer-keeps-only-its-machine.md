---
'agentic-service-blueprinting': patch
---

**The canvas annotation layer is split, and a person drawing, dragging,
resizing, styling and capturing marks sees no difference.**
`src/components/editor/CanvasAnnotationLayer.tsx` was 2229 lines holding four
unrelated jobs at once: the pointer, drag, resize and selection machine; three
floating style bars; three annotation node components; and the geometry every
one of them divides by. It is 943 lines now, and it holds the machine and the
composition alone.

The pieces sit beside it, which is how this tree names a split module — the
geometry in `canvasAnnotationGeometry.ts`, the pickers in
`CanvasAnnotationSwatches.tsx`, the corner grips in
`CanvasAnnotationResizeHandles.tsx`, the bars in
`AnnotationShapeStyleBar.tsx`, `AnnotationStickyStyleBar.tsx` and
`AnnotationTextStyleBar.tsx` over a shared `CanvasAnnotationBarChrome.tsx`, and the nodes in `ShapeAnnotationNode.tsx`,
`StickyAnnotationNode.tsx` and `TextAnnotationNode.tsx`. The textarea focus
hook every editable node wanted is in `src/hooks/` with the rest of them.

The one thing that is not a move: the plate the three bars float on was
written out three times, and all three copies had to agree on the anchor
arithmetic and on the two attributes the layer's own click-outside rule looks
for. It is `AnnotationStyleBarFrame` now, one element with the same
attributes, classes and handlers it had in each of the three.

**This is the first split ADR 0017 held back, and the record was the point.**
The hold was lifted when the annotation-drag slice and the browser drag case
landed; both were run before the first move and after every move since, on the
same assertions, and no assertion was edited anywhere in the suite. One test
file changed and it is not one of theirs: `tokenDiscipline.test.ts` pins its
colour exemptions to a path, and the line-style preview swatch the layer's
exemption was written for is in `AnnotationShapeStyleBar.tsx` now, so the entry
follows
it. That list refuses an exemption matching no offender, which is how the move
announced itself. What the interface between the
layer and a node is — `MovableProps` — was already the interface; the split
wrote it down. No new prop reaches the layer from outside it. The ADR carries
the outcome.
