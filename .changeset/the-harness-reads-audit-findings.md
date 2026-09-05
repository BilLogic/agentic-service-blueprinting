---
'agentic-service-blueprinting': patch
---

The harness reads `audit_findings` and its `summary`, and a query path is
checked against the schema now.

`21000116000000` renamed the `findings` table to `audit_findings` and
`findings.note` to `.summary`, and `scripts/agent-harness/run.mjs` kept asking
for `findings?select=…,note,…`. PostgREST answers that with a 404, so the
harness's `list_findings` case could only ever fail against a live project —
and the two lines above it were the same defect twice more: `realGetSlice`
selected `slices.description` and `slices.origin`, renamed by the same
migration to `summary` and `authorship`, and embedded `slice_items(…caption…)`,
which `21000115000000` renamed to `slides(…title…)`. Six dead names in one
file. The reads the app makes were already right; the harness mirrors them by
hand, which is what the header says and what nothing was holding it to.

No guard could see any of it. The rename map retires `check_name` and nothing
else from that row, on purpose — `finding` is the live domain word a panel has
to be able to say, and `note`, `description` and `origin` are live words
elsewhere in the tree. A word list is the wrong instrument for a name that is
still a word.

**The guard that would have caught it**: `npm run check:database-names` gains a
second assertion. A raw PostgREST query PATH — `<relation>?select=<columns>` —
puts a relation in the one position PostgREST reads as a relation, and
everything inside `select=` is either a column of it or an embed of another
relation, so both halves are held against
`supabase/generated/portable-core.schema.sql` rather than against the rename
map. A name the dump does not have fails whether or not anybody wrote it down
as retired, and a retired relation is still followed THROUGH the map, so the
dead table and its dead column are reported from one site instead of in two
rounds against a live database:

```
scripts/agent-harness/run.mjs:274: PostgREST query string names `findings`,
  which is not a table or view in the schema dump (→ `audit_findings`)
scripts/agent-harness/run.mjs:274: PostgREST query string selects `note`, which
  is not a column of `audit_findings` (→ `audit_findings.summary`)
```

The column half stops at the query path and stays there. A bare
`.select('id, name')` carries the same information, but the relation it belongs
to is the `.from(…)` on another line; a check that chased it would be reading a
query builder rather than a literal, and the first correct call it failed would
be the argument for switching it off. A view is a name whose columns are
unchecked — the projection is its own business — so a query still cannot name
one that is gone.

The plugin contract is untouched, so this is a patch: no identifier in
`identifiers.json` moves and no path in `check-reference-paths.mjs` does either.
