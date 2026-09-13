---
'agentic-service-blueprinting': patch
---

**The cell-writing tools' arguments derive from the cell field list, and
`update_cell` saves through the one save.** Each descriptor the agent may
set carries its argument name — the column key, typed so — and the sentence
the model reads for it. `upsert_cell` takes the slot and the text from the
list; `update_cell` takes every editable field from it, and its description
names each field in the panel's own words. Add a descriptor with an agent
argument and the tool gains it; a test does exactly that.

`update_cell` routes through `saveCell`: the same content-then-spec order,
the same inverses, and a reply that says when nothing changed. The harness's
database read of a cell asks for the list's columns rather than its own.
