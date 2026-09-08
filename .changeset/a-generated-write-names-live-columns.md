---
'agentic-service-blueprinting': patch
---

Generated SQL is held to the columns the schema has.

`skills/slice/scripts/slice_tools.py` emitted `insert into public.slices (…,
description, …, origin, …)`. `21000116000000` renamed those columns to
`summary` and `authorship`, so every slice the skill imported was an INSERT
Postgres rejects — a model running the shipped script against a real database,
and the failure arriving as the model being wrong.

No word list could reach it. `description` and `origin` are live columns
elsewhere in this schema, which is why the rename map deliberately enforces
neither fragment and `retiredFragmentsIn('slices.description')` is asserted
empty. Only the schema dump separates them, per table.

`npm run check:database-names` grows a third assertion for that. A query path
was not the only string carrying its own relation: `insert into public.<table>
(<columns>)` and `update public.<table> set <column> = …` do too, so both are
held against `supabase/generated/portable-core.schema.sql`. Twenty-six
statements in this tree are literal and read; five are assembled from a
variable and dropped rather than guessed at, the refusal `selectTree` already
makes. Adjacent string literals are joined first — the relation and its column
list are in different strings whenever the statement needs two lines, which is
the shape the defect was hiding in.

`skills/` joins the check's roots. The two shipped skill scripts are the most
exposed code here and no database-name guard walked them at all; both
pre-existing assertions were already clean there, so the root costs nothing.

`references/data-model.md` documented the same two dead columns in its `slices`
row, and its vendored copy follows from `sync-canvas-skills.mjs`.
