---
'agentic-service-blueprinting': minor
---

The cell panel shows a cell's status without opening the editor.
`CellContentSection` renders it first, as a labelled `Field` with a hint and a
`StatusBadge` — a status changes how everything under it should be read, and a
reader had to enter edit mode to find it. The owner labels take `PANEL_TEXT`
rather than repeating its classes inline.
