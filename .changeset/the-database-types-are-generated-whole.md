---
'agentic-service-blueprinting': patch
---

**`src/types/database.ts` is generated whole, from the database the portable
core builds.** `generate-database-types.mjs` stands the core and the recipe up
on a fresh Postgres and runs the engine behind `supabase gen types` over it, so
the file no longer describes whichever project somebody had linked: `npm run
generate:database-types` writes it and `check:database-types` diffs it in the
`portable-core` job. The hand-written tail is gone with the plea in the header
that asked the next person to paste it back — the enum unions are read off the
domain and column CHECK constraints that close each vocabulary, so a value added
to a constraint reaches the type in the same run, and the row aliases are a list
in the generator. The schema inventory covers the vocabularies now, as
`kind<TAB>subject<TAB>member` rows, and the inventory check compares every union
against its constraint member for member in both directions. And a deployment
gets `check-database-types-superset.mjs`: its own generated types may have
tables, columns and members of its own, and this fails its CI when they have
fewer than the template's — the columns the application it compiles actually
reads. `npm run supabase:types` and `supabase:types:local` are deleted.
