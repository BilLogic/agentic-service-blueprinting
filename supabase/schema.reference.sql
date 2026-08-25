-- Reference snapshot: Service Blueprint schema
-- Source of truth: supabase/migrations/ replayed in order —
--   20260716200000_template_schema.sql        (consolidated template schema)
--   20260729120000_derived_layer.sql          (slices/findings/evidence/propositions + spec fields)
--   20260730090000_derived_layer_grants_hardening.sql
--   20260803001000_slices_origin_allows_human.sql
--   20260818000000_authoring_foundation.sql   (provenance, cell_key, slots, delete archive)
--   20260818001000_authoring_operations.sql   (the write RPC surface)
--   20260818002000_service_account_tier.sql   (OPTIONAL tier recipe)
--   20260819000000_agent_surface.sql          (agent transcripts + findings grants)
--   21000101000000_schema_version_is_a_table.sql (the version, interrogable)
-- This file shows the post-migration shape as plain CREATEs for reading;
-- it is never executed. It is CHECKED, though: `npm run check:portable-core`
-- compares it against what the migrations actually build, offline via the
-- generated types and in CI against a stock Postgres. It went two migrations
-- stale before that check existed.
--
-- Still authored, not generated. The decision on record is that this file
-- should be GENERATED from the migrations and diffed, because a hand-refreshed
-- snapshot is a drift surface by construction. The check above alarms that
-- drift; it does not remove it.
--
-- Portability partition. Everything in this schema is one of two things:
--   PORTABLE POSTGRES CORE — the tables, constraints, checks, triggers,
--     indexes, views, and the *logic* of every function below. This half
--     runs on any Postgres and is what a replacement backend must carry
--     (see references/adapter-contract.md, "Live backend surface").
--   SUPABASE RECIPE — the `auth.uid()` column defaults, the anon /
--     authenticated role grants, the RLS policies, the SECURITY DEFINER
--     wrappers around the function bodies in the migrations, and
--     is_service_account()'s JWT reading. This half is how *Supabase*
--     enforces the contract; another host re-expresses it with its own
--     auth and authorization primitives, keeping the semantics.

-- What shape this database carries, so a target can be asked rather than
-- assumed. Exactly one row. See references/adapter-contract.md § 2.
create table public.schema_version (
  singleton boolean primary key default true,
  version text not null,
  applied_at timestamptz not null default now(),
  constraint schema_version_is_singleton check (singleton),
  constraint schema_version_format check (version ~ '^\d{4}\.\d{2}\.\d{2}$')
);

