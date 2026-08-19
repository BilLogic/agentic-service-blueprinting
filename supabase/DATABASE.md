# Database

Postgres database managed by [Supabase](https://supabase.com/) for the **agentic service blueprinting** template.

| Property | Value |
| --- | --- |
| **Engine** | PostgreSQL 17 |
| **Primary schema** | `public` |
| **Migrations** | `supabase/migrations/` (consolidated schema + derived-layer migrations) |
| **Seed data** | `supabase/seed.sql` (generated sample content) |
| **ERD diagram** | `docs/erd.mmd` |
| **DDL snapshot** | `supabase/schema.reference.sql` (its header partitions the portable Postgres core from the Supabase-specific recipe — auth defaults, role grants, RLS, `SECURITY DEFINER`; see also [`references/adapter-contract.md`](../references/adapter-contract.md) § Live backend surface) |
| **TypeScript types** | `src/types/database.ts` |

## Connection (application)

| Variable | Description |
| --- | --- |
| `VITE_SUPABASE_URL` | Project API URL |
| `VITE_SUPABASE_ANON_KEY` | Public anon key (**Settings → API**) |

Without these variables the app runs in **no-DB mode** from the generated
fallback content in `src/data/` — no database required.

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

The full attribute-level ERD (with enums and the `layer_role` vocabulary) is
in [`docs/erd.mmd`](../docs/erd.mmd).

## Hierarchy

| Level | Table | Ordering |
| --- | --- | --- |
| Service Lifecycle | `service_lifecycles` | — |
| Phase | `phases` | `order_position`; optional `loops_to_phase_id` |
| Service Scenario | `service_scenarios` | `order_position`; `view_type` for layout |
| Path | `paths` | `path_type`: happy, unhappy, exception, alternative; optional `note` for path-level context |
| Blueprint row | `layers` | `row_position` (per path); `layer_role` semantic key |
| Blueprint column | `steps` | canonical per `service_scenario` |
| Path column order | `path_steps` | `column_position` per `(path_id, step_id)` |
| Cell | `cells` | unique `(layer_id, step_id, slot_position)` per path; slot 0 default, tech-lane touchpoints occupy 0..n |
| Cell dependency | `cell_triggers` | unique `(source_cell_id, target_cell_id, kind)`; `kind`: trigger \| needs |

**Naming note:** DB table `steps` are blueprint **columns** (journey moments), not lifecycle phases. Phases live in `phases`.

**Cascade deletes:** Deleting a lifecycle removes phases, scenarios, paths, layers, steps, path_steps, cells, and triggers. Deleting a phase removes its descendants.

**Path integrity:** `cells.path_id` must match `layers.path_id`, and `cells.step_id` must appear in `path_steps` for that path (trigger `cells_validate_path_match`). Import order: `paths → steps → path_steps → layers → cells → cell_triggers`.

**Shared steps:** Multiple paths under the same scenario can reference the same `steps.id` via `path_steps` with different `column_position` values. See [`references/data-model.md`](../references/data-model.md).

## Layers (`layer_role`)

A layer's display name (`layers.name`) is free-form in any language; the
semantic key `layers.layer_role` drives rendering (pill cells, visual rows,
divider-line anchoring):

| Role | Rendering |
| --- | --- |
| `customer_actions` | Spine actor lane — the **interaction line** draws after it |
| `frontstage_actions`, `frontstage_tech` | Frontstage lanes — the **visibility line** draws after them |
| `backstage_actions` | Backstage lane — the **internal interaction line** draws after it when a `support_systems` lane follows |
| `frontstage_tech`, `backstage_tech`, `support_systems` | Cells render as multi-item **pills** (newline-separated content) |
| `visual`, `step_visual` | Picture rows |
| any other value / `null` | Generic swimlane (actor lanes, org-defined custom roles) |

Frontend contract: `src/lib/layerRoles.ts`.

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
  { "type": "url", "label": "Runbook", "url": "https://example.com/runbook" },
  {
    "type": "tech_description",
    "label": "Work Order App",
    "description": "Longer copy shown in the tech pill detail panel",
    "picture": "https://example.com/screenshot.png"
  }
]
```

- `type` — `"url"` (external resource) or `"tech_description"` (per-tech copy/pictures for pill lanes)
- `label` — display text; for `tech_description`, must match the pill label in `content`
- `url` / `description` / `picture` / `pictures` — optional payload fields

App types: `CellLink` and `BlueprintCell` in `src/types/blueprint.ts`. Parsing: `normalizeCellLinks()` in `src/lib/cellMetadata.ts`.

## View modes (`service_scenarios.view_type`)

| Value | Behavior |
| --- | --- |
| `single` | One path blueprint at a time |
| `side-by-side` | Labeled variant comparison (UI: "Stacked") |
| `integrated` | **Legacy value** — persisted rows coerce to the plain Stacked view on read (`src/lib/viewTypeVocabulary.ts`). The UI's "Merged" canvas is session-only and never written back as `integrated` |

These are the STORED (DB) tokens; the client vocabulary is `single` \|
`stacked` \| `merged`, mapped at the read/write seams in
`src/lib/viewTypeVocabulary.ts`.

## Sample seed

`supabase/seed.sql` is **generated** by `scripts/generate_sample_blueprint.mjs`
alongside the offline fallback module (`src/data/sampleBlueprint.ts`): one
`Keeping a blueprint true` lifecycle → four phases (`Discover` → `Setup` →
`Operate` → `Maintain`, with `Maintain.loops_to_phase_id` → `Operate`) → six
scenarios carrying eight paths (happy / alternative / unhappy) on one 7-lane
roster (canonical + one custom role), plus a visual row
on `Map your service` and three demo slices. Sample UUIDs use the
`f0000000-…` prefix. Re-run the generator after editing it — never edit the
emitted files by hand.

Two things exist in this schema but deliberately not in the sample: `evidence`
rows (restricted `SELECT`, so an offline reader could never see them) and the
lane spec columns `kpis` / `tools` / `owner_team`. Neither has a home in the
offline `BlueprintData` shape, and the seed and the fallback module are
required to hold the same content.

## Row Level Security

All blueprint tables have RLS **enabled** with public `SELECT` policies, and
the `anon` role stays read-only: a deployed site can render everything but
write nothing. **Anything you deploy with an anon key is publicly readable.**

Writes are layered on top for signed-in sessions (`authenticated`):

- **Structure goes through RPCs, not tables.** The authoring-operations
  migration ships `SECURITY DEFINER` functions (create/duplicate/rename/
  reorder/delete scenarios, paths, lanes, steps; `upsert_cell`;
  dependencies) — each performs one complete, valid edit in one
  transaction. No table-level `INSERT`/`DELETE` on structural tables is
  granted to app roles.
- **Ordinary text edits use column-scoped grants**: `cells.content/
  description/links`, `layers.name/layer_role`, `steps.name`,
  `paths.name/description/note/path_type`,
  `service_scenarios.name/description/view_type`, plus the derived-layer
  spec columns — writable directly by `authenticated` under permissive
  update policies.
- **Optional service-account tier** (`20260818002000`, a recipe you can
  skip or delete): RESTRICTIVE policies AND an in-function
  `is_service_account()` guard split `authenticated` into service accounts
  (edit everything) and regular accounts (view + agent surfaces, no
  blueprint writes). `anon` is untouched either way.
- **Agent-surface tables** (`agent_sessions`, `agent_messages`) are
  reachable only by `authenticated`; the same migration restores the
  findings insert/update grants for in-app agent runs (still ANDed with
  the tier's restrictive policies where applied).

Seeds and migrations still go through the Supabase CLI with your own
credentials.

## Migration history

| File | Description |
| --- | --- |
| `20260716200000_template_schema.sql` | Consolidated template schema: hierarchy + blueprint grid + `layer_role`, integrity trigger, `updated_at` triggers, read-only RLS, legacy `services` cleanup |
| `20260729120000_derived_layer.sql` | Derived layer: `slices`, `slice_items`, `findings` (open-fingerprint partial unique index), `evidence`, `propositions`, `evidence_counts` view, cell/lane/phase spec columns, `cell_triggers.kind` |
| `20260730090000_derived_layer_grants_hardening.sql` | Explicit Data API grants, anon write-privilege revokes, pinned `search_path`, attribution columns, evidence `cell_key` pairing |
| `20260803001000_slices_origin_allows_human.sql` | Adds `human` to the `slices.origin` vocabulary (in-app authored slices) |
| `20260818000000_authoring_foundation.sql` | Authoring foundation: `origin` provenance columns, `cells.cell_key` identity, `cells.slot_position` (+ widened uniqueness), deferrable `path_steps` ordering, `deleted_structure` archive, direct-column grants for panel edits |
| `20260818001000_authoring_operations.sql` | Authoring operations: the `SECURITY DEFINER` RPCs (create/duplicate/rename/reorder/delete structure, `upsert_cell`, dependencies) that are the only sanctioned write path for structural shape |
| `20260818002000_service_account_tier.sql` | OPTIONAL recipe: splits `authenticated` into service accounts (edit everything) and regular accounts (view + agent surfaces) via RESTRICTIVE policies + `is_service_account()` |
| `20260819000000_agent_surface.sql` | Agent surface: `agent_sessions`/`agent_messages` chat persistence (authenticated-only) and the findings insert/update grants for in-app agent runs |

## Migration authoring notes

Ops lessons this repo carries as rules for anyone adding migrations:

- **REVOKE from PUBLIC on every new write function.** Postgres grants
  `EXECUTE` to `PUBLIC` on function creation, so a freshly created
  `SECURITY DEFINER` RPC is callable by every role until you say
  otherwise. Pair every `create function` with
  `revoke execute ... from public, anon;` and an explicit `grant execute`
  to the roles that should call it — in the same migration.
- **Migration files are committed the same day they are applied** to any
  shared project. An applied-but-uncommitted migration makes the repo lie
  about the shared schema; the next contributor's `db reset` or diff runs
  against a state the migrations directory cannot reproduce.
- **Undo paths couple to insert policies.** Migrations are append-only
  (an undo is a new migration), and client-side undo is policy-coupled: a
  revert that re-inserts a deleted row verbatim (evidence restore is the
  canonical case) works only while the table's INSERT policy accepts
  client-supplied ids and authorship columns. Tightening that policy —
  e.g. adding `with check (created_by = auth.uid())` — silently breaks
  the undo. If the policy must tighten, move the restore into a
  `SECURITY DEFINER` RPC that re-checks authorization and preserves
  authorship server-side, in the same change.
- **RESTRICTIVE policies never bind SECURITY DEFINER RPCs.** Definer
  functions run as the function owner and bypass RLS entirely, so a
  restrictive tier policy on the table gives zero protection against
  them. The guard must be asserted inside the function body — an
  `is_service_account()`-style check raising an exception — in every
  definer RPC that writes.

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
    layers ( id, name, layer_role, row_position ),
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
| `src/lib/viewTypeVocabulary.ts` | DB ⇄ client view-type token maps (`integrated` → stacked on read) |
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
