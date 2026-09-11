---
'agentic-service-blueprinting': minor
---

A connection in a cell's Dependencies tab can be edited where it sits. In Edit mode, each connection the cell is the source of becomes a row of fields in the group it already sits in. The kind and the target save as soon as they change, and the note saves when its field loses focus. A connection that arrives from another cell carries a pencil that opens that cell, because a cell edits only the connections it is the source of. A row that cannot save says why underneath itself. The groups keep their split by direction (Follows, Leads to, Enabled by, Enables), and the last group is renamed from "Tech in this step" to "Also on this step". The add form no longer repeats the cell's connections, because each row now carries its own remove control.

The edit is one database function, `update_cell_dependency`, which changes a row's kind, target and note in one transaction. Changing a kind or a target through `set_cell_dependency` used to insert a second row and leave the first one drawn. The new function returns the row as it stood, and the session's undo feeds those values straight back, keyed on the row's own id.

**Upgrading a deployment:** apply `21000226000000_a_dependency_can_be_edited_where_it_sits.sql`. Until it is applied, an edit made in the panel fails with a "function does not exist" message under the row, while adding and removing connections keep working. A deployment that renders `CellDependencySections` itself passes the new optional `editing` prop to turn edit mode on; without it, the list reads as before.
