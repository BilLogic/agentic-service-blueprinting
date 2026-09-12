---
'agentic-service-blueprinting': patch
---

Leaving the board closes the cell panel.

Open a cell, switch to a slice or a presentation, and the drawer stayed on screen over the slides — describing a row that was no longer visible, with closing it by hand the only way out. The board is deliberately never unmounted, so the drawer inside it survived the tab change; the panel's reset key tracked navigation *within* a board, which is why activating a tab changed nothing in it. The workspace tab is part of that key now, which settles what the panel's placement left open: an open cell is a fact about the board, not about the workspace. `?cell=` follows, so the address bar stops offering a share link to a drawer nobody has open.
