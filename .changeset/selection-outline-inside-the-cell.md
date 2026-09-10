---
'agentic-service-blueprinting': minor
---

The selection outline is drawn inside the cell, and the theme toggle keeps one positioning layer

Selecting a blueprint cell drew a 2px ring OUTSIDE its border box, with two
consequences.

The silhouette changed. A ring with spread rounds at the element's radius plus
the spread, so a selected cell was 2px larger with a 12px outer corner where
hover had 10px. The radius never changed; the outline around it did, and that
reads as the corner changing between states.

And on the board it was barely there. The ring is 2 CSS px in BOARD space, so
the camera scales it: at a working zoom it lands near one device pixel, and on
the visual lane it is slate on slate. Selection looked like a corner artifact
rather than an outline.

An inset ring fixes both. The outer edge stays exactly the cell's radius in
every state, and the outline lands on top of the fill where it reads as a
border and survives being scaled down. It is what this canvas already does for
connected emphasis, in `blueprint.css`, for the same reason.

Separately, `ThemeToggle` positioned the resident glyph absolutely inside a
`relative` box while `popLayout` was already holding the outgoing one's box —
two mechanisms doing one job, and the `relative` existed only to anchor the
second. The grid centres both.
