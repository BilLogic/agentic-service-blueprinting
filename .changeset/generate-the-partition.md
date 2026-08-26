---
"agentic-service-blueprinting": minor
---

The portable Postgres core and the Supabase recipe are generated from the
migrations, and CI applies both.

The partition was a paragraph in the header of `supabase/schema.reference.sql`,
a file that was never executed and was hand-refreshed beside a tree that moved
underneath it. It is now marked in the migrations — `-- @recipe` and `-- @core`
— and `npm run generate:portable-core` emits both halves from those marks into
`supabase/generated/`. The snapshot is deleted; a second hand-maintained SQL
artifact was the drift surface this repo kept paying for.

The claim is executed rather than stated. Every pull request applies the
generated core to a stock `postgres:17` with no Supabase and no shim in front
of it, then applies the recipe on top, then checks that the full migration
replay lands in the same place. A deliberately broken core is fed to the same
job, so the guard is known to be able to fail.
