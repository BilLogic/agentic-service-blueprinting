---
'agentic-service-blueprinting': patch
---

Dragging or resizing a canvas annotation publishes once a frame rather than
once a pointer sample, and the release of a captured pointer can no longer
throw its own teardown away. A deployment gains a canvas that stays responsive
while a mark is dragged — the annotation collection was being replaced a
hundred and twenty times a second, re-rendering every surface reading it — and
loses the stuck mark that a `pointercancel` mid-drag used to weld to the
cursor. `createFramePatchQueue` and `releasePointerCapture` are the shared
pieces, and both are tested.
