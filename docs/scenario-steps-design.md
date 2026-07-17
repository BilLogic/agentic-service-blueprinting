# Scenario-scoped steps (design)

Steps are **canonical per service scenario**. Paths **include** a subset of those steps and assign **per-path column order** through `path_steps`.

## Model

```
service_scenario
  ├── steps (id, service_scenario_id, name)     ← shared catalog
  └── paths
        ├── path_steps (path_id, step_id, column_position)  ← membership + order
        ├── layers (still per path)
        └── cells (path_id, layer_id, step_id, content)
```

## Example: Warm-Up with two paths

| Step (scenario UUID) | Name | Happy `column_position` | Unhappy `column_position` |
| --- | --- | --- | --- |
| `…0311` | Enter Breakout Room | 1 | 1 |
| `…0312` | Greet Student | 2 | 2 |
| `…0313` | Ask Student to Share Screen | 3 | — (omit from path) |
| `…0314` | Remind Student… | 4 | 3 |

- **One row** in `steps` for “Greet Student”.
- **Two rows** in `path_steps` if both paths use it (same `step_id`, different paths).
- A step omitted from a path has **no** `path_steps` row and **no** cells on that path for that step.

## Adding a new path (SQL sketch)

```sql
-- 1. Create the path
insert into public.paths (id, service_scenario_id, name, path_type)
values ('…new-path', '…warm-up-scenario', 'Warm-Up Unhappy Path', 'unhappy');

-- 2. Reuse existing scenario steps (no duplication)
insert into public.path_steps (path_id, step_id, column_position)
values
  ('…new-path', 'a0000000-0000-4000-8000-000000000311', 1),
  ('…new-path', 'a0000000-0000-4000-8000-000000000312', 2);

-- 3. Copy or define path-specific layers + cells (layers remain per path)
-- cells.step_id references scenario steps; path_id is the new path
```

## Adding a **new** step to a scenario

```sql
insert into public.steps (id, service_scenario_id, name)
values ('…new-step', '…warm-up-scenario', 'Escalate to Lead Tutor');

-- Include on one or more paths with desired order
insert into public.path_steps (path_id, step_id, column_position)
values ('…happy-path', '…new-step', 9);
```

## App loading

Paths fetch steps through the junction:

```ts
path_steps (
  column_position,
  steps ( id, name )
)
```

`normalizeBlueprint()` flattens this into `BlueprintStep[]` sorted by `column_position` so the grid UI is unchanged.

## Integrity rules

| Rule | Enforcement |
| --- | --- |
| Step belongs to scenario | `steps.service_scenario_id` |
| Step on path | `path_steps` row exists |
| Cell step matches path | Trigger `cells_validate_path_match` |
| Unique column per path | `unique (path_id, column_position)` |
| Layer on path | Unchanged (`layers.path_id`) |

## Not in scope (future)

- **Shared layers** across paths (same pattern as `path_layers` would work).
- **Cross-scenario step reuse** (would need lifecycle-level steps).
- **Automatic deduplication** when merging paths (by name); IDs are stable in seed data.

## Migration

`20250604000000_scenario_steps_path_steps.sql` — backfills `path_steps` from legacy `steps.path_id` / `column_position`, then drops those columns.
