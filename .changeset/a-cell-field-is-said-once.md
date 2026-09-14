---
'agentic-service-blueprinting': patch
---

**A cell's columns are said once, in a field list the board select and the
normalizer derive from.** `cellFields.ts` holds one descriptor per column the
board reads for a cell — key typed against the generated `cells` row, label,
hint, group (structure, content, spec), write route, the agent's argument
name where it has one, and whether the canvas budget applies. The cells block
of `PATH_BLUEPRINT_SELECT` and the normalizer's raw shape and mapping are
functions of that list, so a column added to it is selected and mapped in the
same edit. The select string is byte-identical to before; the canvas reads
what it read.

The test that compared the select string to the normalizer's source is gone;
`cellFields.test.ts` changes one descriptor and shows the select and the
normalized cell move together. The panel form, the read-only rows, the
agent's argument schema and the one save still read their own copies; each
is a later derivation.