-- Hierarchy
create table public.service_lifecycles (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.phases (
  id uuid primary key default gen_random_uuid(),
  service_lifecycle_id uuid not null references public.service_lifecycles (id) on delete cascade,
  name text not null,
  description text,
  order_position integer not null default 0,
  loops_to_phase_id uuid references public.phases (id) on delete set null,
  business_impact text,           -- spec: opex, NPS, brand, retention, growth
  operational_requirements text,  -- spec: process / system / people / legal
  origin text not null default 'import' check (origin in ('import', 'app')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.service_scenarios (
  id uuid primary key default gen_random_uuid(),
  phase_id uuid not null references public.phases (id) on delete cascade,
  name text not null,
  description text,
  order_position integer not null default 0,
  view_type text not null default 'single' check (view_type in ('single', 'side-by-side', 'integrated')),
  origin text not null default 'import' check (origin in ('import', 'app')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.paths (
  id uuid primary key default gen_random_uuid(),
  service_scenario_id uuid not null references public.service_scenarios (id) on delete cascade,
  name text not null,
  description text,
  note text, -- optional path note shown alongside path metadata (e.g. parallel scenario context)
  path_type text not null check (path_type in ('happy', 'unhappy', 'exception', 'alternative')),
  origin text not null default 'import' check (origin in ('import', 'app')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Blueprint grid
create table public.layers (
  id uuid primary key default gen_random_uuid(),
  path_id uuid not null references public.paths (id) on delete cascade,
  name text not null,
  -- Semantic role key driving rendering (canonical: customer_actions,
  -- frontstage_actions, backstage_actions, frontstage_tech, backstage_tech,
  -- support_systems, visual, step_visual; extensible; null = generic swimlane).
  layer_role text,
  row_position integer not null default 0,
  owner_team text,                        -- spec: team that staffs/owns this lane
  kpis jsonb not null default '[]',       -- string array: metrics the lane team is measured on
  tools jsonb not null default '[]',      -- string array: systems/tools the lane actors use
  origin text not null default 'import' check (origin in ('import', 'app')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (jsonb_typeof(kpis) = 'array'),
  check (jsonb_typeof(tools) = 'array')
);

create table public.steps (
  id uuid primary key default gen_random_uuid(),
  service_scenario_id uuid not null references public.service_scenarios (id) on delete cascade,
  name text not null,
  origin text not null default 'import' check (origin in ('import', 'app')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.path_steps (
  path_id uuid not null references public.paths (id) on delete cascade,
  step_id uuid not null references public.steps (id) on delete cascade,
  column_position integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (path_id, step_id),
  -- Deferrable so the reorder RPCs can renumber a whole path in one batch.
  unique (path_id, column_position) deferrable initially deferred
);

create table public.cells (
  id uuid primary key default gen_random_uuid(),
  path_id uuid not null references public.paths (id) on delete cascade,
  layer_id uuid not null references public.layers (id) on delete cascade,
  step_id uuid not null references public.steps (id) on delete cascade,
  -- Ordering within one (layer, step) slot: tech-lane touchpoints occupy 0..n;
  -- everything else sits at 0.
  slot_position integer not null default 0,
  content text not null default '',
  picture text,
  description text,
  links jsonb not null default '[]'::jsonb,
  function text,                          -- spec: role/responsibility/requirements
  form text,                              -- spec: communication/look/feel/sound
  value_props jsonb not null default '[]',-- array of {for, value}
  owner text,                             -- actual owning team/party
  perceived_owner text,                   -- who the customer believes owns this moment
  -- Authored IR key (lifecycle/scenario/path/layer/step). Written by the import
  -- pipeline for origin=import, minted by upsert_cell for origin=app; survives
  -- re-import — slice_items.cell_keys matches against it. Null = not recoverable.
  cell_key text,
  origin text not null default 'import' check (origin in ('import', 'app')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint cells_layer_step_slot_unique unique (layer_id, step_id, slot_position),
  check (jsonb_typeof(links) = 'array'),
  check (jsonb_typeof(value_props) = 'array')
);
-- Plus: create unique index cells_cell_key_unique on cells (cell_key) where cell_key is not null;

create table public.cell_triggers (
  id uuid primary key default gen_random_uuid(),
  source_cell_id uuid not null references public.cells (id) on delete cascade,
  target_cell_id uuid not null references public.cells (id) on delete cascade,
  kind text not null default 'trigger' check (kind in ('trigger', 'needs')),
  label text, -- short edge label, e.g. a channel tag like "Email"
  note text,  -- the why-line shown in the cell panel dependencies tab
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint cell_triggers_source_target_kind_unique unique (source_cell_id, target_cell_id, kind),
  check (source_cell_id <> target_cell_id)
);

-- Derived layer (slices/findings/evidence reference cells SOFTLY — uuid/uuid[]
-- with paired cell_keys, no FK — so scenario re-import never cascades into them)
create table public.slices (
  id uuid primary key default gen_random_uuid(),
  service_lifecycle_id uuid not null references public.service_lifecycles (id) on delete cascade,
  slice_type text not null check (slice_type in ('journey', 'step', 'lane', 'cell', 'custom')),
  title text not null,
  description text,
  actor text,
  locale text not null default 'en',
  -- generated = safe to regenerate; customized = human-edited skill output;
  -- human = authored in the app, never the skill's to regenerate.
  origin text not null default 'generated' check (origin in ('generated', 'customized', 'human')),
  position int not null default 0,
  created_by uuid default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.slice_items (
  id uuid primary key default gen_random_uuid(),
  slice_id uuid not null references public.slices (id) on delete cascade,
  position int not null,
  cell_ids uuid[] not null default '{}',  -- SOFT refs to cells; same order as cell_keys
  cell_keys text[] not null default '{}', -- IR key-paths for orphan recovery
  caption text,
  narrative text,
  illustration jsonb, -- {src, alt, source: generated|uploaded|external, updated_at}
  created_by uuid default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (slice_id, position) deferrable initially deferred,
  check (cardinality(cell_ids) = cardinality(cell_keys))
);

create table public.findings (
  id uuid primary key default gen_random_uuid(),
  service_lifecycle_id uuid not null references public.service_lifecycles (id) on delete cascade,
  run_id uuid not null, -- audit-run identity; intentionally FK-less
  source text not null check (source in ('audit', 'whatif', 'import-sweep')),
  check_name text not null,
  severity text not null check (severity in ('info', 'warn', 'critical')),
  cell_ids uuid[] not null default '{}',
  cell_keys text[] not null default '{}',
  note text,
  fingerprint text not null, -- check_name + sorted cell_keys hash; dedupe identity
  status text not null default 'open' check (status in ('open', 'resolved', 'dismissed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (cardinality(cell_ids) = cardinality(cell_keys))
);
-- Plus: create unique index findings_open_fingerprint_idx
--   on findings (service_lifecycle_id, fingerprint) where status = 'open';
-- Inserts must arrive with status = 'open' (policy); authenticated UPDATE is
-- column-scoped to (status, note, severity, run_id, cell_ids, cell_keys, source).

create table public.evidence (
  id uuid primary key default gen_random_uuid(),
  service_lifecycle_id uuid not null references public.service_lifecycles (id) on delete cascade,
  cell_id uuid,   -- SOFT ref; exactly one of cell_id / proposition_question_key
  cell_key text,  -- paired with cell_id (both set or both null)
  proposition_question_key text check (
    proposition_question_key is null
    or proposition_question_key in ('understand', 'value', 'usability')),
  kind text not null check (kind in
    ('interview', 'survey', 'analytics', 'doc', 'meeting', 'decision', 'observation', 'other')),
  title text not null,
  ref text,
  excerpt text,
  note text,
  observed_at date, -- date-only by design (timestamps could re-identify participants)
  added_by text,    -- agent name or participant-coded author; never the interviewee
  created_by uuid default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (num_nonnulls(cell_id, proposition_question_key) = 1),
  check ((cell_id is null) = (cell_key is null))
);
-- Evidence is publicly readable (anon SELECT) as of the authoring foundation;
-- adopters with sensitive excerpts drop that policy (see the migration header).

create table public.propositions (
  service_lifecycle_id uuid primary key
    references public.service_lifecycles (id) on delete cascade,
  funding text,
  pricing text,
  delivery_cost text,
  revenue_model text,
  partners text,
  created_by uuid default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- cell_id -> evidence row count; powers the assumption lens (a cell with zero
-- rows is an ASSUMPTION — derived, never stored). security_invoker.
create view public.evidence_counts as
  select cell_id, count(*)::int as n
  from public.evidence
  where cell_id is not null
  group by cell_id;

-- Delete safety: every structural delete archives its full payload here, in
-- the same transaction as the cascade that destroys it. Written only by the
-- delete RPCs (definer); readable by every blueprint reader.
create table public.deleted_structure (
  id uuid primary key default gen_random_uuid(),
  deleted_at timestamptz not null default now(),
  deleted_by uuid default auth.uid(),
  kind text not null check (kind in ('scenario', 'path', 'lane', 'step', 'cell')),
  label text not null,             -- human name for the undo toast / recovery list
  payload jsonb not null,          -- every deleted row, natural-keyed, dependency order
  affected_slices jsonb not null default '[]'::jsonb -- [{slice_id, title, cell_keys}]
);

-- Optional tier recipe (20260818002000): adopter-configured allowlist —
-- accounts created with these emails get app_metadata.role = 'service'.
-- Operator-only (service role); absent unless the recipe is applied.
create table public.service_account_emails (
  email text primary key,
  note text,
  created_at timestamptz not null default now()
);

-- Agent surface (20260819000000). The in-app agent panel's transcript store,
-- private to its author: `created_by` defaults to the caller so the app never
-- sets it, and RLS filters every read to the caller's own rows. Reachable by
-- authenticated sessions only — an anon deployment never sees this surface and
-- persistence degrades to browser storage.
create table public.agent_sessions (
  id uuid primary key,
  title text not null default 'New session',
  created_by uuid not null default auth.uid(),   -- SUPABASE RECIPE: the default
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- seq is bigint because the app writes a per-boot epoch base, so two tabs on
-- one session land in disjoint ranges rather than upserting over each other.
create table public.agent_messages (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.agent_sessions (id) on delete cascade,
  seq bigint not null,
  kind text not null check (kind in ('user', 'assistant', 'tool', 'status')),
  payload jsonb not null,
  created_at timestamptz not null default now(),
  unique (session_id, seq)
);

-- ---------------------------------------------------------------------------
-- Function surface (signatures only; bodies live in the migrations).
--
-- Structural writes go through SECURITY DEFINER RPCs — the app gets
-- operations, not tables. Every write asserts is_service_account() in-body
-- (default: true; the tier recipe swaps in a JWT app_metadata check) and has
-- EXECUTE revoked from PUBLIC/anon, granted to authenticated only.
--
-- Read helpers (open to anon):
--   key_slug(value text) -> text
--   cell_natural_key(cell_id uuid) -> text
--   mint_cell_key(path_id uuid, layer_id uuid, step_id uuid) -> text
--   slices_referencing(cell_ids uuid[]) -> jsonb
--   deletion_impact(kind text, target_id uuid) -> jsonb
--   is_service_account() -> boolean
--
-- Writes (authenticated only):
--   create_scenario(phase_id, name, view_type, lane_source_path_id, lane_set, step_count, path_name) -> jsonb
--   duplicate_scenario(source_scenario_id, name) -> uuid
--   create_phase(lifecycle_id, name, description) -> uuid
--   create_path(scenario_id, name, path_type, lane_source_path_id) -> uuid
--   duplicate_path(source_path_id, name, path_type, copy_cells, copy_dependencies) -> uuid
--   add_step(path_id, name, at_position) -> uuid
--   add_lane(scenario_id, name, layer_role, at_row) -> uuid[]   -- ids, for identity-keyed undo
--   reorder_steps(path_id, step_ids) / set_path_steps(path_id, step_ids) / reorder_lanes(scenario_id, lane_names)
--   upsert_cell(path_id, layer_id, step_id, content) -> uuid    -- always slot 0
--   set_cell_dependency(source_cell_id, target_cell_id, kind, label, note) -> uuid
--   clear_cell_dependency(dependency_id)
--   rename_phase / rename_scenario / rename_path (id, new_name)
--   rename_owner_tag(from_name, to_name) -> uuid[]              -- cells touched, for revert
--   delete_scenario / delete_path (id) -> uuid                  -- deleted_structure archive id
--   remove_step(path_id, step_id) / remove_lane(scenario_id, lane_name) -> uuid
--   remove_lanes(lane_ids uuid[]) -> uuid                       -- identity-keyed undo of add_lane
--   delete_cell(cell_id) -> uuid
-- ---------------------------------------------------------------------------
