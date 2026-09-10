---
'agentic-service-blueprinting': patch
---

Touchpoint faces in the compare grid carry `data-blueprint-touchpoint` again.
`CompareCellBlock` rendered `TouchpointCellFace` directly, bypassing the
wrapper that sets the attribute — so `scrollBlueprintTouchpointCellIntoView`
could not find a named touchpoint in that view and silently scrolled nothing.
