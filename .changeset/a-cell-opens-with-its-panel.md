---
'agentic-service-blueprinting': patch
---

**Choosing a cell from a slide's cells list closes the list and opens that
cell's detail panel on the slice.**

The list stayed open over the slice canvas after a row was chosen — the
presentation stays mounted behind the slice tab, so nothing closed it — and
the slice tab flew to the cell without opening its panel. A row now closes
the list first, and its pending focus asks for the panel too: once the slice
viewport has found the cell, it opens the panel with the same ⌘-click that
"View cell detail" uses. A cell no longer on the board still opens nothing.
