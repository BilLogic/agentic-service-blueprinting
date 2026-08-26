# Setup

Getting this repository running on your machine, for someone who has not read
anything else in it. Adopting the package rather than working on it? The
README's [Get set up](./README.md#get-set-up) is the shorter road.

## What you need

| | |
| --- | --- |
| Node | 22 or later (CI runs 22) |
| Python | 3.10 or later, standard library only — no packages to install |
| Docker | only for a local database; the app runs without one |
| Supabase CLI | only for a local database; installed as a dev dependency |

## Run it

```bash
npm install
npm run dev
```

That is the whole first run. With no `VITE_SUPABASE_*` variables set the app
runs in no-database mode against bundled sample content, so you see the
renderer working before you wire anything up. The sample is the blueprint of
this template itself, so it doubles as documentation.

## Add a database

Only needed when you are changing the schema, the importer, or anything that
writes.

```bash
cp .env.example .env
npm run supabase:start       # local stack, needs Docker
npm run supabase:reset       # applies every migration, then the seed
npm run dev
```

Copy the `API URL` and `anon key` the CLI prints into `.env`, then run
`npm run check:target`. Run it once even when the page looks right: the app
falls back to bundled content whenever it cannot reach a project, so a
database that was never migrated renders exactly like a working one.

Column reference, row-level security and the desync runbook:
[docs/connectors/supabase/database.md](./docs/connectors/supabase/database.md).

## Before you push

```bash
npm test
npm run lint
npm run build
```

Then the guard set — every check CI runs, what each one is defending, and how
to read its failure: [docs/engineering/checks.md](./docs/engineering/checks.md).

Two failures surprise people, so they are worth knowing up front. Editing
anything under `skills/` or `references/` without running
`npm run sync:canvas-skills` fails `npm test` on the drift guard, because the
app bundles a vendored copy of both. And adding a document under `docs/`
without a `summary:` in its frontmatter fails `npm run check:docs-index`,
which names the file.

## Where things are

`INDEX.md` routes by task. `CONTEXT.md` defines the domain language. The
guides in [docs/guide/](./docs/guide/) walk the whole thing in four numbered
parts; [docs/overview.md](./docs/overview.md) says what else `docs/` holds and
what each folder is for.
