---
'agentic-service-blueprinting': major
---

`cells.links` held two concepts and was named after neither. It is now two
tables, and the IR splits with it.

The column stored a jsonb array in two shapes. Entries typed `url` were
resources — what the cell points at, and all the Resources tab has ever
listed. Entries typed `tech_description` were prose, a screenshot and a design
link about ONE touchpoint used at that cell, found again by matching the
entry's `label` against a line of `cells.content`. No label could name that
column: `Links` over the tab promises both and shows one, `Resources` on the
column is wrong for half its rows.

`21000113000000` makes the split.

- **`cell_touchpoints`** is the placement — this touchpoint, used at this
  cell — and it owns the `summary`, `screenshots` and `url` that belong to
  THIS moment. The old join was a string, so renaming a pill in the grid
  silently orphaned the paragraph behind it; a row survives a rename.
  `picture` and `pictures` fold into one `screenshots` array, which is what
  those two fields were always describing.
- **`resources`** is what a cell — **or one placement** — points at, with
  `kind` carrying the subtype because a link is one kind of resource.
  `num_nonnulls(cell_id, cell_touchpoint_id) = 1` is in the schema rather than
  in the client, and that constraint is what lets a design link belong to the
  tool it documents rather than to the cell at large. Nothing attaches one to
  a placement yet; the constraint and the capability ship, and the migration
  header says so rather than leaving it to be discovered.
- Provenance citations — a shape the IR never admitted but a jsonb column has
  always accepted — go to `evidence`, where they belong. The migration refuses
  to run on an entry shape it does not recognise, because dropping the column
  under one destroys it.
- A cell's resources are replaced through `sync_cell_resources` in one
  transaction: the editor rewrites a whole list, every statement over the wire
  is its own transaction, and a deferred position constraint only forgives a
  collision until COMMIT.
- `duplicate_path` and `duplicate_scenario` carry both new tables onto a copy.
  They carried this content before as a column of the row they copied, and a
  split that quietly stopped copying it would be the loss this change exists
  to end.

**Upgrading: `schema_version` moves to 2026.08.31, and an IR must be
migrated.** A cell's `links` array becomes `resources` (`label` → `name`) and
`touchpoints` (`label` → `name`, `description` → `summary`,
`picture`/`pictures` → `screenshots`). Every authored value survives under its
new name and the step is content-preserving, so:

```
python3 scripts/migrate_ir.py blueprint/blueprint.json \
  --workspace blueprint/blueprint-workspace.json --write
```

carries sign-off hashes across with it.
