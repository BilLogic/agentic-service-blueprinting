---
'agentic-service-blueprinting': patch
---

Four defects the deployment already fixed

- `normalizeBlueprint` collapsed cells on `(lane, step)`. Since the tech-cell
  split gives every touchpoint its own row at position 0..n, that kept one
  cell per slot and dropped every sibling — board-wide, over `data.cells`
  entire, whenever any two lane names merged. The key is now the slot.
- `setSharedCanvasMode` took `'design'` from anyone. The provider guarded it,
  but the agent tool `set_canvas_mode` reaches the store setter directly and
  is not a write tool, so a view-only session could park `'design'` and every
  surface snapped into Edit when write access returned. The permission now
  lives with the state.
- `AgentDock` registered its window-global listeners on both mount points.
  The gate is now hook-free and only the visible instance mounts the window.
- `Skeleton` carried `animate-pulse` on top of the `skeleton-breath` rule in
  `animations.css` — two animations on one bar, with the winner decided by
  cascade layer order. It also cost reduced-motion readers the still bar the
  stylesheet gives them.

`badge` also loses its two dead variants (`ghost`, `link`) and every
`[a]:hover:` rule: nothing rendered a badge as a link, and a surface that
repaints under the pointer promises a click that never comes.
