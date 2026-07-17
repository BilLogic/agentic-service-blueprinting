# PLUS Uno Blueprint

React + Vite app using [shadcn/ui](https://ui.shadcn.com/) and [Supabase](https://supabase.com/).

Blueprint editor for service scenarios: lifecycle → phase → scenario → path grid (layers × steps → cells).

## Setup

```bash
npm install
cp .env.example .env
```

### Local Supabase (Docker required)

```bash
npm run supabase:start
npm run supabase:reset   # applies migrations in supabase/migrations/
```

Copy `API URL` and `anon key` from the CLI output into `.env`:

```env
VITE_SUPABASE_URL=http://127.0.0.1:54321
VITE_SUPABASE_ANON_KEY=<anon-key-from-cli>
```

### Hosted Supabase

Create a project at [supabase.com](https://supabase.com), run migrations (`supabase link` then `supabase db push`), and set `.env` from **Settings → API**.

## Development

```bash
npm run dev
```

## Scripts

| Command | Description |
| --- | --- |
| `npm run dev` | Vite dev server |
| `npm run build` | Production build |
| `npm run supabase:start` | Start local Supabase |
| `npm run supabase:stop` | Stop local Supabase |
| `npm run supabase:reset` | Reset DB and run migrations |

## Database

Service Blueprint schema: `service_lifecycles` → `phases` → `service_scenarios` → `paths`, with per-path grids (`layers`, `steps` via `path_steps`, `cells`, `cell_triggers`).

| Resource | Purpose |
| --- | --- |
| [supabase/DATABASE.md](./supabase/DATABASE.md) | **Start here** — tables, cells, view modes, queries |
| [docs/erd.mmd](./docs/erd.mmd) | Mermaid ERD diagram |
| [docs/scenario-steps-design.md](./docs/scenario-steps-design.md) | Shared steps + `path_steps` ordering |
| [supabase/schema.reference.sql](./supabase/schema.reference.sql) | Full DDL snapshot |
| [supabase/migrations/](./supabase/migrations/) | Versioned schema |
| [supabase/seed.sql](./supabase/seed.sql) | Sample seed data |
| [src/types/database.ts](./src/types/database.ts) | TypeScript types |

Regenerate types after schema changes: `npm run supabase:types` (hosted) or `npm run supabase:types:local` (Docker).

## UI

Built with **shadcn/ui** (Tailwind v4). Add components:

```bash
npx shadcn@latest add <component>
```

Theme tokens live in `src/index.css`.

## Project layout

- `src/components/blueprint/` — blueprint grid, paths, triggers
- `src/components/editor/` — canvas/slide editor shell
- `src/components/ui/` — shadcn components
- `src/hooks/` — Supabase data hooks (`useScenarioBlueprint`, `useLifecyclePhases`)
- `src/lib/` — queries, normalization, layout helpers
- `src/data/blueprintFallbacks.ts` — offline demo blueprints
- `supabase/migrations/` — Postgres schema and RLS policies
