---
'agentic-service-blueprinting': patch
---

A row shape pinned in prose is checked against the schema.

`agents/auditor.md` tells a model exactly which keys to produce for a findings
row, and `audit_tools.py` validates against that shape. When `21000116000000`
renamed `check_name` to `check_key` and `note` to `summary`, the document went
on asking for the old two — a call the validator raises `KeyError` on, arriving
as the model being wrong rather than the prose being stale.

`npm run check:pinned-shapes` binds a fenced block to a relation and holds its
keys against `supabase/generated/portable-core.schema.sql`, both directions: a
key that is not a column, and a required column the shape never names.

The binding is per fence and deliberately short. Three of the four fenced
blocks in `agents/`, `skills/` and `references/` document an agent's own output
or a workspace state file rather than a database row, so treating every fenced
key as a column would be wrong three times in four. Binding to a relation is
also what makes `note` catchable at all: it is a live column on `paths`,
`scenarios` and `cell_dependencies`, and wrong only here.
