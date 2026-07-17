# Database

Postgres database managed by [Supabase](https://supabase.com/) for **PLUS Uno Blueprint**.

| Property | Value |
| --- | --- |
| **Engine** | PostgreSQL 17 |
| **Primary schema** | `public` |
| **Migrations** | `supabase/migrations/` |
| **Seed data** | `supabase/seed.sql` |
| **ERD diagram** | `docs/erd.mmd` |
| **DDL snapshot** | `supabase/schema.reference.sql` |
| **TypeScript types** | `src/types/database.ts` |
| **Verification SQL** | `docs/seed-verification.sql` |

## Connection (application)

| Variable | Description |
| --- | --- |
| `VITE_SUPABASE_URL` | Project API URL |
| `VITE_SUPABASE_ANON_KEY` | Public anon key (**Settings → API**) |

## Entity relationship (Service Blueprint)

```mermaid
erDiagram
  service_lifecycles ||--o{ phases : "1:n"
  phases ||--o{ service_scenarios : "1:n"
  service_scenarios ||--o{ paths : "1:n"
  service_scenarios ||--o{ steps : "1:n"
  paths ||--o{ path_steps : "1:n"
  steps ||--o{ path_steps : "1:n"
  paths ||--o{ layers : "1:n"
  paths ||--o{ cells : "1:n"
  layers ||--o{ cells : "1:n"
  steps ||--o{ cells : "1:n"
  cells ||--o{ cell_triggers : "source"
  cells ||--o{ cell_triggers : "target"
```

## Hierarchy

| Level | Table | Ordering |
| --- | --- | --- |
| Service Lifecycle | `service_lifecycles` | — |
| Phase | `phases` | `order_position`; optional `loops_to_phase_id` |
| Service Scenario | `service_scenarios` | `order_position`; `view_type` for layout |
| Path | `paths` | `path_type`: happy, unhappy, exception, alternative; optional `note` for path-level context |
| Blueprint row | `layers` | `row_position` (per path) |
| Blueprint column | `steps` | canonical per `service_scenario` |
| Path column order | `path_steps` | `column_position` per `(path_id, step_id)` |
| Cell | `cells` | unique `(layer_id, step_id)` per path |
| Cell dependency | `cell_triggers` | unique `(source_cell_id, target_cell_id)` |

**Naming note:** DB table `steps` are blueprint **columns** (journey moments), not lifecycle phases. Phases live in `phases`.

**Cascade deletes:** Deleting a lifecycle removes phases, scenarios, paths, layers, steps, path_steps, cells, and triggers. Deleting a phase removes its descendants.

**Path integrity:** `cells.path_id` must match `layers.path_id`, and `cells.step_id` must appear in `path_steps` for that path (trigger `cells_validate_path_match`).

**Shared steps:** Multiple paths under the same scenario can reference the same `steps.id` via `path_steps` with different `column_position` values. See [`docs/scenario-steps-design.md`](../docs/scenario-steps-design.md).

## Cells

Each cell sits at a **layer × step** intersection for one path.

| Column | Required | Description |
| --- | --- | --- |
| `content` | yes (default `''`) | **Cell Label** — primary text shown in the blueprint grid |
| `picture` | no | Optional image URL or storage reference |
| `description` | no | Optional longer description (detail panel; not the grid label) |
| `links` | no (default `[]`) | JSON array of link objects |

**Links shape** (JSONB array):

```json
[
  { "type": "url", "label": "Warm-Up runbook", "url": "https://example.com/runbook" }
]
```

- `type` — link kind (usually `"url"`)
- `label` — display text
- `url` — optional href when `type` is `"url"`

App types: `CellLink` and `BlueprintCell` in `src/types/blueprint.ts`. Parsing: `normalizeCellLinks()` in `src/lib/cellMetadata.ts`.

## View modes (`service_scenarios.view_type`)

| Value | Behavior |
| --- | --- |
| `single` | One path blueprint at a time |
| `side-by-side` | Compare paths in parallel columns |
| `integrated` | Merge all paths at **runtime** (`mergeIntegratedBlueprint.ts`); each path is still stored separately |

## Seed data (fixed UUIDs)

| UUID suffix | Entity |
| --- | --- |
| `…000001` | Lifecycle: PLUS Application |
| `…000101` | Phase: Application |
| `…000121` | Scenario: Application → Discovery |
| `…000102` | Phase: Onboarding |
| `…000103` | Phase: Pre-session |
| `…000104` | Phase: in-session |
| `…000105` | Phase: post-session (loops to Pre-session) |
| `…000201–206` | Pre-session scenarios (Before Students Join → Wrap-up) |

Stack/Canvas UI loads phases and nested scenarios via `useLifecyclePhases`.

**Application Discovery Happy Path** (`supabase/seeds/application_discovery_happy_path.sql`): 7 layers, 5 steps, 32 cells, 10 triggers. Fallback: `src/data/applicationHappyPathFallback.ts`.

**Warm-Up Happy Path** (`supabase/seeds/warm_up_happy_path.sql`): 9 layers, 8 steps, 38 cells, 7 Regular Tutor triggers. ID map: [`docs/warm-up-happy-path-ids.md`](../docs/warm-up-happy-path-ids.md).

## Row Level Security

Blueprint tables and `services` have RLS **enabled** with public `SELECT` policies. No write policies yet.

## Migration history

| File | Description |
| --- | --- |
| `20250602160000_initial.sql` | `services` catalog |
| `20250602170000_service_workflow_erd.sql` | Legacy ERD (**superseded** — tables dropped in next migration) |
| `20250603120000_service_blueprint.sql` | Service Blueprint schema |
| `20250603130000_phase_loop_target.sql` | `phases.loops_to_phase_id` |
| `20250604000000_scenario_steps_path_steps.sql` | Scenario-scoped steps + `path_steps` |
| `20250604120000_service_scenario_view_type.sql` | `service_scenarios.view_type` |
| `20250605120000_service_scenario_integrated_view_type.sql` | `integrated` view type |
| `20250606120000_path_description.sql` | `paths.description` |
| `20250612120000_cell_metadata.sql` | `cells.picture`, `description`, `links` |

## Example query (path blueprint)

```ts
const { data } = await supabase
  .from('paths')
  .select(`
    id,
    name,
    path_type,
    service_scenarios (
      id,
      name,
      phases (
        id,
        name,
        order_position,
        service_lifecycles ( id, name )
      )
    ),
    layers ( id, name, row_position ),
    path_steps (
      column_position,
      steps ( id, name )
    ),
    cells (
      id,
      content,
      picture,
      description,
      links,
      layer_id,
      step_id
    )
  `)
  .eq('id', pathId)
  .single()
```

## Key application files

| File | Role |
| --- | --- |
| `src/lib/workflowQueries.ts` | Supabase nested selects |
| `src/lib/normalizeBlueprint.ts` | Raw path row → `BlueprintData` |
| `src/lib/mergeIntegratedBlueprint.ts` | Runtime integrated merge |
| `src/hooks/useScenarioBlueprint.ts` | Load paths + blueprints per scenario |
| `src/data/blueprintFallbacks.ts` | Offline/demo blueprint data |

## Local commands

```bash
npm run supabase:reset          # migrations + seed
npm run supabase:types:local    # regenerate src/types/database.ts
```

## Hosted seed

```bash
supabase db execute --file supabase/seed.sql --linked
```
