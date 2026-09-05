---
'agentic-service-blueprinting': minor
---

The annotation state is two contexts.

One context value carried both the marks and the tool. The marks change on
every pointer sample of a drag; the tool changes when somebody clicks the
toolbar. A context consumer re-renders whenever the value's identity
changes, whichever field it reads, so dragging one sticky note re-rendered
every cell on the board. The tool, the pen settings and the `isAnnotating`
verdict now travel in `CanvasAnnotationToolContext`, read through
`useCanvasAnnotationTool` and its optional variant; the marks and their
mutators stay in `CanvasAnnotationContext`. The cells, the marquee, the pen
cursor and the viewport read only the slow half, and a subscription test
counts renders to prove a drag cannot reach them. The agent gains a
`set_canvas_tool` command and a `canvas-tool` line in its UI context.
