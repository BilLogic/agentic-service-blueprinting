---
'agentic-service-blueprinting': patch
---

`slices_referencing` reads `slides`, and calling every `language sql` body is a
check now.

`21000115000000` renamed `slice_items` to `slides` and moved every dependent
name a catalogue holds — four constraints, two indexes, a trigger, four
permissive policies. It missed the one no catalogue holds: the text a function
body was created with. `slices_referencing` is `language sql`, so its body survived the
rename verbatim and still selected `from public.slice_items`:

```
select public.slices_referencing(array[]::uuid[]);
ERROR:  relation "public.slice_items" does not exist
```

`deletion_impact` reads that function for `affected_slices`, and `delete_cell`,
`delete_path`, `delete_scenario`, `remove_step`, `remove_lane` and
`remove_lanes` all read `deletion_impact` — so no structural delete could
succeed on a fresh core, and the confirm dialog raised `42P01` at the moment
somebody was deleting something. Creation was no defence: the body was valid the
day it was written, and the rename that falsified it validates nothing.

`21000129000000` recreates the one affected body — the definition the schema
dump holds, with the two occurrences of the relation written `public.slides` and
nothing else changed. The signature, `language sql stable`, the `search_path`
and the ACL are untouched: `create or replace function` keeps the object's
grants, which matters here because the function is in the portable core and its
`grant execute … to anon, authenticated` is in the Supabase recipe. Its proof
sweeps every body in `public` and then CALLS both functions, because a `language
sql` body is text until something calls it.

The same rename also missed three names a catalogue *does* hold — the optional
service-account tier (`20260818002000`) builds its RESTRICTIVE policies from a
table list that still read `slice_items`, so a database replaying the whole
series carried `slice_items_insert_service_only`,
`slice_items_update_service_only` and `slice_items_delete_service_only` on
`public.slides`, and `21000129000000` renames all three (a rename, so the
definitions stay byte-for-byte) in its recipe half, guarded by the catalogue
because the generated recipe already creates them under the current name.

The rename map's row flips with it: `slice_items` is in the `retired` list now,
and the header says what changed rather than leaving the old "enforces nothing
yet" to be read as an oversight. Flipping it found the second copy of the same
defect one estate over — `scripts/agent-harness/run.mjs` asked PostgREST for the
retired relation as an embed (`slice_items(…,caption,…)`, alongside `description`
and `origin` on `slices`), a string no compiler reads and `npm run
check:database-names` does; it reads `slides(…,title,…)` from `summary` and
`authorship` now.

**The guard that would have caught it**: `npm run check:function-bodies` stands
up a fresh core + recipe + seed and CALLS every `language sql` function in
`public` — a typed null per argument, inside a rolled-back transaction — plus
`slices_referencing` and `deletion_impact` with real ids out of the seeded
content. Only the SQLSTATEs that mean "that is not there" fail it, so a function
raising its own exception on null input passes as tolerated. `--self-test`
plants the defect in its own order — a table, a body that reads it, then the
rename — and asserts the call is reported, because a run where every function
answered looks identical to a run that called none of them. It runs in the
`portable-core` CI job beside `check:seed-load`.

Neither of the two static sweeps could have found this. The dump regenerates
happily — a broken body dumps like any other — and
`scripts/tests/portable-schema.test.mjs` blanks single-quoted strings before
tokenising, which swallows the region inside a dollar-quoted body. Only
`check:identifiers`, reading `pg_proc.prosrc` on a live database, saw it, and
only once the word was retired.

The plugin contract is untouched, so this is a patch: no identifier in
`identifiers.json` moves and no path in `check-reference-paths.mjs` does either.
