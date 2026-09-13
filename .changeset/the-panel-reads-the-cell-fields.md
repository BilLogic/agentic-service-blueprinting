---
'agentic-service-blueprinting': patch
---

**The cell panel's form, its read-only rows and its one save derive from
the cell field list.** Each editable descriptor now names the control the
panel edits it with; the editor's form state is the list's `CellEdits`, its
fields render from the list with the descriptor's label and hint, and the
read-only status, owner and spec rows read the same descriptors. No cell
field's label or hint is spelled in JSX.

`saveCell` is the one save: a cell id (or a slot, for a cell that does not
exist yet) and the edits, routed by each field's declared write route —
the create through the authoring RPC, then the content write, then the spec
write, with the frozen baseline as each write's inverse. The panel no longer
knows there are three paths.

The JSX label-scan test is gone, and so is the panel write surface's hand
list of cell columns: the interface map's cell rows and the write surface's
cell columns are read from the descriptors. The rendered map is unchanged.
