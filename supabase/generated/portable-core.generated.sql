-- The portable Postgres core.
--
-- ⚠ GENERATED FILE — DO NOT EDIT. Every line below was emitted from the
-- partition marks in supabase/migrations/. Edit the migration, then run
-- `npm run generate:portable-core`. A hand-edit is reverted by CI, which
-- regenerates this file and fails on any difference.
--
-- This is the contract. It is the tables, columns, constraints, indexes,
-- views, triggers and function bodies a backend has to carry to hold a
-- service blueprint, and it applies to a stock `postgres:17` with nothing
-- in front of it — no Supabase, no shim, no roles that do not ship with
-- Postgres. CI proves that on every pull request.
--
-- What is NOT here is everything that names a Supabase primitive: the
-- `auth.uid()` column defaults, the anon / authenticated / service_role
-- grants, the RLS policies, the storage bucket. Those are the recipe, and
-- another host re-expresses them with its own auth and authorization —
-- keeping the semantics, replacing the primitives.
--
-- SECURITY DEFINER stays here on purpose. It is plain Postgres, and the
-- write RPCs need it wherever they run: they are the sanctioned write path
-- precisely because they perform one complete valid edit with the owner's
-- rights. What Supabase supplies is the caller classes those functions are
-- granted to, not the definer semantics.
-- ─────────────────────────────────────────────────────────────────────────

-- ─────────────────────────────────────────────────────────────────────────
-- 20260716200000_template_schema.sql
-- ─────────────────────────────────────────────────────────────────────────

-- Service Blueprint template schema (consolidated).
--
-- Single schema migration for the agentic-service-blueprinting template,
-- replacing the original instance's 700+ migration history: hierarchy
-- tables, blueprint grid,
-- path_steps ordering, cell metadata, layer_role, integrity trigger,
-- updated_at triggers, and read-only RLS. Content comes from seeds
-- (supabase/seed.sql) or the import pipeline — this file contains no content.

-- ---------------------------------------------------------------------------
-- Legacy cleanup: databases created from the original instance carried an
-- unused `services` catalog table (never dropped). Remove it if present.
-- ---------------------------------------------------------------------------

-- Note: only the table drop — DROP TRIGGER/POLICY IF EXISTS still 42P01s
-- when the TABLE is absent, which aborted this whole migration on a fresh
-- database. CASCADE removes the trigger and policies with the table.
drop table if exists public.services cascade;

-- ---------------------------------------------------------------------------
-- Core hierarchy: service_lifecycles → phases → service_scenarios → paths
-- ---------------------------------------------------------------------------

create table public.service_lifecycles (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.service_lifecycles is 'End-to-end service journey';

create table public.phases (
  id uuid primary key default gen_random_uuid(),
  service_lifecycle_id uuid not null references public.service_lifecycles (id) on delete cascade,
  name text not null,
  description text,
  order_position integer not null default 0,
  loops_to_phase_id uuid references public.phases (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.phases is 'Ordered phase within a service lifecycle';
comment on column public.phases.loops_to_phase_id is
  'When set, UI shows a return transition from this phase to the target phase';

create index phases_service_lifecycle_id_idx on public.phases (service_lifecycle_id);
create index phases_lifecycle_order_idx on public.phases (service_lifecycle_id, order_position);
create index phases_loops_to_phase_id_idx on public.phases (loops_to_phase_id);

create table public.service_scenarios (
  id uuid primary key default gen_random_uuid(),
  phase_id uuid not null references public.phases (id) on delete cascade,
  name text not null,
  description text,
  order_position integer not null default 0,
  view_type text not null default 'single',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint service_scenarios_view_type_check check (
    view_type in ('single', 'side-by-side', 'integrated')
  )
);

comment on table public.service_scenarios is 'Scenario within a phase';
comment on column public.service_scenarios.view_type is
  'Blueprint layout: single path, side-by-side compare, or integrated merge.';

create index service_scenarios_phase_id_idx on public.service_scenarios (phase_id);
create index service_scenarios_phase_order_idx on public.service_scenarios (phase_id, order_position);

create table public.paths (
  id uuid primary key default gen_random_uuid(),
  service_scenario_id uuid not null references public.service_scenarios (id) on delete cascade,
  name text not null,
  description text,
  note text,
  path_type text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint paths_path_type_check check (
    path_type in ('happy', 'unhappy', 'exception', 'alternative')
  )
);

comment on table public.paths is 'Service blueprint path (happy, unhappy, exception, alternative)';
comment on column public.paths.path_type is 'Path variant: happy, unhappy, exception, alternative';
comment on column public.paths.description is 'Optional summary of what this path variant represents';
comment on column public.paths.note is
  'Optional path note shown alongside path metadata (e.g. parallel scenario context)';

create index paths_service_scenario_id_idx on public.paths (service_scenario_id);

-- ---------------------------------------------------------------------------
-- Blueprint grid: layers (rows, per path) × steps (columns, per scenario)
-- ---------------------------------------------------------------------------

create table public.layers (
  id uuid primary key default gen_random_uuid(),
  path_id uuid not null references public.paths (id) on delete cascade,
  name text not null,
  layer_role text,
  row_position integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.layers is 'Blueprint row (swimlane) within a path';
comment on column public.layers.layer_role is
  'Semantic role key that drives rendering (pill cells, visual rows, divider-line anchoring); the display name stays in layers.name and is free-form in any language. Canonical values: customer_actions, frontstage_actions, backstage_actions, frontstage_tech, backstage_tech, support_systems, visual, step_visual. The vocabulary is extensible — org-defined custom roles are allowed and render as generic swimlanes. Null = generic swimlane (e.g. actor lanes).';

create index layers_path_id_idx on public.layers (path_id);
create index layers_path_row_idx on public.layers (path_id, row_position);

create table public.steps (
  id uuid primary key default gen_random_uuid(),
  service_scenario_id uuid not null references public.service_scenarios (id) on delete cascade,
  name text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.steps is 'Blueprint column (journey step) scoped to a service scenario';
comment on column public.steps.service_scenario_id is 'Scenario that owns this canonical step';

create index steps_service_scenario_id_idx on public.steps (service_scenario_id);

create table public.path_steps (
  path_id uuid not null references public.paths (id) on delete cascade,
  step_id uuid not null references public.steps (id) on delete cascade,
  column_position integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint path_steps_pkey primary key (path_id, step_id),
  constraint path_steps_path_column_unique unique (path_id, column_position)
);

comment on table public.path_steps is 'Steps included on a path and their column order';
comment on column public.path_steps.column_position is 'Blueprint column index for this step on this path';

create index path_steps_step_id_idx on public.path_steps (step_id);
create index path_steps_path_column_idx on public.path_steps (path_id, column_position);

create table public.cells (
  id uuid primary key default gen_random_uuid(),
  path_id uuid not null references public.paths (id) on delete cascade,
  layer_id uuid not null references public.layers (id) on delete cascade,
  step_id uuid not null references public.steps (id) on delete cascade,
  content text not null default '',
  picture text,
  description text,
  links jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint cells_layer_step_unique unique (layer_id, step_id),
  constraint cells_links_is_array check (jsonb_typeof(links) = 'array')
);

comment on table public.cells is 'Content at layer × step intersection';
comment on column public.cells.content is
  'Cell Label — primary blueprint text entered in the grid';
comment on column public.cells.picture is
  'Optional image URL or storage reference';
comment on column public.cells.description is
  'Optional longer cell description (detail panel, not grid label)';
comment on column public.cells.links is
  'Optional JSON array of link objects: { "type": string, "label": string, "url"?: string }';

create index cells_path_id_idx on public.cells (path_id);
create index cells_layer_id_idx on public.cells (layer_id);
create index cells_step_id_idx on public.cells (step_id);

create table public.cell_triggers (
  id uuid primary key default gen_random_uuid(),
  source_cell_id uuid not null references public.cells (id) on delete cascade,
  target_cell_id uuid not null references public.cells (id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint cell_triggers_source_target_unique unique (source_cell_id, target_cell_id),
  constraint cell_triggers_no_self_reference check (source_cell_id <> target_cell_id)
);

comment on table public.cell_triggers is 'Dependency from one cell to another';

create index cell_triggers_source_cell_id_idx on public.cell_triggers (source_cell_id);
create index cell_triggers_target_cell_id_idx on public.cell_triggers (target_cell_id);

-- ---------------------------------------------------------------------------
-- Integrity: a cell's layer must belong to the cell's path, and the cell's
-- step must be linked to that path via path_steps.
-- ---------------------------------------------------------------------------

create or replace function public.cells_validate_path_match()
returns trigger
language plpgsql
as $$
declare
  layer_path uuid;
  step_on_path boolean;
begin
  select path_id into layer_path from public.layers where id = new.layer_id;

  select exists (
    select 1
    from public.path_steps ps
    where ps.path_id = new.path_id
      and ps.step_id = new.step_id
  ) into step_on_path;

  if layer_path is null then
    raise exception 'cells: layer_id does not exist';
  end if;

  if layer_path <> new.path_id then
    raise exception 'cells.path_id must match layers.path_id';
  end if;

  if not step_on_path then
    raise exception 'cells.step_id must be linked to cells.path_id in path_steps';
  end if;

  return new;
end;
$$;

create trigger cells_validate_path_match
  before insert or update on public.cells
  for each row execute function public.cells_validate_path_match();

-- ---------------------------------------------------------------------------
-- updated_at triggers
-- ---------------------------------------------------------------------------

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger set_service_lifecycles_updated_at
  before update on public.service_lifecycles
  for each row execute function public.set_updated_at();

create trigger set_phases_updated_at
  before update on public.phases
  for each row execute function public.set_updated_at();

create trigger set_service_scenarios_updated_at
  before update on public.service_scenarios
  for each row execute function public.set_updated_at();

create trigger set_paths_updated_at
  before update on public.paths
  for each row execute function public.set_updated_at();

create trigger set_layers_updated_at
  before update on public.layers
  for each row execute function public.set_updated_at();

create trigger set_steps_updated_at
  before update on public.steps
  for each row execute function public.set_updated_at();

create trigger set_path_steps_updated_at
  before update on public.path_steps
  for each row execute function public.set_updated_at();

create trigger set_cells_updated_at
  before update on public.cells
  for each row execute function public.set_updated_at();

create trigger set_cell_triggers_updated_at
  before update on public.cell_triggers
  for each row execute function public.set_updated_at();

-- ─────────────────────────────────────────────────────────────────────────
-- 20260729120000_derived_layer.sql
-- ─────────────────────────────────────────────────────────────────────────

-- Derived layer: slices, findings, evidence, propositions + cell/lane/phase spec fields.
-- Plan: docs/plans/2026-07-29-002 (stage 1).
--
-- Design invariants encoded here:
--   * Derived tables reference cells SOFTLY (uuid / uuid[], no FK) — the importer's
--     scenario-scoped delete-and-reinsert must never cascade into user-authored
--     slices/evidence/findings. cell_keys columns carry IR key-paths for recovery.
--   * evidence gets a HARD lifecycle FK: lifecycles are upserted, never deleted, by the
--     importer, and the FK is the retention/deletion story for interview excerpts.
--   * "Assumption" is a derived state (zero evidence rows) — deliberately not stored.
--   * Human-editable columns are scoped with column-level GRANTs; RLS alone cannot
--     restrict columns.

-- ============================================================
-- 1. Spec columns on existing tables
-- ============================================================

alter table public.cells
  add column function text,
  add column form text,
  add column value_props jsonb not null default '[]'
    constraint cells_value_props_is_array check (jsonb_typeof(value_props) = 'array'),
  add column owner text,
  add column perceived_owner text;

comment on column public.cells.function is 'Spec: role/responsibility/requirements of this cell (what it must do).';
comment on column public.cells.form is 'Spec: communication/look/feel/sound (what it must convey).';
comment on column public.cells.value_props is 'Array of {for, value} — value generated per beneficiary (user, business, actor).';
comment on column public.cells.owner is 'Actual owning team/party for this cell.';
comment on column public.cells.perceived_owner is 'Who the customer believes owns this moment (mismatch = deception risk).';

alter table public.layers
  add column owner_team text,
  add column kpis jsonb not null default '[]'
    constraint layers_kpis_is_array check (jsonb_typeof(kpis) = 'array'),
  add column tools jsonb not null default '[]'
    constraint layers_tools_is_array check (jsonb_typeof(tools) = 'array');

comment on column public.layers.owner_team is 'Team that staffs/owns this lane (feeds KPI-alignment audit).';
comment on column public.layers.kpis is 'String array: metrics this lane''s team is measured on.';
comment on column public.layers.tools is 'String array: systems/tools this lane''s actors use.';

alter table public.phases
  add column business_impact text,
  add column operational_requirements text;

comment on column public.phases.business_impact is 'Commercial impact notes: opex, NPS, brand, retention, growth.';
comment on column public.phases.operational_requirements is 'Process / system / people / legal requirements for this phase.';

-- cell_triggers becomes the general cell-link table (no rename: importer, arrow
-- rendering, and fallback modules all name it). One atomic ALTER: no window without
-- uniqueness.
alter table public.cell_triggers
  add column kind text not null default 'trigger'
    constraint cell_triggers_kind_check check (kind in ('trigger','needs')),
  add column label text,
  add column note text,
  drop constraint if exists cell_triggers_source_target_unique,
  add constraint cell_triggers_source_target_kind_unique
    unique (source_cell_id, target_cell_id, kind);

comment on column public.cell_triggers.kind is 'trigger = temporal (sets off); needs = functional (source requires target). needs renders in the panel only.';
comment on column public.cell_triggers.label is 'Short edge label, e.g. a channel tag like "Email".';
comment on column public.cell_triggers.note is 'The why-line shown in the cell panel dependencies tab.';

-- ============================================================
-- 2. New tables
-- ============================================================

create table public.slices (
  id uuid primary key default gen_random_uuid(),
  service_lifecycle_id uuid not null references public.service_lifecycles(id) on delete cascade,
  slice_type text not null
    constraint slices_slice_type_check check (slice_type in ('journey','step','lane','cell','custom')),
  title text not null,
  description text,
  actor text,
  locale text not null default 'en',
  origin text not null default 'generated'
    constraint slices_origin_check check (origin in ('generated','customized')),
  position int not null default 0,
  created_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.slices is 'Saved 1D cuts through the blueprint grid. Reference cells only — never copy or create them.';
comment on column public.slices.slice_type is 'How the cut was made: journey (experience closure for an actor) | step (one column) | lane (one lane over lifecycle) | cell (single-cell spec) | custom.';
comment on column public.slices.origin is 'generated = safe to regenerate; customized = human-edited, regeneration must confirm.';

create index slices_service_lifecycle_id_idx on public.slices (service_lifecycle_id);

create table public.slice_items (
  id uuid primary key default gen_random_uuid(),
  slice_id uuid not null references public.slices(id) on delete cascade,
  position int not null,
  cell_ids uuid[] not null default '{}',
  cell_keys text[] not null default '{}',
  caption text,
  narrative text,
  illustration jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint slice_items_position_unique unique (slice_id, position)
    deferrable initially deferred,
  constraint slice_items_keys_match_ids
    check (cardinality(cell_ids) = cardinality(cell_keys))
);

comment on table public.slice_items is 'Frames: consecutive slice cells grouped (default one frame per phase). Empty cell_ids = title-only divider frame.';
comment on column public.slice_items.cell_ids is 'SOFT refs to cells (no FK — must survive scenario re-import). Same order as cell_keys.';
comment on column public.slice_items.cell_keys is 'IR key-paths paired with cell_ids for orphan recovery after key renames.';
comment on column public.slice_items.illustration is '{src, alt, source: generated|uploaded|external, updated_at} — src validated https/storage-host on write and render.';

create index slice_items_slice_id_idx on public.slice_items (slice_id);
create index slice_items_cell_ids_idx on public.slice_items using gin (cell_ids);

create table public.findings (
  id uuid primary key default gen_random_uuid(),
  service_lifecycle_id uuid not null references public.service_lifecycles(id) on delete cascade,
  run_id uuid not null,
  source text not null
    constraint findings_source_check check (source in ('audit','whatif','import-sweep')),
  check_name text not null,
  severity text not null
    constraint findings_severity_check check (severity in ('info','warn','critical')),
  cell_ids uuid[] not null default '{}',
  cell_keys text[] not null default '{}',
  note text,
  fingerprint text not null,
  status text not null default 'open'
    constraint findings_status_check check (status in ('open','resolved','dismissed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint findings_keys_match_ids
    check (cardinality(cell_ids) = cardinality(cell_keys))
);

comment on table public.findings is 'Audit / whatif / import-sweep outputs. Never hand-created; humans may only change status.';
comment on column public.findings.run_id is 'Audit-run identity. Intentionally FK-less — no runs table by design.';
comment on column public.findings.fingerprint is 'check_name + sorted cell_keys hash. Dedupe/reopen identity across runs.';

create index findings_service_lifecycle_id_idx on public.findings (service_lifecycle_id);
create index findings_cell_ids_idx on public.findings using gin (cell_ids);
-- DB backstop for skill-side dedupe: at most one OPEN finding per fingerprint.
create unique index findings_open_fingerprint_idx
  on public.findings (service_lifecycle_id, fingerprint) where status = 'open';

create table public.evidence (
  id uuid primary key default gen_random_uuid(),
  service_lifecycle_id uuid not null references public.service_lifecycles(id) on delete cascade,
  cell_id uuid,
  cell_key text,
  proposition_question_key text
    constraint evidence_question_key_check check (
      proposition_question_key is null
      or proposition_question_key in ('understand','value','usability')),
  kind text not null
    constraint evidence_kind_check check (kind in
      ('interview','survey','analytics','doc','meeting','decision','observation','other')),
  title text not null,
  ref text,
  excerpt text,
  note text,
  observed_at date,
  added_by text,
  created_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint evidence_exactly_one_target
    check (num_nonnulls(cell_id, proposition_question_key) = 1),
  constraint evidence_cell_key_paired
    check (cell_id is null or cell_key is not null)
);

comment on table public.evidence is 'Provenance rows for cells and proposition questions. A cell with zero rows is an ASSUMPTION (derived, never stored). Restricted SELECT: excerpts may hold interview content.';
comment on column public.evidence.observed_at is 'Date-only by design (timestamps could re-identify participants).';
comment on column public.evidence.added_by is 'Agent name or participant-coded author. Never the interviewee.';

create index evidence_service_lifecycle_id_idx on public.evidence (service_lifecycle_id);
create index evidence_cell_id_idx on public.evidence (cell_id);

create table public.propositions (
  service_lifecycle_id uuid primary key
    references public.service_lifecycles(id) on delete cascade,
  funding text,
  pricing text,
  delivery_cost text,
  revenue_model text,
  partners text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.propositions is 'One business-model record per lifecycle. The three validation questions live as evidence rows keyed understand|value|usability. Restricted SELECT.';

-- Public count-only surface for the assumption lens: anonymous viewers may know HOW MANY
-- evidence rows a cell has, never their content. View owner bypasses evidence RLS
-- deliberately — counts only.
create view public.evidence_counts as
  select cell_id, count(*)::int as n
  from public.evidence
  where cell_id is not null
  group by cell_id;

comment on view public.evidence_counts is 'cell_id -> evidence row count. Public: powers the assumption lens without exposing evidence content.';

-- ============================================================
-- 3. updated_at triggers (template convention)
-- ============================================================

create trigger set_slices_updated_at
  before update on public.slices
  for each row execute function public.set_updated_at();
create trigger set_slice_items_updated_at
  before update on public.slice_items
  for each row execute function public.set_updated_at();
create trigger set_findings_updated_at
  before update on public.findings
  for each row execute function public.set_updated_at();
create trigger set_evidence_updated_at
  before update on public.evidence
  for each row execute function public.set_updated_at();
create trigger set_propositions_updated_at
  before update on public.propositions
  for each row execute function public.set_updated_at();

-- ─────────────────────────────────────────────────────────────────────────
-- 20260730090000_derived_layer_grants_hardening.sql
-- ─────────────────────────────────────────────────────────────────────────

-- Derived-layer follow-up hardening (data-integrity review findings F1, F3, F4, F5).
-- F1: explicit Data API grants (plan 002 §1d) — stop relying on legacy default ACLs
--     that also left anon holding write privileges RLS was silently covering for.
-- F3: pin search_path on trigger/util functions (advisor WARN).
-- F4: attribution columns missed on slice_items/propositions.
-- F5: evidence cell_key XOR tightened to bidirectional pairing.

-- ---- F3: pinned search_path on functions ----
alter function public.set_updated_at() set search_path = pg_catalog, pg_temp;
alter function public.cells_validate_path_match() set search_path = public, pg_catalog, pg_temp;

-- ---- F4: attribution on the remaining human-writable derived tables ----
alter table public.slice_items add column created_by uuid;
alter table public.propositions add column created_by uuid;
comment on column public.slice_items.created_by is 'The caller at insert; null for service-key writes.';
comment on column public.propositions.created_by is 'The caller at insert; null for service-key writes.';


-- ---- F5: evidence cell_key pairing is bidirectional ----
update public.evidence set cell_key = null where cell_id is null and cell_key is not null;
alter table public.evidence
  drop constraint evidence_cell_key_paired,
  add constraint evidence_cell_key_paired check ((cell_id is null) = (cell_key is null));

-- Accepted-by-design (documented, no change): evidence_counts is an owner-rights view
-- (advisor ERROR) — deliberately bypasses evidence RLS to expose counts only; making it
-- security_invoker would break the anonymous assumption-lens read. Public-bucket SELECT
-- policy on storage.objects is required for upsert overwrites. Findings reopen
-- collisions surface as 23505 by design (partial unique index).

-- ─────────────────────────────────────────────────────────────────────────
-- 20260803001000_slices_origin_allows_human.sql
-- ─────────────────────────────────────────────────────────────────────────

-- The app's origin vocabulary is three-valued and the constraint predated
-- the third: 'generated' (skill output), 'customized' (skill output edited
-- by hand), 'human' (authored in the app, never the skill's to regenerate).
-- createSlice sends 'human'; the constraint bounced every in-app slice.
-- This never surfaced before because permission denial masked it — the
-- insert failed earlier for sessions without write access.
alter table public.slices drop constraint slices_origin_check;
alter table public.slices add constraint slices_origin_check
  check (origin = any (array['generated'::text, 'customized'::text, 'human'::text]));

-- ─────────────────────────────────────────────────────────────────────────
-- 20260818000000_authoring_foundation.sql
-- ─────────────────────────────────────────────────────────────────────────

-- Blueprint authoring foundation (part 1 of 2): provenance, cell identity,
-- delete-safety, direct-column grants, and read-surface fixes.
--
-- Consolidated from a proving-ground deployment, where the authoring
-- foundation and its follow-up fixes landed one migration at a time. Each
-- object appears ONCE here, in its FINAL corrected form — the fixes are
-- folded in, not replayed.
--
-- Part 2 (20260818001000) adds the RPCs that are the only sanctioned write
-- path for structure. Nothing here grants table-level INSERT or DELETE: the
-- functions in part 2 are `security definer`, so the app gets operations
-- rather than tables.
--
-- Additive only. The consolidated template schema (20260716200000) and the
-- derived layer (20260729120000) are never rewritten — live downstream
-- databases replay from where they are.

-- ---------------------------------------------------------------------------
-- Provenance. Without it nothing can tell an app-created row from an imported
-- one, and therefore nothing can protect either appropriately. Phases carry
-- it too: create_phase (part 2) makes them creatable from the app.
-- ---------------------------------------------------------------------------
alter table public.phases
  add column if not exists origin text not null default 'import'
    constraint phases_origin_check check (origin in ('import', 'app'));
alter table public.service_scenarios
  add column if not exists origin text not null default 'import'
    constraint service_scenarios_origin_check check (origin in ('import', 'app'));
alter table public.paths
  add column if not exists origin text not null default 'import'
    constraint paths_origin_check check (origin in ('import', 'app'));
alter table public.steps
  add column if not exists origin text not null default 'import'
    constraint steps_origin_check check (origin in ('import', 'app'));
alter table public.layers
  add column if not exists origin text not null default 'import'
    constraint layers_origin_check check (origin in ('import', 'app'));
alter table public.cells
  add column if not exists origin text not null default 'import'
    constraint cells_origin_check check (origin in ('import', 'app'));

-- ---------------------------------------------------------------------------
-- The cell's authored key, stored rather than derived.
--
-- Slices bind to cells through `slice_items.cell_keys` because a scenario
-- re-import deletes and recreates every `cells` row — the id changes, the key
-- does not. That only works if the key can actually be recovered from a cell.
-- The key is *authored* in the IR (`lifecycle/scenario/path/layer/step`, per
-- the slice tooling's cell_key convention), not computed from display names,
-- so no SQL function can reconstruct it for imported rows.
--
-- Nullable on purpose. Imported rows are written by the import pipeline,
-- which is the only thing that knows the authored keys; app-created rows get
-- one minted by `upsert_cell` (part 2). A null key means "not recoverable" —
-- visible, rather than silently wrong.
-- ---------------------------------------------------------------------------
alter table public.cells add column if not exists cell_key text;

create unique index if not exists cells_cell_key_unique
  on public.cells (cell_key) where cell_key is not null;

comment on column public.cells.cell_key is
  'Authored key: lifecycle/scenario/path/layer/step. Written by the import pipeline for origin=import, minted by upsert_cell for origin=app. Survives re-import; slice_items.cell_keys matches against it.';

-- ---------------------------------------------------------------------------
-- Slot position: a (layer, step) slot may hold several cells — one touchpoint
-- per row in tech lanes — ordered by slot_position. Every existing cell is 0,
-- so nothing changes until slots gain siblings (the split below, or the app).
-- ---------------------------------------------------------------------------
alter table public.cells add column if not exists slot_position int not null default 0;

alter table public.cells
  drop constraint if exists cells_layer_step_unique;
alter table public.cells
  drop constraint if exists cells_layer_step_slot_unique;
alter table public.cells
  add constraint cells_layer_step_slot_unique
    unique (layer_id, step_id, slot_position);

comment on column public.cells.slot_position is
  'Ordering within one (layer, step) slot. 0 for single-cell slots; tech-lane touchpoints occupy 0..n.';

-- One touchpoint, one row: any multi-item cell in a tech-role lane splits.
-- The ORIGINAL row keeps the first item — so its id, cell_key, arrows, slice
-- references and evidence stay attached to something real — and each further
-- item becomes a sibling row in the same slot at the next slot_position.
-- Sibling keys are the parent's key with an ordinal suffix ('-2', '-3').
-- Generic: operates on whatever rows exist (seed or adopter data); a fresh
-- database with single-item cells is untouched. Effectively idempotent —
-- split rows carry no separators, so a re-run finds nothing to split.
do $$
declare
  rec record;
  items text[];
  i int;
begin
  for rec in
    select c.id, c.path_id, c.layer_id, c.step_id, c.content, c.cell_key
    from public.cells c
    join public.layers l on l.id = c.layer_id
    where l.layer_role in ('frontstage_tech', 'backstage_tech', 'support_systems')
      and c.content ~ '[\n,]'
  loop
    select array_agg(part) into items
    from (
      select trim(part) as part
      from regexp_split_to_table(rec.content, '\r?\n|,') as part
    ) parts
    where part <> '';

    if items is null or array_length(items, 1) < 2 then
      continue;
    end if;

    update public.cells set content = items[1] where id = rec.id;

    for i in 2 .. array_length(items, 1) loop
      insert into public.cells
        (path_id, layer_id, step_id, slot_position, content, origin, cell_key)
      values
        (rec.path_id, rec.layer_id, rec.step_id, i - 1, items[i], 'app',
         case when rec.cell_key is null then null
              else rec.cell_key || '-' || i::text end);
    end loop;
  end loop;
end $$;

-- ---------------------------------------------------------------------------
-- Column ordering. `slice_items` was built DEFERRABLE INITIALLY DEFERRED so
-- its editor could renumber in one batch; path_steps was not, which makes any
-- multi-row shift collide with itself midway. The RPCs do the shifting in one
-- transaction, and a deferrable constraint makes that safe rather than lucky.
-- ---------------------------------------------------------------------------
alter table public.path_steps
  drop constraint if exists path_steps_path_column_unique;
alter table public.path_steps
  add constraint path_steps_path_column_unique
    unique (path_id, column_position) deferrable initially deferred;

-- ---------------------------------------------------------------------------
-- Delete safety. Nothing is destroyed until its payload is archived, in the
-- same transaction as the cascade that destroys it (part 2's delete RPCs).
-- ---------------------------------------------------------------------------
create table if not exists public.deleted_structure (
  id uuid primary key default gen_random_uuid(),
  deleted_at timestamptz not null default now(),
  deleted_by uuid,
  kind text not null check (kind in ('scenario', 'path', 'lane', 'step', 'cell')),
  -- Human name, for the undo toast and the recovery list.
  label text not null,
  -- Every deleted row, natural-keyed and in dependency order, so restore can
  -- replay it through the ordinary create path.
  payload jsonb not null,
  -- [{slice_id, title, cell_keys:[…]}] — which slices lost frames to this.
  affected_slices jsonb not null default '[]'::jsonb
);

create index if not exists deleted_structure_deleted_at_idx
  on public.deleted_structure (deleted_at desc);

comment on table public.findings is
  'Audit / whatif / import-sweep outputs. Written by skills (IDE service key or canvas authenticated agent); humans triage by status.';

-- ─────────────────────────────────────────────────────────────────────────
-- 20260818001000_authoring_operations.sql
-- ─────────────────────────────────────────────────────────────────────────

-- Blueprint authoring (part 2 of 2): the operations.
--
-- Consolidated from a proving-ground deployment, where these functions and
-- the dozen follow-up fixes to them were written one at a time. Every
-- function appears ONCE here, in its final corrected form — the fixes are
-- folded in, not replayed.
--
-- The app gets *operations*, not tables. Every function here performs one
-- complete, valid edit in one transaction, which is what makes three things
-- true that raw table writes could not:
--
--   1. The `cells_validate_path_match` trigger's ordering requirement (layer →
--      step → path_steps → cell) lives here once, instead of being re-derived
--      by every caller.
--   2. Column renumbering happens inside a transaction, so the non-deferrable
--      collision window that made client-side shifting unsafe never opens.
--   3. Lanes are written to *every* path of a scenario — a lane on only one
--      path renders as a hole in the integrated view.
--
-- All writes are `security definer` with a pinned search_path, and each is
-- scoped to one operation: none takes a table name or free SQL.
--
-- Four hard-won rules, encoded throughout:
--
--   * EXECUTE is revoked from PUBLIC on every write. Postgres grants EXECUTE
--     to PUBLIC by default at CREATE time, and these are definer functions
--     that bypass RLS — without the revoke, anyone holding the anon key
--     (which ships in the client bundle by design) could call
--     delete_scenario. The revoke is the operative statement; the grant
--     merely names the one role supposed to hold it.
--   * RESTRICTIVE policies never bind inside SECURITY DEFINER functions (the
--     owner has table rights and RLS does not apply), so the tier check is
--     asserted IN THE BODY of every write — the only place it can be.
--   * `on conflict` targets are named constraints, not column lists: bare
--     column names in a conflict target cannot be table-qualified, so a
--     parameter sharing a column's name makes the target unresolvable (42702).
--   * SQL-language functions use positional parameter references ($1): an
--     unqualified name matching an in-scope column binds to the COLUMN,
--     silently returning wrong answers.

-- ---------------------------------------------------------------------------
-- The tier seam.
--
-- Every write RPC below asserts `public.is_service_account()` in its body.
-- This default implementation makes the seam a no-op: every authenticated
-- session may edit (single-tier deployment, the template default).
--
-- The OPTIONAL service-account tier recipe (20260818002000) replaces this
-- function with one that reads the caller's JWT, splitting `authenticated`
-- into service (edit) and viewer (read + chat) without touching any RPC.
-- Guarded with create-if-absent so re-running migrations never downgrades a
-- deployed tier function back to the permissive default.
-- ---------------------------------------------------------------------------
do $$
begin
  if to_regprocedure('public.is_service_account()') is null then
    create function public.is_service_account()
    returns boolean
    language sql
    stable
    set search_path = pg_catalog, pg_temp
    as $fn$ select true $fn$;

    comment on function public.is_service_account() is
      'Tier seam asserted inside every write RPC. Default: true (every authenticated session edits). The optional tier recipe migration replaces this to read the JWT app_metadata role.';
  end if;
end $$;


-- ---------------------------------------------------------------------------
-- Helpers (read-only; deliberately open to anon — they are stable/immutable,
-- write nothing, and only describe data already readable through the SELECT
-- policies; deletion_impact is what the confirm dialog reads BEFORE anything
-- is destroyed).
-- ---------------------------------------------------------------------------

/**
 * Slug for one key segment: lowercase, ASCII, hyphen-joined.
 *
 * Matches what the IR authors write by hand ("Check In" is keyed `check-in`).
 * Used only when *minting* a key for an app-created cell — never to guess an
 * imported cell's key, which is authored and cannot be derived.
 */
create or replace function public.key_slug(value text)
returns text
language sql immutable
set search_path = pg_catalog, pg_temp
as $$
  -- Non-ASCII names (CJK lanes, Cyrillic steps) slug to nothing under the
  -- [a-z0-9] filter; returning null there made concat_ws silently DROP the
  -- segment, so two differently-named lanes could mint the same cell key.
  -- Deterministic fallback: an md5 fragment of the raw name keeps the
  -- segment present, stable, and distinct per name. Truly empty input
  -- still yields null.
  select case
    when coalesce(value, '') = '' then null
    else coalesce(
      nullif(
        trim(both '-' from regexp_replace(lower(value), '[^a-z0-9]+', '-', 'g')),
        ''
      ),
      'x' || substr(md5(value), 1, 8)
    )
  end;
$$;

/**
 * A cell's authored key — read, not computed.
 *
 * The key is authored in the IR for imported cells, so it cannot be
 * reconstructed: deriving it from display names collides wherever names
 * repeat and would produce keys matching nothing a slice was bound by,
 * silently breaking the recovery path that deletion safety depends on.
 *
 * Returns null for a cell whose key was never written. Callers must treat
 * null as "not recoverable" rather than substituting a guess.
 */
create or replace function public.cell_natural_key(cell_id uuid)
returns text
language sql stable
set search_path = public, pg_catalog, pg_temp
as $$
  select c.cell_key from public.cells c where c.id = $1;
$$;

/**
 * Mint a key for an app-created cell.
 *
 * Slugs the display names, which is correct here and only here: an
 * app-created cell has no IR entry, so its names *are* its authored source.
 * The path segment is the path's NAME (falling back to path_type): several
 * paths of one journey routinely share a type, so keying on type collides
 * where keying on name does not.
 *
 * Positional references throughout: in a `language sql` function an
 * unqualified parameter name that matches a column of an in-scope table
 * binds to the column, silently. `$1` cannot resolve to a column, so that
 * class of bug cannot come back through a rename.
 */
create or replace function public.mint_cell_key(
  path_id uuid,
  layer_id uuid,
  step_id uuid
)
returns text
language sql stable
set search_path = public, pg_catalog, pg_temp
as $fn$
  select concat_ws('/',
    public.key_slug(sl.name),
    public.key_slug(sc.name),
    coalesce(public.key_slug(p.name), public.key_slug(p.path_type)),
    public.key_slug(l.name),
    public.key_slug(s.name)
  )
  from public.paths p
  join public.service_scenarios sc on sc.id = p.service_scenario_id
  join public.phases ph on ph.id = sc.phase_id
  join public.service_lifecycles sl on sl.id = ph.service_lifecycle_id
  join public.layers l on l.id = $2
  join public.steps s on s.id = $3
  where p.id = $1;
$fn$;

/**
 * Which slices reference any of these cells, and exactly which keys they lose.
 *
 * The keys are the point. A slice that quietly loses cells stays renderable
 * and simply says less than it did — the worst outcome here, because nothing
 * surfaces. Undo re-points by matching these keys back to the restored cells,
 * so a delete that cannot name them cannot be undone.
 *
 * A lost key that is null (a cell that never had one written) still appears,
 * as null, so the confirm dialog can say how many frames it cannot promise to
 * restore instead of implying it can restore them all.
 */
create or replace function public.slices_referencing(cell_ids uuid[])
returns jsonb
language sql stable
set search_path = public, pg_catalog, pg_temp
as $fn$
  select coalesce(jsonb_agg(entry), '[]'::jsonb)
  from (
    select jsonb_build_object(
      'slice_id', s.id,
      'title', s.title,
      'cell_keys', (
        select coalesce(jsonb_agg(to_jsonb(c.cell_key)), '[]'::jsonb)
        from public.cells c
        where c.id = any($1)
          and exists (
            select 1 from public.slice_items i2
            where i2.slice_id = s.id and c.id = any(i2.cell_ids)
          )
      )
    ) as entry
    from public.slices s
    where exists (
      select 1 from public.slice_items i
      where i.slice_id = s.id and i.cell_ids && $1
    )
  ) rows;
$fn$;

/**
 * What a delete would destroy. Read by the confirm dialog so the numbers it
 * shows are the numbers that die, and so it can name the slices that lose
 * frames.
 */
create or replace function public.deletion_impact(kind text, target_id uuid)
returns jsonb
language plpgsql stable
set search_path = public, pg_catalog, pg_temp
as $$
declare
  affected uuid[];
  label text;
begin
  if kind = 'scenario' then
    select array_agg(c.id), max(sc.name) into affected, label
    from public.cells c
    join public.paths p on p.id = c.path_id
    join public.service_scenarios sc on sc.id = p.service_scenario_id
    where sc.id = target_id;
  elsif kind = 'path' then
    select array_agg(c.id), max(p.name) into affected, label
    from public.cells c join public.paths p on p.id = c.path_id
    where p.id = target_id;
  elsif kind = 'step' then
    select array_agg(c.id), max(s.name) into affected, label
    from public.cells c join public.steps s on s.id = c.step_id
    where s.id = target_id;
  elsif kind = 'lane' then
    select array_agg(c.id), max(l.name) into affected, label
    from public.cells c join public.layers l on l.id = c.layer_id
    where l.id = target_id;
  else
    raise exception 'Unknown kind %', kind;
  end if;

  affected := coalesce(affected, array[]::uuid[]);

  return jsonb_build_object(
    'label', coalesce(label, ''),
    'cell_count', cardinality(affected),
    'dependency_count', (
      select count(*) from public.cell_triggers t
      where t.source_cell_id = any(affected) or t.target_cell_id = any(affected)
    ),
    'affected_slices', public.slices_referencing(affected)
  );
end;
$$;

-- ---------------------------------------------------------------------------
-- Scenario creation
-- ---------------------------------------------------------------------------

/**
 * Create a scenario with one path, a lane set, and empty columns.
 *
 * `lane_source_path_id` copies lanes from an existing path — the default in
 * the UI, because lane vocabulary drifting between scenarios is the single
 * most common blueprint defect. `lane_set` is the explicit alternative:
 * [{name, layer_role, row_position}].
 */
create or replace function public.create_scenario(
  phase_id uuid,
  name text,
  view_type text default 'single',
  lane_source_path_id uuid default null,
  lane_set jsonb default '[]'::jsonb,
  step_count int default 5,
  path_name text default 'Happy Path'
)
returns jsonb
language plpgsql security definer
set search_path = public, pg_catalog, pg_temp
as $$
declare
  scenario_id uuid;
  new_path_id uuid;
  next_order int;
  lane jsonb;
  step_id uuid;
  i int;
begin
  if not public.is_service_account() then
    raise exception 'This account cannot edit the blueprint'
      using errcode = '42501';
  end if;

  if coalesce(trim(name), '') = '' then
    raise exception 'A blueprint needs a name';
  end if;
  if view_type not in ('single', 'side-by-side', 'integrated') then
    raise exception 'Unknown view type %', view_type;
  end if;

  select coalesce(max(order_position), -1) + 1 into next_order
  from public.service_scenarios where service_scenarios.phase_id = create_scenario.phase_id;

  insert into public.service_scenarios (phase_id, name, order_position, view_type, origin)
  values (create_scenario.phase_id, create_scenario.name, next_order, create_scenario.view_type, 'app')
  returning id into scenario_id;

  insert into public.paths (service_scenario_id, name, path_type, origin)
  values (scenario_id, path_name, 'happy', 'app')
  returning id into new_path_id;

  -- Lanes: copied from a source path, or taken from the explicit set.
  if lane_source_path_id is not null then
    insert into public.layers (path_id, name, layer_role, row_position, origin)
    select new_path_id, l.name, l.layer_role, l.row_position, 'app'
    from public.layers l where l.path_id = lane_source_path_id;
  else
    for lane in select * from jsonb_array_elements(lane_set) loop
      insert into public.layers (path_id, name, layer_role, row_position, origin)
      values (
        new_path_id,
        lane ->> 'name',
        nullif(lane ->> 'layer_role', ''),
        coalesce((lane ->> 'row_position')::int, 0),
        'app'
      );
    end loop;
  end if;

  -- Columns start unnamed; naming them is the first thing you do on the grid.
  for i in 0 .. greatest(step_count, 1) - 1 loop
    insert into public.steps (service_scenario_id, name, origin)
    values (scenario_id, 'Step ' || (i + 1), 'app')
    returning id into step_id;
    insert into public.path_steps (path_id, step_id, column_position)
    values (new_path_id, step_id, i);
  end loop;

  return jsonb_build_object('scenario_id', scenario_id, 'path_id', new_path_id);
end;
$$;

/**
 * Duplicate a scenario, whole: description, view type, columns (copied ONCE —
 * steps are scenario-scoped, so every copied path points at the same new
 * set), every path with its lanes and cells (all spec fields, slot_position
 * included), and every arrow whose BOTH endpoints live inside the source
 * scenario, remapped onto the copies via (path, layer, step, slot) — the
 * cell's actual identity.
 *
 * NOT copied: `cell_key`. Keys are AUTHORED — they cannot be derived for
 * imported cells, and minting one here would collide wherever a scenario has
 * two same-named steps. Copies get a null key, the same as every app-created
 * cell; a duplicated cell is not addressable by a slice binding until it is
 * given one.
 */
create or replace function public.duplicate_scenario(
  source_scenario_id uuid,
  name text
)
returns uuid
language plpgsql security definer
set search_path = public, pg_catalog, pg_temp
as $$
declare
  source_phase_id uuid;
  new_scenario_id uuid;
  next_order int;
  -- old id → new id, as jsonb rather than temp tables: these functions run
  -- inside one PostgREST statement and a temp table would outlive it.
  step_map jsonb := '{}'::jsonb;
  layer_map jsonb := '{}'::jsonb;
  path_map jsonb := '{}'::jsonb;
  src_step record;
  src_path record;
  src_lane record;
  new_step_id uuid;
  new_path_id uuid;
  new_lane_id uuid;
begin
  if not public.is_service_account() then
    raise exception 'This account cannot edit the blueprint'
      using errcode = '42501';
  end if;

  if coalesce(trim(name), '') = '' then
    raise exception 'A blueprint needs a name';
  end if;

  select sc.phase_id into source_phase_id
  from public.service_scenarios sc
  where sc.id = source_scenario_id;

  if source_phase_id is null then
    raise exception 'Unknown blueprint';
  end if;

  -- The copy lands at the end of its phase. Same rule as create_scenario:
  -- inserting mid-sequence is a reorder, and reordering is a different
  -- operation.
  select coalesce(max(sc.order_position), -1) + 1 into next_order
  from public.service_scenarios sc
  where sc.phase_id = source_phase_id;

  insert into public.service_scenarios
    (phase_id, name, description, order_position, view_type, origin)
  select source_phase_id, duplicate_scenario.name, sc.description,
         next_order, sc.view_type, 'app'
  from public.service_scenarios sc
  where sc.id = source_scenario_id
  returning id into new_scenario_id;

  -- Columns first: they belong to the scenario, not to a path, so they are
  -- copied once and every path below points at this one new set.
  for src_step in
    select s.id, s.name
    from public.steps s
    where s.service_scenario_id = source_scenario_id
    order by s.created_at
  loop
    insert into public.steps (service_scenario_id, name, origin)
    values (new_scenario_id, src_step.name, 'app')
    returning id into new_step_id;
    step_map := step_map || jsonb_build_object(src_step.id::text, new_step_id);
  end loop;

  -- Then each path, in the order the `cells_validate_path_match` trigger
  -- requires: lanes → path_steps → cells.
  for src_path in
    select p.id, p.name, p.path_type, p.description, p.note
    from public.paths p
    where p.service_scenario_id = source_scenario_id
    order by p.created_at
  loop
    insert into public.paths
      (service_scenario_id, name, path_type, description, note, origin)
    values (new_scenario_id, src_path.name, src_path.path_type,
            src_path.description, src_path.note, 'app')
    returning id into new_path_id;
    path_map := path_map || jsonb_build_object(src_path.id::text, new_path_id);

    for src_lane in
      select l.id, l.name, l.layer_role, l.row_position,
             l.owner_team, l.kpis, l.tools
      from public.layers l
      where l.path_id = src_path.id
      order by l.row_position
    loop
      insert into public.layers
        (path_id, name, layer_role, row_position, owner_team, kpis, tools, origin)
      values (new_path_id, src_lane.name, src_lane.layer_role,
              src_lane.row_position, src_lane.owner_team, src_lane.kpis,
              src_lane.tools, 'app')
      returning id into new_lane_id;
      layer_map := layer_map || jsonb_build_object(src_lane.id::text, new_lane_id);
    end loop;

    insert into public.path_steps (path_id, step_id, column_position)
    select new_path_id, (step_map ->> ps.step_id::text)::uuid, ps.column_position
    from public.path_steps ps
    where ps.path_id = src_path.id;

    insert into public.cells
      (path_id, layer_id, step_id, slot_position, content, description,
       picture, links, function, form, value_props, owner, perceived_owner,
       origin)
    select new_path_id,
           (layer_map ->> c.layer_id::text)::uuid,
           (step_map ->> c.step_id::text)::uuid,
           c.slot_position, c.content, c.description,
           c.picture, c.links, c.function, c.form, c.value_props,
           c.owner, c.perceived_owner, 'app'
    from public.cells c
    where c.path_id = src_path.id;
  end loop;

  -- Arrows last, once every cell they could point at exists. Only arrows
  -- with BOTH endpoints inside the source scenario are copied: an arrow with
  -- one foot outside would render as a line leaving the blueprint it belongs
  -- to. Cross-scenario arrows are left pointing at the original, which is
  -- where they still belong.
  insert into public.cell_triggers (source_cell_id, target_cell_id, kind, label, note)
  select ns.id, nt.id, t.kind, t.label, t.note
  from public.cell_triggers t
  join public.cells os on os.id = t.source_cell_id
  join public.cells ot on ot.id = t.target_cell_id
  join public.cells ns
    on ns.path_id = (path_map ->> os.path_id::text)::uuid
   and ns.layer_id = (layer_map ->> os.layer_id::text)::uuid
   and ns.step_id = (step_map ->> os.step_id::text)::uuid
   and ns.slot_position is not distinct from os.slot_position
  join public.cells nt
    on nt.path_id = (path_map ->> ot.path_id::text)::uuid
   and nt.layer_id = (layer_map ->> ot.layer_id::text)::uuid
   and nt.step_id = (step_map ->> ot.step_id::text)::uuid
   and nt.slot_position is not distinct from ot.slot_position
  where path_map ? os.path_id::text
    and path_map ? ot.path_id::text
  on conflict do nothing;

  return new_scenario_id;
end;
$$;

-- ---------------------------------------------------------------------------
-- Phases
-- ---------------------------------------------------------------------------

/**
 * Create a phase at the end of a lifecycle.
 *
 * Appends rather than taking a position. A phase is a column of the whole
 * canvas, so inserting one in the middle re-lays-out every blueprint to its
 * right — that is a reorder, and reordering is its own operation with its own
 * confirmation. Appending is always safe.
 *
 * `loops_to_phase_id` starts null. A loop back to an earlier phase is a claim
 * about the service, and guessing it for a phase that has no content yet
 * would be inventing a fact.
 */
create or replace function public.create_phase(
  lifecycle_id uuid,
  name text,
  description text default null
)
returns uuid
language plpgsql security definer
set search_path = public, pg_catalog, pg_temp
as $$
declare
  new_phase_id uuid;
  next_order int;
begin
  if not public.is_service_account() then
    raise exception 'This account cannot edit the blueprint'
      using errcode = '42501';
  end if;

  if coalesce(trim(name), '') = '' then
    raise exception 'A phase needs a name';
  end if;

  if not exists (
    select 1 from public.service_lifecycles sl where sl.id = lifecycle_id
  ) then
    raise exception 'Unknown service';
  end if;

  -- Names are how a phase is read in the sidebar and in every cell key, so
  -- two phases sharing one is a genuine ambiguity rather than a cosmetic
  -- clash: `mint_cell_key` would produce the same key for cells in both.
  if exists (
    select 1 from public.phases p
    where p.service_lifecycle_id = lifecycle_id
      and lower(trim(p.name)) = lower(trim(create_phase.name))
  ) then
    raise exception 'This service already has a phase called %', trim(name);
  end if;

  select coalesce(max(p.order_position), -1) + 1 into next_order
  from public.phases p where p.service_lifecycle_id = lifecycle_id;

  insert into public.phases (
    service_lifecycle_id, name, description, order_position, origin
  )
  values (
    lifecycle_id, trim(create_phase.name),
    nullif(trim(create_phase.description), ''), next_order, 'app'
  )
  returning id into new_phase_id;

  return new_phase_id;
end;
$$;

-- ---------------------------------------------------------------------------
-- Columns (steps)
-- ---------------------------------------------------------------------------

/** Insert a column at `at_position`, shifting everything after it right. */
create or replace function public.add_step(
  path_id uuid,
  name text,
  at_position int default null
)
returns uuid
language plpgsql security definer
set search_path = public, pg_catalog, pg_temp
as $$
declare
  scenario_id uuid;
  new_step_id uuid;
  target int;
begin
  if not public.is_service_account() then
    raise exception 'This account cannot edit the blueprint'
      using errcode = '42501';
  end if;

  select service_scenario_id into scenario_id from public.paths where id = add_step.path_id;
  if scenario_id is null then
    raise exception 'Unknown path';
  end if;

  select coalesce(max(column_position) + 1, 0) into target
  from public.path_steps where path_steps.path_id = add_step.path_id;
  target := coalesce(at_position, target);

  -- Deferred unique constraint makes the shift and the insert one safe step.
  update public.path_steps
    set column_position = column_position + 1
    where path_steps.path_id = add_step.path_id and column_position >= target;

  insert into public.steps (service_scenario_id, name, origin)
  values (scenario_id, coalesce(nullif(trim(name), ''), 'Untitled step'), 'app')
  returning id into new_step_id;

  insert into public.path_steps (path_id, step_id, column_position)
  values (add_step.path_id, new_step_id, target);

  return new_step_id;
end;
$$;

/** Set the whole column order for one path, renumbered contiguously. */
create or replace function public.reorder_steps(path_id uuid, step_ids uuid[])
returns void
language plpgsql security definer
set search_path = public, pg_catalog, pg_temp
as $$
declare
  i int;
begin
  if not public.is_service_account() then
    raise exception 'This account cannot edit the blueprint'
      using errcode = '42501';
  end if;

  for i in 1 .. array_length(step_ids, 1) loop
    update public.path_steps
      set column_position = i - 1
      where path_steps.path_id = reorder_steps.path_id
        and path_steps.step_id = step_ids[i];
  end loop;
end;
$$;

/**
 * Which columns a path uses. Takes the whole desired set and reconciles —
 * inserts what is new, removes what is gone, renumbers what remains. One
 * call, one transaction; a client-side version of this is what the
 * non-deferrable constraint made unsafe.
 */
create or replace function public.set_path_steps(path_id uuid, step_ids uuid[])
returns void
language plpgsql security definer
set search_path = public, pg_catalog, pg_temp
as $$
declare
  i int;
begin
  if not public.is_service_account() then
    raise exception 'This account cannot edit the blueprint'
      using errcode = '42501';
  end if;

  delete from public.path_steps ps
    where ps.path_id = set_path_steps.path_id
      and not (ps.step_id = any(set_path_steps.step_ids));

  for i in 1 .. coalesce(array_length(set_path_steps.step_ids, 1), 0) loop
    insert into public.path_steps (path_id, step_id, column_position)
    values (set_path_steps.path_id, set_path_steps.step_ids[i], i - 1)
    on conflict on constraint path_steps_pkey
      do update set column_position = excluded.column_position;
  end loop;
end;
$$;

-- ---------------------------------------------------------------------------
-- Lanes (layers) — scenario-wide, because layers rows belong to a path
-- ---------------------------------------------------------------------------

-- A pre-existing add_lane with a different return type would block the
-- create; harmless when absent (the template lineage never shipped one).
drop function if exists public.add_lane(uuid, text, text, int);

/**
 * Add a lane to EVERY path of a scenario, at the given row.
 *
 * Returns the created `layers` ids — one per path, which is why it is an
 * array — so the caller can invert by identity: an inverse keyed by the name
 * that was just typed deletes the wrong lane the moment anything is renamed,
 * and `remove_lane` matches by name across every path, so the blast radius
 * of a wrong match is the whole blueprint's worth of that lane.
 */
create or replace function public.add_lane(
  scenario_id uuid,
  name text,
  layer_role text default null,
  at_row int default null
)
returns uuid[]
language plpgsql security definer
set search_path = public, pg_catalog, pg_temp
as $$
declare
  target int;
  created uuid[];
begin
  if not public.is_service_account() then
    raise exception 'This account cannot edit the blueprint'
      using errcode = '42501';
  end if;

  if coalesce(trim(name), '') = '' then
    raise exception 'A lane needs a name';
  end if;

  select coalesce(max(l.row_position) + 1, 0) into target
  from public.layers l
  join public.paths p on p.id = l.path_id
  where p.service_scenario_id = add_lane.scenario_id;
  target := coalesce(at_row, target);

  update public.layers l
    set row_position = l.row_position + 1
    from public.paths p
    where p.id = l.path_id
      and p.service_scenario_id = add_lane.scenario_id
      and l.row_position >= target;

  with inserted as (
    insert into public.layers (path_id, name, layer_role, row_position, origin)
    select p.id, add_lane.name, nullif(add_lane.layer_role, ''), target, 'app'
    from public.paths p
    where p.service_scenario_id = add_lane.scenario_id
    returning id
  )
  select coalesce(array_agg(id), array[]::uuid[]) into created from inserted;

  return created;
end;
$$;

/** Reorder lanes across every path at once; lanes are matched by name. */
create or replace function public.reorder_lanes(scenario_id uuid, lane_names text[])
returns void
language plpgsql security definer
set search_path = public, pg_catalog, pg_temp
as $$
declare
  i int;
begin
  if not public.is_service_account() then
    raise exception 'This account cannot edit the blueprint'
      using errcode = '42501';
  end if;

  for i in 1 .. array_length(lane_names, 1) loop
    update public.layers l
      set row_position = i - 1
      from public.paths p
      where p.id = l.path_id
        and p.service_scenario_id = reorder_lanes.scenario_id
        and l.name = lane_names[i];
  end loop;
end;
$$;

-- ---------------------------------------------------------------------------
-- Cells
-- ---------------------------------------------------------------------------

/**
 * Create or update the cell at (layer, step), always addressing slot 0 —
 * create on empty, update on click. Sibling touchpoints at higher slots are
 * created only by dedicated operations, never here.
 *
 * The trigger requires `path_steps` to already link this step to this path;
 * rather than letting the caller discover that as a raised exception, the
 * link is ensured here first.
 *
 * The conflict target is the NAMED constraint: `on conflict (col, …)` takes
 * bare column names that cannot be qualified, and the parameters share the
 * columns' names, which made the column-list form unresolvable (42702).
 */
create or replace function public.upsert_cell(
  path_id uuid,
  layer_id uuid,
  step_id uuid,
  content text
)
returns uuid
language plpgsql security definer
set search_path = public, pg_catalog, pg_temp
as $$
declare
  cell_id uuid;
  next_column int;
begin
  if not public.is_service_account() then
    raise exception 'This account cannot edit the blueprint'
      using errcode = '42501';
  end if;

  if not exists (
    select 1 from public.path_steps ps
    where ps.path_id = upsert_cell.path_id and ps.step_id = upsert_cell.step_id
  ) then
    select coalesce(max(column_position) + 1, 0) into next_column
    from public.path_steps where path_steps.path_id = upsert_cell.path_id;
    insert into public.path_steps (path_id, step_id, column_position)
    values (upsert_cell.path_id, upsert_cell.step_id, next_column);
  end if;

  -- Minted on insert, never on update: a cell's key is its identity for slice
  -- recovery, so renaming a lane must not silently repoint every slice that
  -- referenced the cells in it.
  insert into public.cells (path_id, layer_id, step_id, slot_position, content, origin, cell_key)
  values (upsert_cell.path_id, upsert_cell.layer_id, upsert_cell.step_id, 0,
          coalesce(content, ''), 'app',
          public.mint_cell_key(upsert_cell.path_id, upsert_cell.layer_id,
                               upsert_cell.step_id))
  on conflict on constraint cells_layer_step_slot_unique
    do update set content = excluded.content
  returning id into cell_id;

  return cell_id;
end;
$$;

/** Add or update one dependency between two cells on the same path. */
create or replace function public.set_cell_dependency(
  source_cell_id uuid,
  target_cell_id uuid,
  kind text default 'trigger',
  label text default null,
  note text default null
)
returns uuid
language plpgsql security definer
set search_path = public, pg_catalog, pg_temp
as $$
declare
  dependency_id uuid;
  source_path uuid;
  target_path uuid;
begin
  if not public.is_service_account() then
    raise exception 'This account cannot edit the blueprint'
      using errcode = '42501';
  end if;

  if set_cell_dependency.source_cell_id = set_cell_dependency.target_cell_id then
    raise exception 'A cell cannot depend on itself';
  end if;
  if set_cell_dependency.kind not in ('trigger', 'needs') then
    raise exception 'Unknown dependency kind %', set_cell_dependency.kind;
  end if;

  select c.path_id into source_path from public.cells c
    where c.id = set_cell_dependency.source_cell_id;
  select c.path_id into target_path from public.cells c
    where c.id = set_cell_dependency.target_cell_id;
  if source_path is null or target_path is null then
    raise exception 'Both cells must exist';
  end if;
  -- Arrows are drawn within one path's grid; a cross-path arrow has nowhere
  -- to render and is what validate_ir.py rejects on import.
  if source_path <> target_path then
    raise exception 'Both cells must be in the same path of the journey';
  end if;

  insert into public.cell_triggers (source_cell_id, target_cell_id, kind, label, note)
  values (set_cell_dependency.source_cell_id, set_cell_dependency.target_cell_id,
          set_cell_dependency.kind,
          nullif(trim(set_cell_dependency.label), ''),
          nullif(trim(set_cell_dependency.note), ''))
  on conflict on constraint cell_triggers_source_target_kind_unique
    do update set label = excluded.label, note = excluded.note
  returning id into dependency_id;

  return dependency_id;
end;
$$;

create or replace function public.clear_cell_dependency(dependency_id uuid)
returns void
language plpgsql security definer
set search_path = public, pg_catalog, pg_temp
as $$
begin
  if not public.is_service_account() then
    raise exception 'This account cannot edit the blueprint'
      using errcode = '42501';
  end if;

  delete from public.cell_triggers where id = dependency_id;
end;
$$;

-- ---------------------------------------------------------------------------
-- Paths
-- ---------------------------------------------------------------------------

/** A new, empty path: lanes and columns copied, no cells. */
create or replace function public.create_path(
  scenario_id uuid,
  name text,
  path_type text default 'alternative',
  lane_source_path_id uuid default null
)
returns uuid
language plpgsql security definer
set search_path = public, pg_catalog, pg_temp
as $$
declare
  new_path_id uuid;
  source_path_id uuid;
begin
  if not public.is_service_account() then
    raise exception 'This account cannot edit the blueprint'
      using errcode = '42501';
  end if;

  source_path_id := coalesce(
    lane_source_path_id,
    (select id from public.paths where service_scenario_id = scenario_id order by created_at limit 1)
  );

  insert into public.paths (service_scenario_id, name, path_type, origin)
  values (scenario_id, name, path_type, 'app')
  returning id into new_path_id;

  insert into public.layers (path_id, name, layer_role, row_position, origin)
  select new_path_id, l.name, l.layer_role, l.row_position, 'app'
  from public.layers l where l.path_id = source_path_id;

  insert into public.path_steps (path_id, step_id, column_position)
  select new_path_id, ps.step_id, ps.column_position
  from public.path_steps ps where ps.path_id = source_path_id;

  return new_path_id;
end;
$$;

/**
 * Copy a whole path, cells and arrows included — slot-aware.
 *
 * An explicit old-lane-id → new-lane-id map makes the arrow remap exact:
 * matching lanes by name cannot build an id map and is ambiguous for a path
 * carrying two same-named lanes. The cell copy carries `slot_position`, and
 * the arrow remap joins on (path, layer, step, slot) — the cell's actual
 * identity — so a multi-cell slot neither collides on insert nor fans one
 * arrow out into a copy per sibling.
 *
 * Lanes carry `owner_team`, `kpis` and `tools` across (a copied lane that
 * forgot its owner reads as an unowned lane), and the path's own
 * `description` and `note` are copied too. `cell_key` is NOT copied — keys
 * are authored (see cell_natural_key).
 */
create or replace function public.duplicate_path(
  source_path_id uuid,
  name text,
  path_type text default 'alternative',
  copy_cells boolean default true,
  copy_dependencies boolean default true
)
returns uuid
language plpgsql security definer
set search_path = public, pg_catalog, pg_temp
as $$
declare
  scenario_id uuid;
  new_path_id uuid;
  -- old lane id → new lane id, as jsonb rather than a temp table: this runs
  -- inside one PostgREST statement and a temp table would outlive it.
  layer_map jsonb := '{}'::jsonb;
  src_lane record;
  new_lane_id uuid;
begin
  if not public.is_service_account() then
    raise exception 'This account cannot edit the blueprint'
      using errcode = '42501';
  end if;

  select p.service_scenario_id into scenario_id
  from public.paths p
  where p.id = duplicate_path.source_path_id;

  if scenario_id is null then
    raise exception 'Unknown path';
  end if;

  insert into public.paths
    (service_scenario_id, name, path_type, description, note, origin)
  select scenario_id, duplicate_path.name, duplicate_path.path_type,
         p.description, p.note, 'app'
  from public.paths p
  where p.id = duplicate_path.source_path_id
  returning id into new_path_id;

  -- Lanes first, then path_steps, then cells: the order the
  -- `cells_validate_path_match` trigger requires.
  for src_lane in
    select l.id, l.name, l.layer_role, l.row_position,
           l.owner_team, l.kpis, l.tools
    from public.layers l
    where l.path_id = duplicate_path.source_path_id
    order by l.row_position
  loop
    insert into public.layers
      (path_id, name, layer_role, row_position, owner_team, kpis, tools, origin)
    values (new_path_id, src_lane.name, src_lane.layer_role,
            src_lane.row_position, src_lane.owner_team, src_lane.kpis,
            src_lane.tools, 'app')
    returning id into new_lane_id;
    layer_map := layer_map || jsonb_build_object(src_lane.id::text, new_lane_id);
  end loop;

  -- Columns are scenario-scoped, so the copy points at the very same `steps`
  -- rows in the same order — exactly as the source does.
  insert into public.path_steps (path_id, step_id, column_position)
  select new_path_id, ps.step_id, ps.column_position
  from public.path_steps ps
  where ps.path_id = duplicate_path.source_path_id;

  if copy_cells then
    insert into public.cells
      (path_id, layer_id, step_id, slot_position, content, description,
       picture, links, function, form, value_props, owner, perceived_owner,
       origin)
    select new_path_id,
           (layer_map ->> c.layer_id::text)::uuid,
           c.step_id, c.slot_position, c.content, c.description,
           c.picture, c.links, c.function, c.form, c.value_props,
           c.owner, c.perceived_owner, 'app'
    from public.cells c
    where c.path_id = duplicate_path.source_path_id;

    if copy_dependencies then
      -- The join is (path, layer, step, slot). The slot term is what stops a
      -- multi-cell slot from fanning one arrow out into a copy per sibling.
      insert into public.cell_triggers
        (source_cell_id, target_cell_id, kind, label, note)
      select ns.id, nt.id, t.kind, t.label, t.note
      from public.cell_triggers t
      join public.cells os
        on os.id = t.source_cell_id
       and os.path_id = duplicate_path.source_path_id
      join public.cells ot
        on ot.id = t.target_cell_id
       and ot.path_id = duplicate_path.source_path_id
      join public.cells ns
        on ns.path_id = new_path_id
       and ns.layer_id = (layer_map ->> os.layer_id::text)::uuid
       and ns.step_id = os.step_id
       and ns.slot_position is not distinct from os.slot_position
      join public.cells nt
        on nt.path_id = new_path_id
       and nt.layer_id = (layer_map ->> ot.layer_id::text)::uuid
       and nt.step_id = ot.step_id
       and nt.slot_position is not distinct from ot.slot_position
      on conflict do nothing;
    end if;
  end if;

  return new_path_id;
end;
$$;

-- ---------------------------------------------------------------------------
-- Renames — deliberately their own operations rather than a generic update:
-- an RPC that can only change a name cannot be talked into changing anything
-- else. Names trimmed and required; duplicates within the same parent refused
-- with a message a person can act on.
-- ---------------------------------------------------------------------------

create or replace function public.rename_phase(phase_id uuid, new_name text)
returns void
language plpgsql security definer
set search_path = public, pg_catalog, pg_temp
as $$
begin
  if not public.is_service_account() then
    raise exception 'This account cannot edit the blueprint'
      using errcode = '42501';
  end if;

  if coalesce(trim(new_name), '') = '' then
    raise exception 'A phase needs a name';
  end if;

  if exists (
    select 1 from public.phases p
    where p.service_lifecycle_id = (
        select service_lifecycle_id from public.phases where id = phase_id
      )
      and p.id <> phase_id
      and lower(trim(p.name)) = lower(trim(new_name))
  ) then
    raise exception 'This service already has a phase called %', trim(new_name);
  end if;

  update public.phases set name = trim(new_name) where id = phase_id;
  if not found then
    raise exception 'Unknown phase';
  end if;
end;
$$;

create or replace function public.rename_scenario(scenario_id uuid, new_name text)
returns void
language plpgsql security definer
set search_path = public, pg_catalog, pg_temp
as $$
begin
  if not public.is_service_account() then
    raise exception 'This account cannot edit the blueprint'
      using errcode = '42501';
  end if;

  if coalesce(trim(new_name), '') = '' then
    raise exception 'A scenario needs a name';
  end if;

  if exists (
    select 1 from public.service_scenarios s
    where s.phase_id = (
        select phase_id from public.service_scenarios where id = scenario_id
      )
      and s.id <> scenario_id
      and lower(trim(s.name)) = lower(trim(new_name))
  ) then
    raise exception 'This phase already has a scenario called %', trim(new_name);
  end if;

  update public.service_scenarios set name = trim(new_name)
  where id = scenario_id;
  if not found then
    raise exception 'Unknown scenario';
  end if;
end;
$$;

create or replace function public.rename_path(path_id uuid, new_name text)
returns void
language plpgsql security definer
set search_path = public, pg_catalog, pg_temp
as $$
begin
  if not public.is_service_account() then
    raise exception 'This account cannot edit the blueprint'
      using errcode = '42501';
  end if;

  if coalesce(trim(new_name), '') = '' then
    raise exception 'A path needs a name';
  end if;

  if exists (
    select 1 from public.paths p
    where p.service_scenario_id = (
        select service_scenario_id from public.paths where id = path_id
      )
      and p.id <> path_id
      and lower(trim(p.name)) = lower(trim(new_name))
  ) then
    raise exception 'This scenario already has a path called %', trim(new_name);
  end if;

  update public.paths set name = trim(new_name) where id = path_id;
  if not found then
    raise exception 'Unknown path';
  end if;
end;
$$;

/**
 * Rename an owner tag everywhere it appears, atomically.
 *
 * Two independent client-side UPDATEs (owner, then perceived_owner) can fail
 * between them and split the vocabulary in half — the exact drift the tag
 * dropdown exists to prevent. Returns the ids of every cell touched so a
 * session log can record an id-precise revert instead of a name-based bulk
 * update that would also rewrite cells legitimately carrying the new name.
 */
create or replace function public.rename_owner_tag(
  from_name text,
  to_name text
)
returns uuid[]
language plpgsql security definer
set search_path = public, pg_catalog, pg_temp
as $$
declare
  affected uuid[];
begin
  if not public.is_service_account() then
    raise exception 'This account cannot edit the blueprint'
      using errcode = '42501';
  end if;

  if coalesce(trim(from_name), '') = '' or coalesce(trim(to_name), '') = '' then
    raise exception 'Both the current and the new tag name are required.';
  end if;
  if trim(from_name) = trim(to_name) then
    raise exception 'The new name is the same as the current one.';
  end if;

  select coalesce(array_agg(id), '{}') into affected
  from public.cells
  where owner = from_name or perceived_owner = from_name;

  update public.cells set owner = trim(to_name) where owner = from_name;
  update public.cells
     set perceived_owner = trim(to_name)
   where perceived_owner = from_name;

  return affected;
end;
$$;

-- ---------------------------------------------------------------------------
-- Deletion — archive first, always. The archive write and the cascade are
-- one transaction: nothing is destroyed without a payload behind it, ever.
-- ---------------------------------------------------------------------------

/** Delete a scenario, archiving everything first. */
create or replace function public.delete_scenario(scenario_id uuid)
returns uuid
language plpgsql security definer
set search_path = public, pg_catalog, pg_temp
as $$
declare
  archive_id uuid;
  impact jsonb;
  payload jsonb;
begin
  if not public.is_service_account() then
    raise exception 'This account cannot edit the blueprint'
      using errcode = '42501';
  end if;

  impact := public.deletion_impact('scenario', scenario_id);

  select jsonb_build_object(
    'scenario', to_jsonb(sc),
    'paths', (select coalesce(jsonb_agg(to_jsonb(p)), '[]'::jsonb)
              from public.paths p where p.service_scenario_id = sc.id),
    'steps', (select coalesce(jsonb_agg(to_jsonb(s)), '[]'::jsonb)
              from public.steps s where s.service_scenario_id = sc.id),
    'path_steps', (select coalesce(jsonb_agg(to_jsonb(ps)), '[]'::jsonb)
                   from public.path_steps ps
                   join public.paths p on p.id = ps.path_id
                   where p.service_scenario_id = sc.id),
    'layers', (select coalesce(jsonb_agg(to_jsonb(l)), '[]'::jsonb)
               from public.layers l
               join public.paths p on p.id = l.path_id
               where p.service_scenario_id = sc.id),
    'cells', (select coalesce(jsonb_agg(to_jsonb(c)), '[]'::jsonb)
              from public.cells c
              join public.paths p on p.id = c.path_id
              where p.service_scenario_id = sc.id),
    'dependencies', (select coalesce(jsonb_agg(to_jsonb(t)), '[]'::jsonb)
                     from public.cell_triggers t
                     join public.cells c on c.id = t.source_cell_id
                     join public.paths p on p.id = c.path_id
                     where p.service_scenario_id = sc.id)
  ) into payload
  from public.service_scenarios sc where sc.id = scenario_id;

  if payload is null then
    raise exception 'Unknown blueprint';
  end if;

  insert into public.deleted_structure (kind, label, payload, affected_slices)
  values ('scenario', impact ->> 'label', payload, impact -> 'affected_slices')
  returning id into archive_id;

  delete from public.service_scenarios where id = scenario_id;

  return archive_id;
end;
$$;

/** Delete one path of a journey, archiving it first. */
create or replace function public.delete_path(path_id uuid)
returns uuid
language plpgsql security definer
set search_path = public, pg_catalog, pg_temp
as $$
declare
  archive_id uuid;
  impact jsonb;
  payload jsonb;
begin
  if not public.is_service_account() then
    raise exception 'This account cannot edit the blueprint'
      using errcode = '42501';
  end if;

  if (select count(*) from public.paths p
      where p.service_scenario_id =
        (select service_scenario_id from public.paths where id = path_id)) <= 1 then
    raise exception 'A blueprint needs at least one path — delete the blueprint instead';
  end if;

  impact := public.deletion_impact('path', path_id);

  select jsonb_build_object(
    'path', to_jsonb(p),
    'layers', (select coalesce(jsonb_agg(to_jsonb(l)), '[]'::jsonb)
               from public.layers l where l.path_id = p.id),
    'path_steps', (select coalesce(jsonb_agg(to_jsonb(ps)), '[]'::jsonb)
                   from public.path_steps ps where ps.path_id = p.id),
    'cells', (select coalesce(jsonb_agg(to_jsonb(c)), '[]'::jsonb)
              from public.cells c where c.path_id = p.id),
    'dependencies', (select coalesce(jsonb_agg(to_jsonb(t)), '[]'::jsonb)
                     from public.cell_triggers t
                     join public.cells c on c.id = t.source_cell_id
                     where c.path_id = p.id)
  ) into payload
  from public.paths p where p.id = path_id;

  insert into public.deleted_structure (kind, label, payload, affected_slices)
  values ('path', impact ->> 'label', payload, impact -> 'affected_slices')
  returning id into archive_id;

  delete from public.paths where id = path_id;
  return archive_id;
end;
$$;

/** Delete a column from one path; the step row goes when no path uses it. */
create or replace function public.remove_step(path_id uuid, step_id uuid)
returns uuid
language plpgsql security definer
set search_path = public, pg_catalog, pg_temp
as $$
declare
  archive_id uuid;
  impact jsonb;
  payload jsonb;
begin
  if not public.is_service_account() then
    raise exception 'This account cannot edit the blueprint'
      using errcode = '42501';
  end if;

  impact := public.deletion_impact('step', step_id);

  select jsonb_build_object(
    'step', to_jsonb(s),
    'path_id', remove_step.path_id,
    'cells', (select coalesce(jsonb_agg(to_jsonb(c)), '[]'::jsonb)
              from public.cells c
              where c.step_id = s.id and c.path_id = remove_step.path_id)
  ) into payload
  from public.steps s where s.id = step_id;

  insert into public.deleted_structure (kind, label, payload, affected_slices)
  values ('step', impact ->> 'label', payload, impact -> 'affected_slices')
  returning id into archive_id;

  delete from public.cells
    where cells.step_id = remove_step.step_id and cells.path_id = remove_step.path_id;
  delete from public.path_steps
    where path_steps.step_id = remove_step.step_id and path_steps.path_id = remove_step.path_id;

  -- Orphaned step rows serve nothing; the scenario keeps only columns in use.
  delete from public.steps s
    where s.id = remove_step.step_id
      and not exists (select 1 from public.path_steps ps where ps.step_id = s.id);

  -- Renumber what is left so positions stay contiguous.
  with ordered as (
    select ps.step_id, row_number() over (order by ps.column_position) - 1 as position
    from public.path_steps ps where ps.path_id = remove_step.path_id
  )
  update public.path_steps ps
    set column_position = ordered.position
    from ordered
    where ps.path_id = remove_step.path_id and ps.step_id = ordered.step_id;

  return archive_id;
end;
$$;

/**
 * Delete a lane from EVERY path of its scenario, by name.
 *
 * This is what the delete dialog calls, where the user is naming a lane and
 * means every version of it. Undo of add_lane goes through remove_lanes.
 */
create or replace function public.remove_lane(scenario_id uuid, lane_name text)
returns uuid
language plpgsql security definer
set search_path = public, pg_catalog, pg_temp
as $$
declare
  archive_id uuid;
  affected uuid[];
  payload jsonb;
begin
  if not public.is_service_account() then
    raise exception 'This account cannot edit the blueprint'
      using errcode = '42501';
  end if;

  select array_agg(c.id) into affected
  from public.cells c
  join public.layers l on l.id = c.layer_id
  join public.paths p on p.id = l.path_id
  where p.service_scenario_id = remove_lane.scenario_id and l.name = lane_name;
  affected := coalesce(affected, array[]::uuid[]);

  select jsonb_build_object(
    'scenario_id', remove_lane.scenario_id,
    'lane_name', lane_name,
    'layers', (select coalesce(jsonb_agg(to_jsonb(l)), '[]'::jsonb)
               from public.layers l
               join public.paths p on p.id = l.path_id
               where p.service_scenario_id = remove_lane.scenario_id and l.name = lane_name),
    'cells', (select coalesce(jsonb_agg(to_jsonb(c)), '[]'::jsonb)
              from public.cells c where c.id = any(affected))
  ) into payload;

  insert into public.deleted_structure (kind, label, payload, affected_slices)
  values ('lane', lane_name, payload, public.slices_referencing(affected))
  returning id into archive_id;

  delete from public.layers l
    using public.paths p
    where p.id = l.path_id
      and p.service_scenario_id = remove_lane.scenario_id
      and l.name = lane_name;

  return archive_id;
end;
$$;

/**
 * Delete exactly these lanes, archiving them first.
 *
 * The undo of `add_lane`. Unlike `remove_lane` it matches nothing by name, so
 * a lane renamed since it was added is still the lane this takes back — and a
 * different lane that has since been renamed *into* that name is not.
 */
create or replace function public.remove_lanes(lane_ids uuid[])
returns uuid
language plpgsql security definer
set search_path = public, pg_catalog, pg_temp
as $$
declare
  archive_id uuid;
  affected uuid[];
  payload jsonb;
  label text;
begin
  if not public.is_service_account() then
    raise exception 'This account cannot edit the blueprint'
      using errcode = '42501';
  end if;

  if lane_ids is null or array_length(lane_ids, 1) is null then
    raise exception 'No lanes named';
  end if;

  -- Zero surviving rows is a real answer, and a hard one: the lane is already
  -- gone, so the caller must not be told its undo succeeded.
  if not exists (select 1 from public.layers where id = any(lane_ids)) then
    raise exception 'Those lanes no longer exist';
  end if;

  select min(l.name) into label
  from public.layers l where l.id = any(lane_ids);

  select coalesce(array_agg(c.id), array[]::uuid[]) into affected
  from public.cells c where c.layer_id = any(lane_ids);

  select jsonb_build_object(
    'lane_ids', to_jsonb(lane_ids),
    'lane_name', label,
    'layers', (select coalesce(jsonb_agg(to_jsonb(l)), '[]'::jsonb)
               from public.layers l where l.id = any(lane_ids)),
    'cells', (select coalesce(jsonb_agg(to_jsonb(c)), '[]'::jsonb)
              from public.cells c where c.id = any(affected))
  ) into payload;

  insert into public.deleted_structure (kind, label, payload, affected_slices)
  values ('lane', coalesce(label, 'lane'), payload,
          public.slices_referencing(affected))
  returning id into archive_id;

  delete from public.layers where id = any(lane_ids);

  return archive_id;
end;
$$;

create or replace function public.delete_cell(cell_id uuid)
returns uuid
language plpgsql security definer
set search_path = public, pg_catalog, pg_temp
as $$
declare
  archive_id uuid;
  payload jsonb;
begin
  if not public.is_service_account() then
    raise exception 'This account cannot edit the blueprint'
      using errcode = '42501';
  end if;

  select jsonb_build_object('cell', to_jsonb(c)) into payload
  from public.cells c where c.id = cell_id;
  if payload is null then
    raise exception 'Unknown cell';
  end if;

  insert into public.deleted_structure (kind, label, payload, affected_slices)
  values ('cell', coalesce(public.cell_natural_key(cell_id), 'cell'), payload,
          public.slices_referencing(array[cell_id]))
  returning id into archive_id;

  delete from public.cells where id = cell_id;
  return archive_id;
end;
$$;

-- ---------------------------------------------------------------------------
-- Grants, part 1: the PUBLIC default, revoked.
--
-- This half is portable Postgres and belongs to every backend. Postgres
-- grants EXECUTE to PUBLIC at CREATE time, and these are definer functions
-- that bypass row security: without the revoke, anyone who can reach the
-- database can call delete_scenario. Naming a role instead would leave the
-- PUBLIC grant standing and change nothing.
-- ---------------------------------------------------------------------------

revoke execute on function public.create_scenario(uuid, text, text, uuid, jsonb, int, text) from public;
revoke execute on function public.duplicate_scenario(uuid, text) from public;
revoke execute on function public.create_phase(uuid, text, text) from public;
revoke execute on function public.create_path(uuid, text, text, uuid) from public;
revoke execute on function public.duplicate_path(uuid, text, text, boolean, boolean) from public;
revoke execute on function public.add_step(uuid, text, int) from public;
revoke execute on function public.add_lane(uuid, text, text, int) from public;
revoke execute on function public.reorder_steps(uuid, uuid[]) from public;
revoke execute on function public.set_path_steps(uuid, uuid[]) from public;
revoke execute on function public.reorder_lanes(uuid, text[]) from public;
revoke execute on function public.upsert_cell(uuid, uuid, uuid, text) from public;
revoke execute on function public.set_cell_dependency(uuid, uuid, text, text, text) from public;
revoke execute on function public.clear_cell_dependency(uuid) from public;
revoke execute on function public.rename_phase(uuid, text) from public;
revoke execute on function public.rename_scenario(uuid, text) from public;
revoke execute on function public.rename_path(uuid, text) from public;
revoke execute on function public.rename_owner_tag(text, text) from public;
revoke execute on function public.delete_scenario(uuid) from public;
revoke execute on function public.delete_path(uuid) from public;
revoke execute on function public.remove_step(uuid, uuid) from public;
revoke execute on function public.remove_lane(uuid, text) from public;
revoke execute on function public.remove_lanes(uuid[]) from public;
revoke execute on function public.delete_cell(uuid) from public;

-- ─────────────────────────────────────────────────────────────────────────
-- 20260818002000_service_account_tier.sql
-- ─────────────────────────────────────────────────────────────────────────

-- ═══════════════════════════════════════════════════════════════════════════
-- OPTIONAL RECIPE: the service-account tier.
--
-- Skip or delete this file if every signed-in user of your deployment should
-- be able to edit — the template default. With this migration applied,
-- `authenticated` splits into two tiers:
--
--   * service accounts — edit everything (structure RPCs, spec columns,
--     slices, evidence, storage uploads);
--   * regular accounts — view + any chat/agent surfaces you add, but no
--     blueprint or derived-layer writes.
--
-- anon is untouched: the deployed site stays read-only either way.
--
-- Consolidated from a proving-ground deployment (the tier, its RPC
-- enforcement, and the advisor hardening that followed), PARAMETERIZED:
-- no hard-coded account emails — membership comes from the
-- `service_account_emails` config table below and/or app_metadata you set
-- yourself.
--
-- HOW THE TIER IS CARRIED (the app_metadata convention):
--   A session is a service account when its JWT carries
--     app_metadata.role = 'service'
--   app_metadata is written via auth.users.raw_app_meta_data — settable only
--   with the service role or the dashboard. Users cannot self-assign it
--   (user_metadata is ignored on purpose: users CAN write that).
--
-- HOW TO ENROLL ACCOUNTS (two adopter-configurable paths):
--   1. Future sign-ups: insert your editors' emails into
--      public.service_account_emails (service-role only); the trigger below
--      stamps the role at account creation.
--        insert into public.service_account_emails (email)
--        values ('you@example.com');
--   2. Existing accounts: stamp them directly (service role / SQL editor):
--        update auth.users
--        set raw_app_meta_data = coalesce(raw_app_meta_data, '{}'::jsonb)
--          || '{"role":"service"}'::jsonb
--        where email = 'you@example.com';
--
-- TWO ENFORCEMENT LAYERS, both required:
--   * RESTRICTIVE policies (below) AND with the existing permissive ones and
--     gate DIRECT table writes by authenticated sessions.
--   * The write RPCs are SECURITY DEFINER and owned by a role that bypasses
--     RLS, so RESTRICTIVE policies NEVER run for them. Each RPC asserts
--     public.is_service_account() in its own body (20260818001000) — the
--     only place it can be asserted for a definer function. This migration
--     merely swaps the seam's implementation from "always true" to the JWT
--     read; the asserts are already there.
-- ═══════════════════════════════════════════════════════════════════════════

-- a plain table. What stamps rows from it is the recipe's business.
create table if not exists public.service_account_emails (
  email text primary key,
  note text,
  created_at timestamptz not null default now()
);

comment on table public.service_account_emails is
  'Adopter-configured allowlist: accounts created with these emails are stamped app_metadata.role=service by the flag_service_accounts trigger. Operator-only (service role). Existing accounts are stamped directly on auth.users — see the header of this migration.';

-- ─────────────────────────────────────────────────────────────────────────
-- 20260819000000_agent_surface.sql
-- ─────────────────────────────────────────────────────────────────────────

-- ═══════════════════════════════════════════════════════════════════════════
-- Agent surface: chat persistence + the findings write path for in-app runs.
--
-- 1. agent_sessions / agent_messages — the in-app agent panel's transcript
--    store, PER USER: every session row carries created_by (defaulted to
--    auth.uid() so the app never sets it) and the policies scope both tables
--    to the owning user. Reachable only by the authenticated role; anon
--    deployments never see the agent surface and every persistence call
--    degrades quietly to localStorage. Payload rows are the panel's
--    TranscriptEvent JSON, append-only per (session, seq). seq is bigint
--    because the app writes a per-boot epoch base (Date.now()*1000 + index)
--    so two tabs on one session land in disjoint ranges instead of upserting
--    over each other's rows.
--
-- 2. findings grants — the derived-layer migration revoked authenticated
--    INSERT on findings ("skills write via service key"). The in-app agent's
--    record_finding tool writes through the signed-in session, so the grant
--    comes back here in the same hardened form as the authoring foundation:
--    insert-as-open only, update narrowed to the columns record-finding
--    actually touches. The tier recipe's RESTRICTIVE *_service_only policies
--    from 20260818002000 still AND with these where applied.
-- ═══════════════════════════════════════════════════════════════════════════

create table public.agent_sessions (
  id uuid primary key,
  title text not null default 'New session',
  created_by uuid not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.agent_sessions is
  'One in-app agent conversation (the agent panel''s session list). Owned by created_by; RLS keeps transcripts per-user.';

create table public.agent_messages (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.agent_sessions (id) on delete cascade,
  seq bigint not null,
  kind text not null check (kind in ('user', 'assistant', 'tool', 'status')),
  payload jsonb not null,
  created_at timestamptz not null default now(),
  unique (session_id, seq)
);

comment on table public.agent_messages is
  'Transcript events of an agent session, ordered by seq. Payload mirrors the app''s TranscriptEvent.';

create index agent_messages_session_idx
  on public.agent_messages (session_id, seq);

-- ─────────────────────────────────────────────────────────────────────────
-- 21000101000000_schema_version_is_a_table.sql
-- ─────────────────────────────────────────────────────────────────────────

-- The schema says what version it is, in the database, where a target can be
-- asked. Written 2026-08-25; the version number is a band allocation.
--
-- `references/adapter-contract.md` § 2 requires that a target carry the
-- template schema "at a compatible schema_version". The value existed in the
-- IR and in blueprint-workspace.json and NOWHERE IN THE DATABASE, so the
-- compatibility clause compared a file against a file. A live target could not
-- be interrogated at all — the one thing the clause is about.
--
-- This is PORTABLE CORE, not Supabase recipe. Every backend answers the same
-- question the same way, which is the whole point of asking it: an adapter
-- that cannot say what schema it carries cannot be checked against an IR.
--
-- One row, enforced. A history table was the alternative and is a different
-- feature: "what has been applied" is what supabase_migrations.schema_migrations
-- already answers, and it answers it per-migration. This answers "what shape am
-- I", which has exactly one current value.

create table public.schema_version (
  singleton boolean primary key default true,
  version text not null,
  applied_at timestamptz not null default now(),
  constraint schema_version_is_singleton check (singleton),
  constraint schema_version_format check (version ~ '^\d{4}\.\d{2}\.\d{2}$')
);

comment on table public.schema_version is
  'The template schema version this database carries. Exactly one row. Read by the adapter contract''s compatibility check (references/adapter-contract.md § 2); bumped by the migration that changes the shape.';
comment on column public.schema_version.version is
  'Date-stamped template schema version, e.g. 2026.07.16 — the same value an IR carries in its schema_version field.';

-- The shape as it stands before the vocabulary migrations in this band.
insert into public.schema_version (version) values ('2026.07.16');

-- ─────────────────────────────────────────────────────────────────────────
-- 21000102000000_a_rewriter_for_function_bodies.sql
-- ─────────────────────────────────────────────────────────────────────────

-- A rewriter for function bodies, used by the seven vocabulary migrations that
-- follow it. Written 2026-08-25; the version number is a band allocation.
--
-- THE TRAP THIS EXISTS FOR: `alter table ... rename` moves the table and none
-- of the plpgsql that names it. Function bodies are stored as text and
-- resolved at call time, so a renamed table or column leaves every function
-- naming it DEPLOYABLE AND BROKEN until something calls it. This database has
-- 32 of them, including `mint_cell_key` — the write path for every cell, from
-- the panel editor and the agent alike. An assertion against
-- information_schema.columns cannot see inside a function body, so the obvious
-- check passes while the writes are landmines.
--
-- The second trap is in the repair. Postgres refuses to rename an input
-- parameter through CREATE OR REPLACE, so a function whose SIGNATURE changes
-- has to be dropped and recreated — and a recreated function comes back with
-- Postgres's default EXECUTE granted to PUBLIC, wider than it was. Capturing
-- the old ACL and re-granting it is not enough: the repair has to REVOKE what
-- the original had revoked, not only grant what it had granted. Upstream this
-- widened four ACLs on two SECURITY DEFINER writes before anyone noticed.
--
-- Both are handled once, here, instead of seven times by hand.
--
-- The expected count is asserted rather than reported. A sweep that silently
-- rewrites fewer bodies than the migration author counted is the landmine
-- again, shipped by a green migration.
--
-- Dropped by the last migration in this series: it is scaffolding for one
-- vocabulary change, not a permanent part of the schema.

create or replace function public.__rewrite_function_bodies(
  patterns text[],
  replacements text[],
  expected integer
) returns integer
language plpgsql
as $rewriter$
declare
  target record;
  before text;
  after text;
  after_args text;
  grantee text;
  entry text;
  i integer;
  rewritten integer := 0;
begin
  if array_length(patterns, 1) is distinct from array_length(replacements, 1) then
    raise exception 'patterns and replacements must be the same length';
  end if;

  for target in
    select p.oid,
           p.proname,
           pg_get_function_identity_arguments(p.oid) as identity_args,
           pg_get_function_arguments(p.oid) as args,
           p.proacl::text[] as acl
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.prokind = 'f'
      and p.proname not like '\_\_%'
    order by p.proname
  loop
    before := pg_get_functiondef(target.oid);
    after := before;
    after_args := target.args;

    for i in 1 .. array_length(patterns, 1) loop
      after := regexp_replace(after, patterns[i], replacements[i], 'g');
      after_args := regexp_replace(after_args, patterns[i], replacements[i], 'g');
    end loop;

    if after = before then
      continue;
    end if;

    if after_args is distinct from target.args then
      execute format('drop function public.%I(%s)', target.proname, target.identity_args);
      execute after;

      -- pg_get_function_identity_arguments is types only, so it still names
      -- the recreated function.
      if target.acl is not null then
        -- It had an explicit ACL, which the drop threw away and the recreate
        -- replaced with Postgres's default grant to PUBLIC.
        execute format('revoke execute on function public.%I(%s) from public',
                       target.proname, target.identity_args);
        foreach entry in array target.acl loop
          grantee := split_part(entry, '=', 1);
          if grantee = '' then
            execute format('grant execute on function public.%I(%s) to public',
                           target.proname, target.identity_args);
          else
            execute format('grant execute on function public.%I(%s) to %I',
                           target.proname, target.identity_args, grantee);
          end if;
        end loop;
      end if;
    else
      execute after;
    end if;

    rewritten := rewritten + 1;
  end loop;

  if rewritten <> expected then
    raise exception
      'expected % function bodies to change, rewrote % — the sweep and the migration disagree',
      expected, rewritten;
  end if;

  return rewritten;
end;
$rewriter$;

comment on function public.__rewrite_function_bodies(text[], text[], integer) is
  'Scaffolding for the lane-vocabulary rename. Rewrites plpgsql bodies that a table or column rename left naming the old identifier, restoring ACLs when the signature change forces a drop. Dropped by the migration that ends the series.';

revoke execute on function public.__rewrite_function_bodies(text[], text[], integer) from public;

-- ---------------------------------------------------------------------------
-- The second thing a rename does not move: everything hanging off the table.
--
-- `alter table ... rename to` renames the table and leaves its constraints,
-- indexes, policies and triggers carrying the old word forever. Upstream
-- renamed eleven by hand on one table, plus two more on `cells` that named the
-- old COLUMN. Hand-listing them is how you miss the ones a later migration
-- created — this schema builds its RESTRICTIVE write policies in a loop over a
-- table array, so their names exist nowhere in the source as literals.
--
-- Reading the catalog instead cannot miss them. Constraints go first: renaming
-- a unique or primary-key constraint renames the index behind it, so the index
-- pass would otherwise find a name that is already correct.
-- ---------------------------------------------------------------------------

create or replace function public.__rename_schema_objects(
  old_word text,
  new_word text
) returns integer
language plpgsql
as $renamer$
declare
  target record;
  renamed integer := 0;
begin
  for target in
    select con.conname as name, cls.relname as rel
    from pg_constraint con
    join pg_class cls on cls.oid = con.conrelid
    join pg_namespace nsp on nsp.oid = cls.relnamespace
    where nsp.nspname = 'public' and strpos(con.conname, old_word) > 0
    order by con.conname
  loop
    execute format('alter table public.%I rename constraint %I to %I',
                   target.rel, target.name, replace(target.name, old_word, new_word));
    renamed := renamed + 1;
  end loop;

  for target in
    select idx.relname as name
    from pg_class idx
    join pg_namespace nsp on nsp.oid = idx.relnamespace
    where nsp.nspname = 'public' and idx.relkind = 'i'
      and strpos(idx.relname, old_word) > 0
      and not exists (select 1 from pg_constraint con where con.conindid = idx.oid)
    order by idx.relname
  loop
    execute format('alter index public.%I rename to %I',
                   target.name, replace(target.name, old_word, new_word));
    renamed := renamed + 1;
  end loop;

  for target in
    select pol.polname as name, cls.relname as rel
    from pg_policy pol
    join pg_class cls on cls.oid = pol.polrelid
    join pg_namespace nsp on nsp.oid = cls.relnamespace
    where nsp.nspname = 'public' and strpos(pol.polname, old_word) > 0
    order by pol.polname
  loop
    execute format('alter policy %I on public.%I rename to %I',
                   target.name, target.rel, replace(target.name, old_word, new_word));
    renamed := renamed + 1;
  end loop;

  for target in
    select tg.tgname as name, cls.relname as rel
    from pg_trigger tg
    join pg_class cls on cls.oid = tg.tgrelid
    join pg_namespace nsp on nsp.oid = cls.relnamespace
    where nsp.nspname = 'public' and not tg.tgisinternal
      and strpos(tg.tgname, old_word) > 0
    order by tg.tgname
  loop
    execute format('alter trigger %I on public.%I rename to %I',
                   target.name, target.rel, replace(target.name, old_word, new_word));
    renamed := renamed + 1;
  end loop;

  raise notice 'renamed % objects carrying %', renamed, old_word;
  return renamed;
end;
$renamer$;

revoke execute on function public.__rename_schema_objects(text, text) from public;

-- ---------------------------------------------------------------------------
-- The post-condition, which is the check the counting never was.
--
-- An assertion against information_schema.columns cannot see inside a function
-- body, so it passes while the writes are broken. This looks everywhere the old
-- word can still be hiding — table and column names, constraint, index, policy
-- and trigger names, and every plpgsql body — and names what it found.
-- ---------------------------------------------------------------------------

create or replace function public.__assert_vocabulary_gone(
  stems text[],
  identifiers text[],
  kept_columns text[] default '{}'
) returns void
language plpgsql
as $assert$
declare
  stem text;
  identifier text;
  found text[] := '{}';
begin
  foreach stem in array stems loop
    found := found || array(
      select 'table ' || cls.relname
      from pg_class cls join pg_namespace nsp on nsp.oid = cls.relnamespace
      where nsp.nspname = 'public' and cls.relkind in ('r', 'v', 'm')
        and strpos(cls.relname, stem) > 0);
    found := found || array(
      select 'constraint ' || con.conname
      from pg_constraint con join pg_namespace nsp on nsp.oid = con.connamespace
      where nsp.nspname = 'public' and strpos(con.conname, stem) > 0);
    found := found || array(
      select 'index ' || idx.relname
      from pg_class idx join pg_namespace nsp on nsp.oid = idx.relnamespace
      where nsp.nspname = 'public' and idx.relkind = 'i'
        and strpos(idx.relname, stem) > 0);
    found := found || array(
      select 'policy ' || pol.polname
      from pg_policy pol
      join pg_class cls on cls.oid = pol.polrelid
      join pg_namespace nsp on nsp.oid = cls.relnamespace
      where nsp.nspname = 'public' and strpos(pol.polname, stem) > 0);
    found := found || array(
      select 'trigger ' || tg.tgname
      from pg_trigger tg
      join pg_class cls on cls.oid = tg.tgrelid
      join pg_namespace nsp on nsp.oid = cls.relnamespace
      where nsp.nspname = 'public' and not tg.tgisinternal
        and strpos(tg.tgname, stem) > 0);
  end loop;

  foreach identifier in array identifiers loop
    found := found || array(
      select 'column ' || cls.relname || '.' || att.attname
      from pg_attribute att
      join pg_class cls on cls.oid = att.attrelid
      join pg_namespace nsp on nsp.oid = cls.relnamespace
      where nsp.nspname = 'public' and cls.relkind = 'r'
        and att.attnum > 0 and not att.attisdropped
        and att.attname = identifier
        and not (cls.relname || '.' || att.attname = any(kept_columns)));
    found := found || array(
      select 'function ' || pro.proname
      from pg_proc pro join pg_namespace nsp on nsp.oid = pro.pronamespace
      where nsp.nspname = 'public' and pro.prokind = 'f'
        and pro.proname not like '\_\_%'
        and pg_get_functiondef(pro.oid) ~ ('\m' || identifier || '\M'));
  end loop;

  if array_length(found, 1) > 0 then
    raise exception 'the old vocabulary is still here: %', array_to_string(found, ', ');
  end if;
end;
$assert$;

revoke execute on function public.__assert_vocabulary_gone(text[], text[], text[]) from public;

-- ─────────────────────────────────────────────────────────────────────────
-- 21000103000000_cell_triggers_are_cell_dependencies.sql
-- ─────────────────────────────────────────────────────────────────────────

-- cell_triggers → cell_dependencies. Written 2026-08-25.
--
-- Everything except the table already said dependency:
--
--   public.set_cell_dependency · public.clear_cell_dependency   the RPCs
--   'dependency_count'                                          deletion_impact
--   copy_dependencies                                           duplicate_path
--
-- WHAT DOES NOT CHANGE: the `kind` column keeps ('trigger', 'needs').
-- "trigger" there is not the container — it is one of two KINDS of dependency,
-- temporal ("sets this off") against functional ("must exist first"). Renaming
-- it would give kind in ('dependency', 'needs'), which is incoherent: `needs`
-- is a dependency too. A genus cannot also be one of its own species.
--
-- The FK constraint names are the load-bearing ones. PostgREST embed hints
-- name them as STRINGS, where nothing type-checks them on either side.

alter table public.cell_triggers rename to cell_dependencies;

select public.__rename_schema_objects('cell_triggers', 'cell_dependencies');

-- `cell_triggers` is an unambiguous identifier, so a word-boundary sweep is
-- safe here in a way it is not for `description`.
select public.__rewrite_function_bodies(
  array['\mcell_triggers\M'],
  array['cell_dependencies'],
  7
);

comment on table public.cell_dependencies is
  'Dependency from one cell to another. kind: trigger (temporal) | needs (functional).';

select public.__assert_vocabulary_gone(
  array['cell_trigger'],
  array['cell_triggers']
);

-- ─────────────────────────────────────────────────────────────────────────
-- 21000104000000_layers_are_lanes.sql
-- ─────────────────────────────────────────────────────────────────────────

-- layers → lanes, and the two columns that carried the word. Written 2026-08-25.
--
-- The package was already half-renamed and contradicting itself in one
-- statement: `create or replace function public.add_lane` inserts into
-- `public.layers`. The rulebook this package ships — lane-roles.md,
-- data-model.md — is 100% the new vocabulary, so the canvas agent is taught a
-- schema its own backend does not have.
--
-- `CanvasAnnotationLayer` in the frontend is a RENDERING layer and is not
-- touched by any of this: four occurrences, one identifier, unrelated concept.
--
-- The dependent objects are renamed from the catalog rather than by hand. The
-- RESTRICTIVE write policies are built in a loop over a table array, so their
-- names appear nowhere in the source as literals and a hand-written list
-- misses them.

alter table public.layers rename to lanes;
alter table public.lanes  rename column layer_role to lane_role;
alter table public.cells  rename column layer_id   to lane_id;

select public.__rename_schema_objects('layer', 'lane');

-- `cells_layer_step_slot_unique` is named INSIDE upsert_cell's body, as the
-- conflict target. It has no word boundary at `layer`, so it needs its own
-- pattern and has to come before the shorter ones.
select public.__rewrite_function_bodies(
  array[
    '\mcells_layer_step_slot_unique\M',
    '\mlayers\M',
    '\mlayer_id\M',
    '\mlayer_role\M',
    '\mlayer_path\M',
    '\mlayer_map\M'
  ],
  array[
    'cells_lane_step_slot_unique',
    'lanes',
    'lane_id',
    'lane_role',
    'lane_path',
    'lane_map'
  ],
  14
);

-- Comments are attached to the object and survive a rename. Their TEXT does
-- not, and this one is what an adopter reads first.
comment on table public.lanes is 'Blueprint row (swimlane) within a path';
comment on column public.lanes.lane_role is
  'Semantic role key that drives rendering (pill cells, visual rows, divider-line anchoring); the display name stays in lanes.name and is free-form in any language. Canonical values: customer_actions, frontstage_actions, backstage_actions, frontstage_tech, backstage_tech, support_systems, visual, step_visual. The vocabulary is extensible — org-defined custom roles are allowed and render as generic swimlanes. Null = generic swimlane (e.g. actor lanes).';
comment on table public.cells is 'Content at lane × step intersection';
comment on column public.cells.cell_key is
  'Authored key: service/scenario/path/lane/step. Written by the import pipeline for origin=import, minted by upsert_cell for origin=app. Survives re-import; slice_items.cell_keys matches against it.';

select public.__assert_vocabulary_gone(
  array['layer'],
  array['layers', 'layer_id', 'layer_role', 'layer_path', 'layer_map']
);

-- ─────────────────────────────────────────────────────────────────────────
-- 21000105000000_position_columns_one_name.sql
-- ─────────────────────────────────────────────────────────────────────────

-- Every ordered table calls its ordering column `position`. Written 2026-08-25.
--
--   lanes.row_position               → lanes.position
--   path_steps.column_position       → path_steps.position
--   cells.slot_position              → cells.position
--   phases.order_position            → phases.position
--   service_scenarios.order_position → service_scenarios.position
--   add_lane(at_row)                 → add_lane(at_position)
--
-- `row` and `column` name how a lane and a step happen to be DRAWN today. The
-- compare view already draws the same lanes in a different geometry, so the
-- axis is a rendering fact and not a domain one. `order_` and `slot_` were
-- noise in front of the same idea.
--
-- Plain `position` rather than `lane_position`: `slices.position` and
-- `slice_items.position` already spell it that way, so this makes every
-- ordered table agree instead of inventing a sixth spelling. `position` is not
-- reserved in Postgres — those two columns have worked since they shipped.
--
-- `at_row` fed row_position and named the same rendering. add_step already
-- takes `at_position`.
--
-- Index and constraint names are left alone: `cells_lane_step_slot_unique` and
-- `path_steps_path_column_unique` describe the join they enforce, and renaming
-- them would churn a PostgREST-visible string for no reader's benefit.

alter table public.lanes             rename column row_position    to position;
alter table public.path_steps        rename column column_position to position;
alter table public.cells             rename column slot_position   to position;
alter table public.phases            rename column order_position  to position;
alter table public.service_scenarios rename column order_position  to position;

select public.__rewrite_function_bodies(
  array[
    '\mrow_position\M',
    '\mcolumn_position\M',
    '\mslot_position\M',
    '\morder_position\M',
    '\mat_row\M'
  ],
  array['position', 'position', 'position', 'position', 'at_position'],
  12
);

comment on column public.path_steps.position is 'Blueprint column index for this step on this path';

select public.__assert_vocabulary_gone(
  array[]::text[],
  array['row_position', 'column_position', 'slot_position', 'order_position', 'at_row']
);

-- ─────────────────────────────────────────────────────────────────────────
-- 21000106000000_service_lifecycles_are_services.sql
-- ─────────────────────────────────────────────────────────────────────────

-- service_lifecycles → services. Written 2026-08-25.
--
-- The table holds one service. "Lifecycle" was the journey THROUGH it, which
-- is what phases already are, so the name described the children.
--
-- `public.services` was a different table once — an unused catalog dropped by
-- the consolidated template schema, seven migrations before this one. Nothing
-- reuses its shape; the name is simply free.
--
-- The rename runs in two passes because two different spellings carry the same
-- idea, and the longer one has to go first or `service_lifecycle` becomes
-- `service_service`.

alter table public.service_lifecycles rename to services;

alter table public.phases       rename column service_lifecycle_id to service_id;
alter table public.slices       rename column service_lifecycle_id to service_id;
alter table public.findings     rename column service_lifecycle_id to service_id;
alter table public.evidence     rename column service_lifecycle_id to service_id;
alter table public.propositions rename column service_lifecycle_id to service_id;

select public.__rename_schema_objects('service_lifecycle', 'service');
select public.__rename_schema_objects('lifecycle', 'service');

select public.__rewrite_function_bodies(
  array['\mservice_lifecycles\M', '\mservice_lifecycle_id\M', '\mlifecycle_id\M'],
  array['services', 'service_id', 'service_id'],
  3
);

comment on table public.services is 'The service this blueprint describes, end to end';

select public.__assert_vocabulary_gone(
  array['lifecycle'],
  array['service_lifecycles', 'service_lifecycle_id', 'lifecycle_id']
);

-- ─────────────────────────────────────────────────────────────────────────
-- 21000107000000_service_scenarios_are_scenarios.sql
-- ─────────────────────────────────────────────────────────────────────────

-- service_scenarios → scenarios. Written 2026-08-25.
--
-- `service_` prefixed a table that lives two levels below the service, under a
-- phase. Every RPC that touches one already drops it: create_scenario,
-- duplicate_scenario, rename_scenario, delete_scenario, and the
-- `scenario_id` parameter on six more.

alter table public.service_scenarios rename to scenarios;

alter table public.paths rename column service_scenario_id to scenario_id;
alter table public.steps rename column service_scenario_id to scenario_id;

select public.__rename_schema_objects('service_scenario', 'scenario');

select public.__rewrite_function_bodies(
  array['\mservice_scenarios\M', '\mservice_scenario_id\M'],
  array['scenarios', 'scenario_id'],
  14
);

comment on table public.scenarios is 'Scenario within a phase';
comment on column public.steps.scenario_id is 'Scenario that owns this canonical step';

select public.__assert_vocabulary_gone(
  array['service_scenario'],
  array['service_scenarios', 'service_scenario_id']
);

-- ─────────────────────────────────────────────────────────────────────────
-- 21000108000000_description_is_a_summary.sql
-- ─────────────────────────────────────────────────────────────────────────

-- description → summary, on the five tables that carry one. Written 2026-08-25.
--
--   services.summary · phases.summary · scenarios.summary
--   paths.summary    · cells.summary
--
-- The field answers "what is this, in one line", which is a summary. The panel
-- editor already labels it "Summary" above a column called `description`.
--
-- `slices.description` KEEPS ITS NAME and is asserted to keep it below. A
-- slice's description is prose the author writes about the slice, not a
-- one-line gloss of a row, and collapsing the two words would lose that.
--
-- THE AMBIGUITY: `description` is a word, not an identifier — five tables had
-- one, a sixth still does, and `tech_description` is a link TYPE inside
-- cells.links. Upstream replaced each fragment by name for exactly this
-- reason. Here a word-boundary sweep is provably safe instead, and the proof
-- is cheap: three function bodies name a description, every fragment in them
-- belongs to one of the five renamed columns, and `\mdescription\M` cannot
-- match inside `tech_description` because an underscore is a word character.
-- The count below is the assertion that this stayed true.

alter table public.services  rename column description to summary;
alter table public.phases    rename column description to summary;
alter table public.scenarios rename column description to summary;
alter table public.paths     rename column description to summary;
alter table public.cells     rename column description to summary;

select public.__rewrite_function_bodies(
  array['\mdescription\M'],
  array['summary'],
  3
);

comment on column public.paths.summary is 'Optional summary of what this path variant represents';
comment on column public.cells.summary is
  'Optional longer cell summary (detail panel, not grid label)';

select public.__assert_vocabulary_gone(
  array[]::text[],
  array['description'],
  array['slices.description']
);

-- ─────────────────────────────────────────────────────────────────────────
-- 21000109000000_the_lane_vocabulary_is_a_schema_version.sql
-- ─────────────────────────────────────────────────────────────────────────

-- The shape changed, so the number changes. Written 2026-08-25.
--
-- Ten renames landed above. A target carrying 2026.07.16 and a target carrying
-- this one disagree about the name of nearly every table an IR touches, and
-- the adapter contract's compatibility check is the thing that has to notice.
-- src/lib/backend/schemaVersion.ts holds the matching supported list.
--
-- The scaffolding goes with them. __rewrite_function_bodies and its two
-- companions exist for one vocabulary change; leaving a catalog-rewriting
-- SECURITY INVOKER function in the schema afterwards would be leaving a loaded
-- tool on the bench.

update public.schema_version
set version = '2026.08.25',
    applied_at = now();

do $do$
begin
  if not exists (select 1 from public.schema_version where version = '2026.08.25') then
    raise exception 'schema_version did not take the bump';
  end if;
end
$do$;

drop function public.__rewrite_function_bodies(text[], text[], integer);
drop function public.__rename_schema_objects(text, text);
drop function public.__assert_vocabulary_gone(text[], text[], text[]);

-- ─────────────────────────────────────────────────────────────────────────
-- 21000110000000_the_ir_can_author_a_needs_edge.sql
-- ─────────────────────────────────────────────────────────────────────────

-- The IR can finally say `needs`, so the number changes. Written 2026-08-26.
--
-- NO DDL, deliberately. `cell_dependencies.kind check (kind in
-- ('trigger','needs'))` has been in this schema since 20260729120000 and the
-- app has read both kinds ever since. The half that could not express a needs
-- edge was the IR: `$defs.trigger` carried only `source` and `target` under
-- `additionalProperties: false`, so a needs edge was dropped on export and
-- could not survive a re-import. references/ir-schema.json 2026.08.26 gives
-- the edge an optional `kind`.
--
-- The number still moves here, because `schema_version` is ONE contract
-- version across both halves — an IR file, a workspace, and a live target all
-- state the same string, and src/lib/backend/schemaVersion.ts speaks a list of
-- them, not a range. A target left at 2026.08.25 stays supported and stays
-- correct: the columns are identical either way.

update public.schema_version
set version = '2026.08.26',
    applied_at = now();

do $do$
begin
  if not exists (select 1 from public.schema_version where version = '2026.08.26') then
    raise exception 'schema_version did not take the bump';
  end if;
end
$do$;

-- ─────────────────────────────────────────────────────────────────────────
-- 21000111000000_propositions_are_the_business_model.sql
-- ─────────────────────────────────────────────────────────────────────────

-- propositions → business_model. Written 2026-08-27.
--
-- The last row of the vocabulary map that still applies here (#84). Five rows
-- landed in the 2100 series on 2026-08-25; `sets_off` and `cells.maturity`
-- never existed in this package, so this is the remainder.
--
-- WHY THE WORD HAD TO GO. The table holds one business-model record per
-- service — funding, pricing, delivery cost, revenue model. "Proposition"
-- already means something else one level down: a CELL's value proposition,
-- carried in `cells.value_props`. One word for two concepts at two altitudes
-- is the collision, and the table is the one wearing the borrowed name.
--
-- THE COLUMN THAT KEEPS THE WORD, PERMANENTLY. `evidence.proposition_question_key`
-- records which of the three validation questions an evidence row answers —
-- `understand`, `value`, `usability`. Those three ARE propositions in the
-- ordinary sense: claims the service is betting on. The rename moves the
-- container, not the concept, so the column stays and is asserted below rather
-- than merely left alone. Note it is not an accident that the catalog sweep
-- cannot reach it: the sweep keys on the PLURAL `propositions`, the column is
-- singular, and its check constraint was explicitly named
-- `evidence_question_key_check` with no `proposition` in it.
--
-- NO SCAFFOLDING IS RE-ERECTED. `21000109` dropped `__rename_schema_objects`
-- and its two companions on the stated grounds that leaving a catalog-rewriting
-- SECURITY INVOKER function in the schema is "leaving a loaded tool on the
-- bench". That reasoning holds, so this migration does not bring them back for
-- one more use: the object sweep is inlined as an anonymous block, which never
-- exists as a callable object at all.
--
-- The rewriter is not needed either, and that was checked rather than assumed:
-- no persistent plpgsql body in the series names `propositions`. The only
-- source occurrence inside a function-shaped construct is the table array in
-- `20260818002000_service_account_tier.sql`, which is itself an anonymous `do`
-- block and leaves no body behind. The policies it builds in that loop are
-- exactly why the sweep below reads the catalog instead of a hand-written list
-- — their names appear nowhere in the source as literals.

alter table public.propositions rename to business_model;

-- ---------------------------------------------------------------------------
-- Everything hanging off the table, which the rename above does not move.
--
-- Constraints first: renaming a unique or primary-key constraint renames the
-- index behind it, so an index pass run first would find a name that is already
-- correct and a second pass would miss it. Same order as
-- `__rename_schema_objects` used, for the same reason.
--
-- The sweep keys on `propositions` and not on `proposition`. With the singular
-- it would rename `propositions_select_auth` to `business_models_select_auth`
-- and leave a plural `s` welded to a singular noun on every object it touched.
-- ---------------------------------------------------------------------------

do $sweep$
declare
  target record;
  renamed integer := 0;
begin
  for target in
    select con.conname as name, cls.relname as rel
    from pg_constraint con
    join pg_class cls on cls.oid = con.conrelid
    join pg_namespace nsp on nsp.oid = cls.relnamespace
    where nsp.nspname = 'public' and strpos(con.conname, 'propositions') > 0
    order by con.conname
  loop
    execute format('alter table public.%I rename constraint %I to %I',
                   target.rel, target.name,
                   replace(target.name, 'propositions', 'business_model'));
    renamed := renamed + 1;
  end loop;

  for target in
    select idx.relname as name
    from pg_class idx
    join pg_namespace nsp on nsp.oid = idx.relnamespace
    where nsp.nspname = 'public' and idx.relkind = 'i'
      and strpos(idx.relname, 'propositions') > 0
      and not exists (select 1 from pg_constraint con where con.conindid = idx.oid)
    order by idx.relname
  loop
    execute format('alter index public.%I rename to %I',
                   target.name, replace(target.name, 'propositions', 'business_model'));
    renamed := renamed + 1;
  end loop;

  for target in
    select pol.polname as name, cls.relname as rel
    from pg_policy pol
    join pg_class cls on cls.oid = pol.polrelid
    join pg_namespace nsp on nsp.oid = cls.relnamespace
    where nsp.nspname = 'public' and strpos(pol.polname, 'propositions') > 0
    order by pol.polname
  loop
    execute format('alter policy %I on public.%I rename to %I',
                   target.name, target.rel,
                   replace(target.name, 'propositions', 'business_model'));
    renamed := renamed + 1;
  end loop;

  for target in
    select tg.tgname as name, cls.relname as rel
    from pg_trigger tg
    join pg_class cls on cls.oid = tg.tgrelid
    join pg_namespace nsp on nsp.oid = cls.relnamespace
    where nsp.nspname = 'public' and not tg.tgisinternal
      and strpos(tg.tgname, 'propositions') > 0
    order by tg.tgname
  loop
    execute format('alter trigger %I on public.%I rename to %I',
                   target.name, target.rel,
                   replace(target.name, 'propositions', 'business_model'));
    renamed := renamed + 1;
  end loop;

  raise notice 'renamed % objects carrying propositions', renamed;
end
$sweep$;

comment on table public.business_model is
  'One business-model record per service. The three validation questions live as evidence rows keyed understand|value|usability. Restricted SELECT.';

comment on column public.business_model.created_by is
  'The caller at insert; null for service-key writes.';

-- ---------------------------------------------------------------------------
-- The post-condition. Counting how many objects were renamed proves only that
-- the loop ran; asking the catalog what is left proves the thing the migration
-- claims.
-- ---------------------------------------------------------------------------

do $assert$
declare
  found text[] := '{}';
begin
  found := found || array(
    select 'table ' || cls.relname
    from pg_class cls join pg_namespace nsp on nsp.oid = cls.relnamespace
    where nsp.nspname = 'public' and cls.relkind in ('r', 'v', 'm')
      and strpos(cls.relname, 'propositions') > 0);
  found := found || array(
    select 'column ' || cls.relname || '.' || att.attname
    from pg_attribute att
    join pg_class cls on cls.oid = att.attrelid
    join pg_namespace nsp on nsp.oid = cls.relnamespace
    where nsp.nspname = 'public' and att.attnum > 0 and not att.attisdropped
      and strpos(att.attname, 'propositions') > 0);
  found := found || array(
    select 'constraint ' || con.conname
    from pg_constraint con join pg_namespace nsp on nsp.oid = con.connamespace
    where nsp.nspname = 'public' and strpos(con.conname, 'propositions') > 0);
  found := found || array(
    select 'index ' || idx.relname
    from pg_class idx join pg_namespace nsp on nsp.oid = idx.relnamespace
    where nsp.nspname = 'public' and idx.relkind = 'i'
      and strpos(idx.relname, 'propositions') > 0);
  found := found || array(
    select 'policy ' || pol.polname
    from pg_policy pol
    join pg_class cls on cls.oid = pol.polrelid
    join pg_namespace nsp on nsp.oid = cls.relnamespace
    where nsp.nspname = 'public' and strpos(pol.polname, 'propositions') > 0);
  found := found || array(
    select 'trigger ' || tg.tgname
    from pg_trigger tg
    join pg_class cls on cls.oid = tg.tgrelid
    join pg_namespace nsp on nsp.oid = cls.relnamespace
    where nsp.nspname = 'public' and not tg.tgisinternal
      and strpos(tg.tgname, 'propositions') > 0);
  found := found || array(
    select 'function ' || pro.proname
    from pg_proc pro join pg_namespace nsp on nsp.oid = pro.pronamespace
    where nsp.nspname = 'public' and pro.prokind = 'f'
      and strpos(coalesce(pro.prosrc, ''), 'propositions') > 0);

  if array_length(found, 1) > 0 then
    raise exception 'propositions survives the rename in: %', array_to_string(found, ', ');
  end if;

  -- The table arrived under its new name, rather than the word merely leaving.
  if to_regclass('public.business_model') is null then
    raise exception 'business_model does not exist — the rename removed a table instead of moving it';
  end if;

  -- And the one occurrence that is meant to survive, asserted so a later sweep
  -- that removes it fails here instead of silently narrowing the evidence model.
  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'evidence'
      and column_name = 'proposition_question_key'
  ) then
    raise exception
      'evidence.proposition_question_key is gone — it is a permanent exemption, not residue (#84)';
  end if;
end
$assert$;

-- ---------------------------------------------------------------------------
-- The shape changed, so the number changes — `21000109`'s rule, and
-- `21000110` applied it even for a change with no DDL at all, on the grounds
-- that `schema_version` is ONE contract. A renamed table is the loudest kind of
-- shape change: a target at 2026.08.26 answers to `propositions` and a target
-- at this number does not.
--
-- Older numbers are NOT evicted from the supported list, following the
-- precedent this series set rather than a fresh judgement: `21000104` renamed
-- `layers` to `lanes` and 2026.07.16 stayed listed. A version leaves that list
-- when the migration that would carry it forward stops existing, which is a
-- deliberate act. That migration still exists — it is this file.
--
-- src/lib/backend/schemaVersion.ts carries the matching entry; `check:version`
-- fails if the two disagree.
-- ---------------------------------------------------------------------------

update public.schema_version
set version = '2026.08.27',
    applied_at = now();

do $version$
begin
  if not exists (select 1 from public.schema_version where version = '2026.08.27') then
    raise exception 'schema_version did not take the bump';
  end if;
end
$version$;

-- ─────────────────────────────────────────────────────────────────────────
-- 21000112000000_the_word_boundary_left_five_behind.sql
-- ─────────────────────────────────────────────────────────────────────────

-- 21000112000000 — what `\m…\M` could not reach.
--
-- FOUND BY THE SWEEP, ON ITS FIRST RUN AGAINST A REAL DATABASE. Five objects
-- still carrying retired vocabulary, four of them prose and one of them a
-- dangling reference that breaks an RPC the app and the agent both call.
--
-- THE ONE THAT MATTERS. `set_cell_dependency` ends with
--
--   on conflict on constraint cell_triggers_source_target_kind_unique
--
-- and no such constraint exists. `21000103` renamed the table with a catalogue
-- sweep — `strpos` and `replace`, no word boundaries — so the constraint became
-- `cell_dependencies_source_target_kind_unique`. It rewrote function bodies
-- with a different tool and a different pattern:
--
--   select public.__rewrite_function_bodies(array['\mcell_triggers\M'], …)
--
-- `\M` asserts a word END, `_` is a word CONSTITUENT in Postgres regex, and so
-- `\mcell_triggers\M` cannot match inside `cell_triggers_source_target_kind_unique`.
-- The table reference in the same body was rewritten; the constraint name three
-- lines below it was not. `on conflict on constraint` resolves at execution, so
-- nothing failed at migration time and nothing has failed since — the function
-- raises the first time a user connects two cells on an instance built from
-- this series.
--
-- This is the identical failure the vocabulary guards were ported to catch, and
-- it is written down in two places in this repository already: `21000104`'s
-- header records having to give `cells_layer_step_slot_unique` its own pattern
-- for the same reason, and `scripts/retired-vocabulary.mjs` says the enforced
-- fragments are SUBSTRINGS because a word-boundary pattern is what lets a name
-- like this survive. Both were written from an upstream incident. This one is
-- ours, and it was here the whole time.
--
-- THE OTHER FOUR are prose: three comments and one `--` line inside a function
-- body. A comment is read by the next person and by an agent reading the
-- schema, so a stale one is a wrong answer with a citation.
--
-- NO SCHEMA VERSION BUMP, deliberately. `schema_version` records the SHAPE the
-- app codes against, and nothing here moves it: no table, column, signature or
-- IR field changes, and the app's call to `set_cell_dependency` is byte for
-- byte the call it was already making. A bump would tell every instance its
-- target is incompatible in order to ship a repair, and this series has
-- precedent for not doing that — `21000103` through `21000108` were six
-- migrations under one version. What the bump would buy is the ability to tell
-- a repaired database from a broken one by its stamp, which is worth wanting
-- and is not what a compatibility stamp is for.
--
-- NO SCAFFOLDING COMES BACK. `21000102`'s three helpers were dropped by
-- `21000109` and stay dropped, following `21000111`: the body rewrite is an
-- anonymous block and never exists as a callable object.

-- ---------------------------------------------------------------------------
-- Function bodies. Plain `replace` on the full definition — the reason this
-- migration exists is a pattern that was too clever, so this one is not.
-- ---------------------------------------------------------------------------

do $bodies$
declare
  target record;
  -- An array, not a record: `foreach … slice 1` hands back a text[] row of the
  -- 2-D literal below, and plpgsql rejects a record variable for it outright.
  edit text[];
  rewritten integer := 0;
  edits constant text[][] := array[
    -- The dangling constraint reference.
    array['cell_triggers_source_target_kind_unique',
          'cell_dependencies_source_target_kind_unique'],
    -- Prose inside `duplicate_path`, describing the join it is about to write.
    array['(path, layer, step, slot)', '(path, lane, step, slot)']
  ];
begin
  foreach edit slice 1 in array edits loop
    for target in
      select pro.oid, pro.proname, pg_get_functiondef(pro.oid) as body
      from pg_proc pro
      join pg_namespace nsp on nsp.oid = pro.pronamespace
      where nsp.nspname = 'public' and pro.prokind = 'f'
        and strpos(pg_get_functiondef(pro.oid), edit[1]) > 0
      order by pro.proname
    loop
      execute replace(target.body, edit[1], edit[2]);
      rewritten := rewritten + 1;
    end loop;
  end loop;

  -- Two edits, one function each. A zero here means an earlier migration
  -- already fixed one and this file is stale; a larger number means the
  -- literal is less distinctive than it looks. Either way, look before you
  -- lower it.
  if rewritten <> 2 then
    raise exception 'expected 2 function bodies to rewrite, rewrote %', rewritten;
  end if;
end
$bodies$;

-- ---------------------------------------------------------------------------
-- Comments. Rewritten in full rather than patched, so the text this schema
-- carries is the text in this file.
-- ---------------------------------------------------------------------------

comment on table public.phases is 'Ordered phase within a service';

comment on column public.cells.position is
  'Ordering within one (lane, step) slot. 0 for single-cell slots; tech-lane touchpoints occupy 0..n.';

comment on column public.slices.slice_type is
  'How the cut was made: journey (experience closure for an actor) | step (one column) | lane (one lane over the service) | cell (single-cell spec) | custom.';

-- ---------------------------------------------------------------------------
-- The post-condition, and the one this series did not have.
-- ---------------------------------------------------------------------------

do $assert$
declare
  found text[] := '{}';
  word text;
  words constant text[] := array['layer', 'lifecycle', 'cell_trigger',
                                 'service_scenario', 'propositions'];
begin
  -- What `scripts/check-retired-identifiers.mjs` sweeps, for the two kinds no
  -- rename moves: prose in a comment, and anything inside a function body.
  foreach word in array words loop
    found := found || array(
      select 'comment on ' || cls.relname ||
             coalesce('.' || att.attname, '') || ' — "' || word || '"'
      from pg_description des
      join pg_class cls on cls.oid = des.objoid
      join pg_namespace nsp on nsp.oid = cls.relnamespace
      left join pg_attribute att
             on att.attrelid = des.objoid and att.attnum = des.objsubid
                                          and des.objsubid > 0
      where nsp.nspname = 'public' and strpos(des.description, word) > 0);
    found := found || array(
      select 'function body ' || pro.proname || ' — "' || word || '"'
      from pg_proc pro
      join pg_namespace nsp on nsp.oid = pro.pronamespace
      where nsp.nspname = 'public' and pro.prokind = 'f'
        and strpos(coalesce(pro.prosrc, ''), word) > 0);
  end loop;

  if array_length(found, 1) > 0 then
    raise exception 'retired vocabulary survives: %', array_to_string(found, ', ');
  end if;
end
$assert$;

-- The reference the rewrite now names has to be real. Without this the edit
-- above could swap one dangling constraint name for another and every check in
-- this file would still pass — which is exactly how the original defect went
-- unnoticed: nothing asserted that the name in the body resolves.
do $resolves$
begin
  if not exists (
    select 1 from pg_constraint con
    join pg_class cls on cls.oid = con.conrelid
    join pg_namespace nsp on nsp.oid = cls.relnamespace
    where nsp.nspname = 'public' and cls.relname = 'cell_dependencies'
      and con.conname = 'cell_dependencies_source_target_kind_unique'
  ) then
    raise exception
      'set_cell_dependency now names cell_dependencies_source_target_kind_unique, which does not exist';
  end if;
end
$resolves$;

-- ─────────────────────────────────────────────────────────────────────────
-- 21000113000000_one_column_held_two_unrelated_things.sql
-- ─────────────────────────────────────────────────────────────────────────

-- 21000113000000 — `cells.links` held two concepts, and was named after
-- neither.
--
-- The column stores a jsonb array of `{type, label, url?, description?,
-- picture?, pictures?}`. Two shapes live in it, and the IR schema admits
-- exactly those two:
--
--   type = 'url'               a thing the cell points at. The Resources tab
--                              lists these and nothing else.
--   type = 'tech_description'  prose, a screenshot and a design link about ONE
--                              touchpoint used at this cell, found again by
--                              matching `label` against a line of
--                              `cells.content`.
--
-- One column, two concepts, and no label can be its name: `Links` over the tab
-- would promise both and show one, `Resources` on the column would be wrong
-- for half its rows. CONTEXT.md's interface→schema map has carried that as a
-- recorded divergence since the map was written, and said the fix would be a
-- schema change rather than a naming one. This is that change, and the map row
-- it was holding open goes with it.
--
-- ── The join that is only a string ─────────────────────────────────────────
--
-- A `tech_description` entry finds its touchpoint by comparing its `label` to
-- a line of the cell's own `content`. There is no join but the string, so when
-- the two stop agreeing the prose is not found and nothing says so — a rename
-- in the grid silently orphans the paragraph behind it. Moving the prose onto
-- a row of its own gives it an identity that a rename cannot break.
--
-- ── Two tables, and what each is for ───────────────────────────────────────
--
-- `cell_touchpoints` is the PLACEMENT: this touchpoint, used at this cell,
-- this way. It owns the per-moment `summary`, `screenshots` and `url`, because
-- those are what differ between two uses of the same tool — the second use
-- describes a different screen and points at a different design file.
--
-- `resources` is what a cell — or one placement — points at. A link is one
-- kind of resource, so the table is named for the parent concept and `kind`
-- carries the subtype.
--
-- ── Four decisions inside those two tables ─────────────────────────────────
--
-- 1. A resource attaches to a cell OR to one placement, never both and never
--    neither, enforced by `num_nonnulls(...) = 1` in the schema rather than by
--    agreement in the client — the construction `evidence_exactly_one_target`
--    already uses here. That constraint is what lets a design link belong to
--    the tool it documents rather than to the cell at large.
--
--    NOTHING IS ATTACHED TO A PLACEMENT BY THIS FILE, and nothing in the app
--    writes one yet. Deciding which of a cell's resources really documents one
--    of its touchpoints is an authoring act, and doing it by pattern-matching
--    labels here would be a guess per row. The capability and its constraint
--    ship; the attaching does not. That is stated here rather than left to be
--    found, because a column with no writer is the shape this whole ticket is
--    about — and the constraint is exercised below against the real table, in
--    both directions, so it is a rule rather than a hope.
--
-- 2. `kind` admits `link` and `other`, and the short list is the decision
--    rather than an omission. Every row this file writes is a link, and
--    `other` is the residual every kind column in this schema carries. A value
--    nothing can produce is a vocabulary nobody can check, so the list grows
--    when something produces a second kind.
--
-- 3. `name`, not `label`. This vocabulary gives a NAME to a thing a reader
--    navigates to and a TITLE to authored content a reader reads. A resource
--    is the first: the text names whatever is on the other end of the url.
--    `label` survives on `cell_dependencies` because an edge label genuinely
--    is a tag on a line and not a name for anything.
--
-- 4. `screenshots text[]`, not one `screenshot`. The link shape carries BOTH
--    `picture` and `pictures`, with `pictures` winning where both are set, and
--    `resolveCellDetailPictures` already returns an array to its caller. One
--    array column is what those two fields were always describing, and a
--    single-valued column would silently drop every entry after the first the
--    day an author used the plural field — the loss this file exists to stop.
--
-- ── Provenance goes to `evidence` ──────────────────────────────────────────
--
-- `evidence` exists, has exactly the right columns, and is where a citation
-- belongs. The IR admits two link types and neither is a citation, so a
-- well-formed board has none to move — but the column is jsonb and has
-- accepted anything since it was created, and this file DROPS it, which
-- turns anything left behind from unreachable into gone. So a `ref`-typed
-- entry is carried into `evidence` rather than destroyed, `kind` is `other`
-- because sorting one-line citations into eight buckets by pattern-matching
-- their text is the guess this ticket exists to stop making, and `added_by`
-- records where they came from so the next person can sort them deliberately.
--
-- Anything that is none of the three shapes stops this migration. A fourth
-- shape dropped in silence is how a column comes to hold three things.
--
-- ── One question, one answer: the name of an unnamed resource ──────────────
--
-- Every `url` entry the IR admits carries a label, so the fallback below moves
-- nothing on a well-formed board. It is here because `name` is not null and an
-- entry can arrive without one, and it is the SAME RULE the app applies, in
-- the same characters: `RESOURCE_NAME_FROM_URL` in `src/lib/cellResources.ts`
-- carries this pattern verbatim, and `scripts/tests/one-name-for-an-unnamed-
-- resource.test.ts` fails when the two texts differ. Two answers to "what is
-- this called when nobody said" is how a board starts disagreeing with itself
-- about its own contents.

-- ---------------------------------------------------------------------------
-- The placement
-- ---------------------------------------------------------------------------

create table public.cell_touchpoints (
  id          uuid primary key default gen_random_uuid(),
  cell_id     uuid not null references public.cells (id) on delete cascade,
  -- The touchpoint's name AT THIS CELL. Free text rather than a foreign key
  -- into a catalog: this schema has no catalog of touchpoints, a touchpoint
  -- being a line of `cells.content` today, and inventing one here would mean
  -- deciding for every name whether two spellings are one tool — a guess per
  -- name, in a file whose whole purpose is to stop guessing. A catalog, when
  -- it comes, replaces this column with a reference and moves every placement
  -- at once; until then the placement carries the name it was authored with.
  name        text not null,
  position    int  not null,
  summary     text,
  -- See decision 4. Empty array rather than null: "no screenshots" is one
  -- state, and a reader that has to check for two of them checks for one.
  screenshots text[] not null default '{}'::text[],
  url         text,
  origin      text not null check (origin in ('import', 'app')),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  -- A cell names a touchpoint once. Two placements of one name at one moment
  -- are two paragraphs about the same thing with no way to tell them apart,
  -- which is the string join's failure wearing different clothes.
  constraint cell_touchpoints_cell_name_unique unique (cell_id, name),
  -- Deferrable: a reorder swaps two positions inside one transaction and an
  -- immediate check fails halfway through the swap.
  constraint cell_touchpoints_cell_position_unique
    unique (cell_id, position) deferrable initially deferred
);

comment on table public.cell_touchpoints is
  'One touchpoint, used at one cell. Owns the summary, screenshots and design '
  'link for THIS moment, which is what differs between two uses of the same '
  'tool. Replaces the tech_description entries of the old cells.links column, '
  'which found their touchpoint by matching a string.';
comment on column public.cell_touchpoints.name is
  'What the touchpoint is called at this cell. There is no catalog yet; a '
  'catalog replaces this column with a reference.';
comment on column public.cell_touchpoints.screenshots is
  'Screenshots or illustrations for this moment, in author order.';
comment on column public.cell_touchpoints.url is
  'The design file or external reference for THIS moment, not for the tool.';

-- ---------------------------------------------------------------------------
-- The resources
-- ---------------------------------------------------------------------------

create table public.resources (
  id                 uuid primary key default gen_random_uuid(),
  -- Exactly one of these two is set. `cascade` on both: a resource is a
  -- property of the thing it hangs off and outlives neither.
  cell_id            uuid references public.cells (id) on delete cascade,
  cell_touchpoint_id uuid references public.cell_touchpoints (id) on delete cascade,
  kind               text not null default 'link'
                       check (kind in ('link', 'other')),
  name               text not null,
  url                text,
  position           int  not null,
  origin             text not null check (origin in ('import', 'app')),
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now(),
  -- Decision 1, in the schema rather than in the client.
  constraint resources_one_owner
    check (num_nonnulls(cell_id, cell_touchpoint_id) = 1),
  -- A link with no url renders nowhere, which is what a misfiled citation was.
  constraint resources_link_has_url
    check (kind <> 'link' or nullif(btrim(url), '') is not null),
  -- Deferrable for the reason the placement's is.
  constraint resources_cell_position_unique
    unique (cell_id, position) deferrable initially deferred,
  constraint resources_touchpoint_position_unique
    unique (cell_touchpoint_id, position) deferrable initially deferred
);

comment on table public.resources is
  'Things a cell, or one touchpoint placement, points at. A link is one kind '
  'of resource and `kind` carries the subtype. Exactly one of cell_id and '
  'cell_touchpoint_id is set, so a design link can belong to the tool it '
  'documents rather than to the cell at large.';
comment on column public.resources.name is
  'What the thing on the other end is called. `name`, not `label`: a reader '
  'navigates to it.';

-- No separate foreign-key indexes on either table: each unique constraint
-- above leads with its owning column, so `where cell_id = ?` and
-- `where cell_touchpoint_id = ?` are already served by one.

create trigger set_cell_touchpoints_updated_at
  before update on public.cell_touchpoints
  for each row execute function public.set_updated_at();

create trigger set_resources_updated_at
  before update on public.resources
  for each row execute function public.set_updated_at();


-- ---------------------------------------------------------------------------
-- Prove the owner constraint, both ways
--
-- A CHECK that was written and never exercised is indistinguishable from one
-- that was written wrong, and this is the one design point the ticket is firm
-- on. So both halves of `num_nonnulls(...) = 1` are attempted against the real
-- constraint. Neither insert leaves a row: either the constraint refuses it,
-- or it does not and this migration stops.
--
-- The first needs nothing to exist, so it runs on an empty database too. The
-- second needs a placement to point at — there is none yet at this point in
-- the file, so it is deferred until after the data has moved, at the bottom.
-- ---------------------------------------------------------------------------

do $probe$
begin
  begin
    insert into public.resources (kind, name, url, position, origin)
    values ('link', 'ZZ Probe', 'https://example.invalid/', 1, 'app');
    raise exception
      'a resource owned by neither a cell nor a placement was accepted';
  exception
    when check_violation then null;
  end;
end
$probe$;

-- ---------------------------------------------------------------------------
-- The touchpoint prose
--
-- Every `tech_description` entry becomes a placement on the cell that carried
-- it, whether or not its label still matches a line of that cell's content. A
-- label that matches nothing is exactly the orphan the string join produced,
-- and dropping those to a "resolves today" filter would destroy the authored
-- paragraph on the way past. The name it was authored with is preserved, and
-- reattaching an orphan is an edit somebody can now make to a row.
--
-- `with ordinality` keeps the order the author typed. `pictures` wins over
-- `picture` where an entry carries both, which is what the reader already
-- does.
-- ---------------------------------------------------------------------------

insert into public.cell_touchpoints
  (cell_id, name, position, summary, screenshots, url, origin)
select
  c.id,
  btrim(item.link ->> 'label'),
  row_number() over (partition by c.id order by item.ord)::int,
  nullif(btrim(coalesce(item.link ->> 'description', '')), ''),
  coalesce(
    (select array_agg(btrim(picture.value #>> '{}') order by picture.ord)
     from jsonb_array_elements(
            case
              when jsonb_typeof(item.link -> 'pictures') = 'array'
                then item.link -> 'pictures'
              else '[]'::jsonb
            end)
          with ordinality as picture(value, ord)
     where nullif(btrim(picture.value #>> '{}'), '') is not null),
    case
      when nullif(btrim(coalesce(item.link ->> 'picture', '')), '') is not null
        then array[btrim(item.link ->> 'picture')]
      else '{}'::text[]
    end),
  nullif(btrim(coalesce(item.link ->> 'url', '')), ''),
  'import'
from public.cells c
cross join lateral
  jsonb_array_elements(c.links) with ordinality as item(link, ord)
where item.link ->> 'type' = 'tech_description'
  and nullif(btrim(coalesce(item.link ->> 'label', '')), '') is not null;

-- ---------------------------------------------------------------------------
-- The resources
--
-- `row_number` makes the position 1-based and contiguous per cell, which is
-- what the position constraint and the sync function below both assume. A cell
-- may hold the same url twice — that is the author's business, and there is
-- deliberately no unique on url.
-- ---------------------------------------------------------------------------

insert into public.resources (cell_id, kind, name, url, position, origin)
select
  c.id,
  'link',
  coalesce(
    nullif(btrim(coalesce(item.link ->> 'label', '')), ''),
    nullif(
      regexp_replace(
        lower(btrim(item.link ->> 'url')),
        '^https?://(?:[^@/?#]*@)?(?:www\.)?([^/?#:]+).*$',
        '\1'),
      lower(btrim(item.link ->> 'url'))),
    'Link'),
  btrim(item.link ->> 'url'),
  row_number() over (partition by c.id order by item.ord)::int,
  'import'
from public.cells c
cross join lateral
  jsonb_array_elements(c.links) with ordinality as item(link, ord)
where item.link ->> 'type' = 'url'
  and nullif(btrim(coalesce(item.link ->> 'url', '')), '') is not null;

-- ---------------------------------------------------------------------------
-- The citations
-- ---------------------------------------------------------------------------

insert into public.evidence
  (service_id, cell_id, cell_key, kind, title, ref, added_by)
select
  ph.service_id,
  c.id,
  -- `evidence_cell_key_paired` demands a key whenever `cell_id` is set, and
  -- `cells.cell_key` is nullable. `mint_cell_key` answers with the key the
  -- import pipeline would have given that cell, which is a derivation rather
  -- than a guess.
  coalesce(c.cell_key, public.mint_cell_key(c.path_id, c.lane_id, c.step_id)),
  'other',
  btrim(item.link ->> 'label'),
  nullif(
    btrim(coalesce(item.link ->> 'ref', item.link ->> 'url', '')),
    ''),
  'cells-links-split'
from public.cells c
join public.paths p on p.id = c.path_id
join public.scenarios s on s.id = p.scenario_id
join public.phases ph on ph.id = s.phase_id
cross join lateral jsonb_array_elements(c.links) as item(link)
where item.link ->> 'type' = 'ref'
  and nullif(btrim(coalesce(item.link ->> 'label', '')), '') is not null;

-- ---------------------------------------------------------------------------
-- Rewriting a cell's resources is one transaction
--
-- The resources tab replaces a whole list. PostgREST gives every statement its
-- own transaction, and a deferred position constraint only forgives a
-- collision until COMMIT — so a delete followed by an insert over the wire is
-- two transactions and a window where the cell has no resources at all.
--
-- Delete-and-reinsert rather than a diff, and the difference from a placement
-- is the point: a placement carries a per-moment summary and screenshots that
-- a delete would destroy, while a resource carries nothing that is not in the
-- list being written. The simpler operation is also the correct one.
--
-- Placement-attached resources are untouched. This is the CELL's editor, and
-- it reaches only rows whose `cell_id` is this cell.
-- ---------------------------------------------------------------------------

create or replace function public.sync_cell_resources(
  p_cell_id uuid,
  p_rows    jsonb
)
returns void
language plpgsql
security invoker
set search_path = public, pg_catalog, pg_temp
as $function$
declare
  v_nameless int;
begin
  if not exists (select 1 from public.cells c where c.id = p_cell_id) then
    raise exception 'cell % does not exist', p_cell_id;
  end if;

  -- Refused rather than defaulted. The editor already falls back to the url's
  -- host, so a nameless row arriving here means a caller skipped that, and
  -- inventing a name on its behalf hides the bug and adds a second answer to
  -- the question this file's header settles.
  select count(*) into v_nameless
  from jsonb_to_recordset(coalesce(p_rows, '[]'::jsonb))
    as r(kind text, name text, url text)
  where nullif(btrim(coalesce(r.name, '')), '') is null;
  if v_nameless <> 0 then
    raise exception '% resource(s) arrived with no name', v_nameless;
  end if;

  delete from public.resources where cell_id = p_cell_id;

  insert into public.resources (cell_id, kind, name, url, position, origin)
  select p_cell_id,
         coalesce(nullif(btrim(coalesce(r.kind, '')), ''), 'link'),
         btrim(r.name),
         nullif(btrim(coalesce(r.url, '')), ''),
         r.ord::int,
         'app'
  -- `rows from (... as (...)) with ordinality`, not
  -- `jsonb_to_recordset(...) with ordinality as r(...)`. Postgres refuses the
  -- second outright — "WITH ORDINALITY cannot be used with a column definition
  -- list" — and nothing static would catch it: the file parses, a replay
  -- against an empty database never calls the function, and a unit test that
  -- stubs the RPC never reaches it. It takes running the real function against
  -- a real server, which is why this one was.
  from rows from (
    jsonb_to_recordset(coalesce(p_rows, '[]'::jsonb))
      as (kind text, name text, url text)
  ) with ordinality as r(kind, name, url, ord);
end
$function$;

comment on function public.sync_cell_resources(uuid, jsonb) is
  'Replace one cell''s resources in a single transaction, in list order. '
  'Placement-attached resources are not this function''s business.';


-- ---------------------------------------------------------------------------
-- The functions that read the column, before it goes
--
-- Two read `cells.links`: `duplicate_path` and `duplicate_scenario`, which
-- copy every authored column of a cell.
--
-- They are rewritten from the definition the DATABASE holds rather than from
-- the file that created them, and that is deliberate. The rename band
-- 21000103..21000112 rewrote these bodies in place, so the newest FILE
-- defining them still says `layers`, `slot_position`, `description` and
-- `service_scenario_id` while the database says none of those. Re-creating
-- from a file that has drifted resurrects whatever it drifted from, and
-- nothing would report it. Reading the catalogue cannot drift by construction.
--
-- Every substitution is asserted to have matched, and a sweep at the bottom of
-- this file proves the rewrite reached both — because a `replace` that
-- silently matched nothing is how a rename comes to look applied while a
-- function still carries the old word, which is what 21000112 was written to
-- clean up.
--
-- The copy carries the new tables rather than losing them. Before this file, a
-- duplicated path carried its resources and its touchpoint prose because both
-- were columns of the row being copied; splitting them into tables would take
-- that away silently. The join onto the copies is (path, lane, step, slot) —
-- the same one the arrows below already use, and for the same reason.
--
-- The `links` anchors name the column AND THE ONE AFTER IT rather than the one
-- before. `picture, links, function,` would be the obvious anchor and is the
-- fragile one: it stops matching the day a neighbour is renamed, and this
-- schema renames neighbours.
-- ---------------------------------------------------------------------------

do $rewrite$
declare
  v_def    text;
  v_next   text;
  v_carry  text;
  v_hits   int := 0;
begin
  -- The two inserts appended to each copy. Written once, with the source
  -- cell's filter left as a token the two substitutions below fill in, so the
  -- copy rule exists in one place rather than twice.
  v_carry := $carry$

    -- The placements and the resources the copied cells carry. Matched to
    -- their copies on (path, lane, step, slot), which is the join the arrows
    -- below use and stops a multi-cell slot from fanning one row out into a
    -- copy per sibling.
    insert into public.cell_touchpoints
      (cell_id, name, position, summary, screenshots, url, origin)
    select nc.id, ct.name, ct.position, ct.summary, ct.screenshots, ct.url, 'app'
    from public.cell_touchpoints ct
    join public.cells c on c.id = ct.cell_id and @SOURCE@
    join public.cells nc
      on nc.path_id = new_path_id
     and nc.lane_id = (lane_map ->> c.lane_id::text)::uuid
     and nc.step_id = @STEP@
     and nc.position is not distinct from c.position;

    insert into public.resources
      (cell_id, kind, name, url, position, origin)
    select nc.id, r.kind, r.name, r.url, r.position, 'app'
    from public.resources r
    join public.cells c on c.id = r.cell_id and @SOURCE@
    join public.cells nc
      on nc.path_id = new_path_id
     and nc.lane_id = (lane_map ->> c.lane_id::text)::uuid
     and nc.step_id = @STEP@
     and nc.position is not distinct from c.position;

    -- Placement-attached resources, keyed through the placement's name on the
    -- copied cell. Nothing writes one today; carrying them anyway is what
    -- stops the first one that is written from being lost by a copy.
    insert into public.resources
      (cell_touchpoint_id, kind, name, url, position, origin)
    select nct.id, r.kind, r.name, r.url, r.position, 'app'
    from public.resources r
    join public.cell_touchpoints ct on ct.id = r.cell_touchpoint_id
    join public.cells c on c.id = ct.cell_id and @SOURCE@
    join public.cells nc
      on nc.path_id = new_path_id
     and nc.lane_id = (lane_map ->> c.lane_id::text)::uuid
     and nc.step_id = @STEP@
     and nc.position is not distinct from c.position
    join public.cell_touchpoints nct
      on nct.cell_id = nc.id and nct.name = ct.name;
$carry$;

  for v_def in
    select pg_get_functiondef(p.oid)
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.prokind = 'f'
      and pg_get_functiondef(p.oid) ~ '\mc\.links\M'
    order by pg_get_functiondef(p.oid)
  loop
    v_next := v_def;

    -- The column list and the projection of the cells copy.
    v_next := replace(v_next, ', links, function,', ', function,');
    v_next := replace(v_next, ', c.links, c.function,', ', c.function,');

    -- `duplicate_path` copies one path into the same scenario, so the copy
    -- points at the very same `steps` rows.
    v_next := replace(
      v_next,
      '    from public.cells c' || E'\n' ||
      '    where c.path_id = duplicate_path.source_path_id;' || E'\n',
      '    from public.cells c' || E'\n' ||
      '    where c.path_id = duplicate_path.source_path_id;' || E'\n' ||
      replace(
        replace(v_carry,
                '@SOURCE@', 'c.path_id = duplicate_path.source_path_id'),
        '@STEP@', 'c.step_id'));

    -- `duplicate_scenario` mints new steps, so the copy is found through the
    -- step map its own loop built.
    v_next := replace(
      v_next,
      '    from public.cells c' || E'\n' ||
      '    where c.path_id = src_path.id;' || E'\n',
      '    from public.cells c' || E'\n' ||
      '    where c.path_id = src_path.id;' || E'\n' ||
      replace(
        replace(v_carry, '@SOURCE@', 'c.path_id = src_path.id'),
        '@STEP@', '(step_map ->> c.step_id::text)::uuid'));

    if v_next = v_def then
      raise exception
        'a function reads cells.links in a shape this migration does not know: %',
        left(v_def, 200);
    end if;
    if v_next ~ '@SOURCE@|@STEP@' then
      raise exception 'the carry-forward block was spliced in unfilled';
    end if;

    execute v_next;
    v_hits := v_hits + 1;
  end loop;

  if v_hits <> 2 then
    raise exception
      'expected to rewrite duplicate_path and duplicate_scenario, rewrote %',
      v_hits;
  end if;
end
$rewrite$;

-- ---------------------------------------------------------------------------
-- Nothing may be left in the column
--
-- Invariants, not a census. This file has to replay against an empty database,
-- so asserting a row count would fail every empty replay forever. Asserting
-- that the column holds nothing this file did not carry across is vacuously
-- true on an empty table and exactly as strong on a full one.
-- ---------------------------------------------------------------------------

do $left$
declare
  v_lost_detail   int;
  v_lost_resource int;
  v_lost_citation int;
  v_stray         int;
  v_both_owners   int;
begin
  select count(*) into v_lost_detail
  from public.cells c
  cross join lateral jsonb_array_elements(c.links) as item(link)
  where item.link ->> 'type' = 'tech_description'
    and nullif(btrim(coalesce(item.link ->> 'label', '')), '') is not null
    and not exists (
      select 1 from public.cell_touchpoints ct
      where ct.cell_id = c.id and ct.name = btrim(item.link ->> 'label')
    );
  if v_lost_detail <> 0 then
    raise exception '% touchpoint details did not reach a placement', v_lost_detail;
  end if;

  select count(*) into v_lost_resource
  from public.cells c
  cross join lateral jsonb_array_elements(c.links) as item(link)
  where item.link ->> 'type' = 'url'
    and nullif(btrim(coalesce(item.link ->> 'url', '')), '') is not null
    and not exists (
      select 1 from public.resources r
      where r.cell_id = c.id and r.url = btrim(item.link ->> 'url')
    );
  if v_lost_resource <> 0 then
    raise exception '% resources did not reach the table', v_lost_resource;
  end if;

  select count(*) into v_lost_citation
  from public.cells c
  cross join lateral jsonb_array_elements(c.links) as item(link)
  where item.link ->> 'type' = 'ref'
    and nullif(btrim(coalesce(item.link ->> 'label', '')), '') is not null
    and not exists (
      select 1 from public.evidence e
      where e.cell_id = c.id
        and e.title = btrim(item.link ->> 'label')
        and e.ref is not distinct from nullif(
          btrim(coalesce(item.link ->> 'ref', item.link ->> 'url', '')),
          '')
    );
  if v_lost_citation <> 0 then
    raise exception '% provenance citations did not reach evidence', v_lost_citation;
  end if;

  -- Anything the three clauses above did not name — including an entry of a
  -- known type with nothing in the field that carries its content. A fourth
  -- shape would otherwise be dropped in silence, which is how this column came
  -- to hold two things in the first place.
  select count(*) into v_stray
  from public.cells c
  cross join lateral jsonb_array_elements(c.links) as item(link)
  where coalesce(item.link ->> 'type', '')
          not in ('url', 'ref', 'tech_description')
     or (item.link ->> 'type' = 'url'
         and nullif(btrim(coalesce(item.link ->> 'url', '')), '') is null)
     or (item.link ->> 'type' in ('ref', 'tech_description')
         and nullif(btrim(coalesce(item.link ->> 'label', '')), '') is null);
  if v_stray <> 0 then
    raise exception
      '% link entries are of a shape this migration does not know', v_stray
      using hint = 'Give the entry the field its type needs, or remove it — '
                   'dropping the column destroys whatever is left in it.';
  end if;

  -- The constraint says this cannot happen. Asserted anyway, for the reason
  -- the probes above exist.
  select count(*) into v_both_owners
  from public.resources
  where num_nonnulls(cell_id, cell_touchpoint_id) <> 1;
  if v_both_owners <> 0 then
    raise exception '% resources name a cell and a placement', v_both_owners;
  end if;
end
$left$;

-- The second half of the owner proof, now that a placement may exist to point
-- at. It says so when there is none rather than passing quietly, so an empty
-- replay cannot be mistaken for a database where the constraint was tested.

do $probe$
declare
  v_cell      uuid;
  v_placement uuid;
begin
  select ct.cell_id, ct.id into v_cell, v_placement
  from public.cell_touchpoints ct limit 1;

  if v_placement is null then
    raise notice
      'no placement exists, so the both-owners proof has nothing to run against';
    return;
  end if;

  begin
    insert into public.resources
      (cell_id, cell_touchpoint_id, kind, name, url, position, origin)
    values (v_cell, v_placement, 'link', 'ZZ Probe',
            'https://example.invalid/', 1, 'app');
    raise exception 'a resource owned by a cell AND a placement was accepted';
  exception
    when check_violation then null;
  end;
end
$probe$;

-- ---------------------------------------------------------------------------
-- And the column goes
-- ---------------------------------------------------------------------------

alter table public.cells drop constraint cells_links_is_array;
alter table public.cells drop column links;

-- The grant that named it is amended at its source, in
-- `20260818000000_authoring_foundation.sql`, and the reason is written there.
-- A superseding grant here would not have worked: the recipe is applied on
-- top of the core in one pass, so by the time any recipe statement runs the
-- column is already gone and the earlier grant has already failed.

-- Nothing in `public` may still read it. `drop column` refuses when a view or
-- an index depends on the column and says nothing at all about a function
-- body, which is the whole reason the rewrite above had to be explicit.

do $sweep$
declare
  v_left text;
begin
  select string_agg(p.proname, ', ') into v_left
  from pg_proc p
  join pg_namespace n on n.oid = p.pronamespace
  where n.nspname = 'public'
    and p.prokind = 'f'
    and pg_get_functiondef(p.oid) ~ '(\mc\.links\M|[ (]links,)';
  if v_left is not null then
    raise exception 'these functions still read cells.links: %', v_left;
  end if;
end
$sweep$;

-- ---------------------------------------------------------------------------
-- The compatibility stamp
--
-- Two new tables and a dropped column is the loudest kind of shape change: a
-- target at 2026.08.27 answers to `cells.links` and a target at this number
-- does not. `src/lib/backend/schemaVersion.ts` carries the matching entry, and
-- `check:version` fails if the two disagree.
--
-- Older numbers are not evicted from the supported list, following this
-- series' precedent: a version leaves that list when the migration that would
-- carry it forward stops existing, and that migration is this file.
-- ---------------------------------------------------------------------------

update public.schema_version
set version = '2026.08.31',
    applied_at = now();

do $version$
begin
  if not exists (select 1 from public.schema_version where version = '2026.08.31') then
    raise exception 'schema_version did not take the bump';
  end if;
end
$version$;

-- ─────────────────────────────────────────────────────────────────────────
-- 21000114000000_leads_to_and_enables.sql
-- ─────────────────────────────────────────────────────────────────────────

-- The two dependency kinds get the words the product uses, pointing the same way.
--
--   trigger  →  leads_to
--   needs    →  enables      (AND THE EDGE TURNS AROUND — see below)
--
-- 21000103000000 renamed the table and argued, correctly for its moment, that
-- the KIND column should keep `trigger`: a genus cannot also be one of its own
-- species. That argument was about the word `dependency`, and it still holds.
-- What it did not settle is whether `trigger` and `needs` were the right two
-- species, and the downstream instance has since found that they are not.
--
-- ── Why `trigger` becomes `leads_to` ──────────────────────────────────────
--
-- The panel groups these as "Set off by" / "Sets off" while the column stores
-- `trigger`. Product word and stored value disagree, which is the same class
-- of gap that made `links` ambiguous. `leads_to` IS the label, minus the
-- underscore, and it reads as one moment handing to the next rather than as an
-- alarm going off.
--
-- ── Why `needs` becomes `enables`, and why the rows must turn around ──────
--
-- This is the half that is not a rename. The two words put the source cell at
-- OPPOSITE ends of the same relationship:
--
--     A needs   B   →  B comes first, B is required by A
--     A enables B   →  A comes first, A makes B possible
--
-- So a `needs` row rewritten in place would claim the exact reverse of what it
-- was authored to say. `enables` is chosen because it puts BOTH kinds
-- source-first and upstream-first — makes it HAPPEN versus makes it POSSIBLE —
-- so an edge's direction can be read without first checking its kind:
--
--     "Creates breakout rooms"  --leads to--> "Reminds tutors to check them"
--     "generate_sample_blueprint.mjs" --enables--> "npm run dev with no .env"
--
-- The second is one of the 18 `needs` edges in the bundled sample, before and
-- after. Read it the old way — "the dev run needs the generator" — and the
-- meaning is identical; the words that carry it swap ends.
--
-- ── What could go wrong, and what stops it ────────────────────────────────
--
-- `cell_dependencies_source_target_kind_unique` covers (source, target, kind).
-- Turning a `needs` edge around cannot collide: the turned row's kind is
-- `enables`, which no row carries before this file runs (the old CHECK allowed
-- only `trigger` and `needs`), and a mutual pair (A,B,needs) + (B,A,needs)
-- turns into (B,A,enables) + (A,B,enables) — two distinct keys. An earlier
-- draft asserted against exactly that pair, which would have stranded a legal
-- database at 2026.08.31 over a collision that cannot happen.
--
-- The words "temporal" and "functional" go with the rename. They named the
-- distinction without ever making it usable.

alter table public.cell_dependencies
  drop constraint if exists cell_dependencies_kind_check;
alter table public.cell_dependencies
  alter column kind drop default;

update public.cell_dependencies
   set kind = 'leads_to'
 where kind = 'trigger';

-- The turn. Source and target swap in the same statement that renames the
-- kind, so no row is ever readable as "A enables B" while still meaning
-- "A needs B".
update public.cell_dependencies
   set source_cell_id = target_cell_id,
       target_cell_id = source_cell_id,
       kind = 'enables'
 where kind = 'needs';

alter table public.cell_dependencies
  add constraint cell_dependencies_kind_check
  check (kind in ('leads_to', 'enables'));
alter table public.cell_dependencies
  alter column kind set default 'leads_to';

comment on table public.cell_dependencies is
  'Dependency from one cell to another. kind: leads_to (makes it happen) | enables (makes it possible). Both read source-first and upstream-first.';
-- The column comment was set by 20260729120000 and followed the column through
-- the table rename; left alone it would keep teaching the retired words and
-- the retired direction to every schema reader.
comment on column public.cell_dependencies.kind is
  'leads_to = makes it happen (draws an arrow) | enables = makes it possible (panel only). Both read source-first.';

-- The literals inside `set_cell_dependency` — its `kind` default and the
-- guard that rejects an unknown kind.
--
-- Done here rather than through `__rewrite_function_bodies`, which
-- 21000109000000 dropped along with the other two vocabulary helpers once the
-- lane renames were finished. One function is one function; a helper that
-- sweeps every routine in the schema is what the wide renames needed and this
-- does not.
--
-- The patterns are QUOTED, so this cannot reach the word `trigger` where it
-- means a database trigger, and the grants ride through `create or replace`
-- untouched — a drop would take the ACL with it and the recreate would land on
-- EXECUTE TO PUBLIC.
do $rewrite$
declare
  v_before text;
  v_after text;
begin
  select pg_get_functiondef(p.oid) into v_before
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
   where n.nspname = 'public' and p.proname = 'set_cell_dependency';

  if v_before is null then
    raise exception 'set_cell_dependency is missing; nothing to rewrite';
  end if;

  v_after := replace(replace(v_before, '''trigger''', '''leads_to'''),
                     '''needs''', '''enables''');

  if v_after = v_before then
    raise exception
      'set_cell_dependency names neither retired kind, so this migration is '
      'either already applied or reading a function it does not recognise';
  end if;

  execute v_after;
end
$rewrite$;

do $$
declare
  v_left int;
  v_default text;
begin
  select count(*) into v_left
    from public.cell_dependencies where kind in ('trigger', 'needs');
  if v_left > 0 then
    raise exception '% dependency row(s) still carry a retired kind', v_left;
  end if;

  select pg_get_expr(d.adbin, d.adrelid) into v_default
    from pg_attrdef d
    join pg_attribute a on a.attrelid = d.adrelid and a.attnum = d.adnum
   where d.adrelid = 'public.cell_dependencies'::regclass and a.attname = 'kind';
  if v_default is null or v_default not like '%leads_to%' then
    raise exception 'the kind default is %, not leads_to', coalesce(v_default, 'absent');
  end if;

  if exists (
    select 1 from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.proname = 'set_cell_dependency'
      and p.prosrc ~ '''(trigger|needs)'''
  ) then
    raise exception 'set_cell_dependency still names a retired kind';
  end if;
end
$$;

-- ---------------------------------------------------------------------------
-- The bump. This file changes the shape — the CHECK, the default, the
-- direction of every `needs` row — so the target has to say so, or a database
-- that has not run this file is indistinguishable from one that has, and the
-- 2026.09.01 app draws its `needs` rows the wrong way round without a word.
-- ---------------------------------------------------------------------------

update public.schema_version
set version = '2026.09.01',
    applied_at = now();

do $version$
begin
  if not exists (select 1 from public.schema_version where version = '2026.09.01') then
    raise exception 'schema_version did not take the bump';
  end if;
end
$version$;

-- ─────────────────────────────────────────────────────────────────────────
-- 21000115000000_a_slide_a_frame_and_a_title.sql
-- ─────────────────────────────────────────────────────────────────────────

-- "Frame" meant two things and "storyboard" meant two more.
--
-- The vocabulary the instance settled, and this template did not:
--
--   storyboard  the LANE. A row of the board like any other, a role rather
--               than a medium.
--   frame       ONE image on ONE cell.
--   strip       a step's frames across the lanes — the script for that moment.
--   slide       one screen of a slice.
--
-- Against that, this schema said `slice_items` for a slide and commented the
-- table "Frames: consecutive slice cells grouped… Empty cell_ids = title-only
-- divider frame" — the word `frame` used for a slide, in the schema's own
-- prose, which is where the collision was hiding. And `cells.picture` named
-- the thing that IS a frame.
--
-- So, three renames:
--
--   slice_items          → slides
--   slice_items.caption  → slides.title
--   cells.picture        → cells.frame
--
-- `caption` becomes `title` under the rule the summary/name renames settled:
-- `name` is for structure a reader navigates, `title` is for authored content
-- a reader reads. A slide is something somebody wrote, like the slice above it.
--
-- ── What this does NOT do ─────────────────────────────────────────────────
--
-- `slides.illustration` stays. The instance dropped its equivalent because no
-- row had ever set it and it REPLACED the strip rather than joining it. Here
-- `SliceStoryboardField` writes it, so dropping it would delete a working
-- feature to match a decision taken where the feature did not exist. If it
-- should later become an append to the strip rather than a substitute, that
-- is a change with its own reasoning and its own migration.
--
-- ── The dependent names, longhand ────────────────────────────────────────
--
-- `alter table … rename` does not move the names of constraints, indexes,
-- policies or triggers. `__rename_schema_objects` did that in one call, and
-- 21000109000000 dropped it along with the other two vocabulary helpers once
-- the lane renames were finished.
--
-- Longhand rather than a `do` block over the catalog, for the reason the
-- helper's own successor documented: a name moved inside dynamic SQL is a name
-- the static readers cannot see, and a retired word nothing can see is a
-- retired word nothing forbids. Every name below was minted by
-- 20260729120000 and is verified present by applying the generated core to a
-- stock Postgres, so there is no guesswork in writing them out.

alter table public.cells rename column picture to frame;

comment on column public.cells.frame is
  'The frame: one image on this cell. A step''s frames across the lanes are its strip.';

-- `duplicate_path` and `duplicate_scenario` copy the column by name. A body is
-- text, so the rename above does not reach inside one: the function keeps
-- being created successfully and raises 42703 the first time it is called.
--
-- Scoped to those two functions BY NAME. A bare sweep would also reach
-- `sync_cell_resources`, where `picture` is a JSONB KEY from the retired
-- `links` shape — a value on the wire, not this column, and renaming it would
-- break the migration of data that still carries it.
do $rewrite$
declare
  target record;
  after text;
  rewritten int := 0;
begin
  for target in
    select p.oid, p.proname, pg_get_functiondef(p.oid) as def
      from pg_proc p
      join pg_namespace n on n.oid = p.pronamespace
     where n.nspname = 'public'
       and p.proname in ('duplicate_path', 'duplicate_scenario')
  loop
    after := regexp_replace(target.def, '\mpicture\M', 'frame', 'g');
    if after <> target.def then
      execute after;
      rewritten := rewritten + 1;
    end if;
  end loop;

  if rewritten = 0 then
    raise exception
      'neither duplicate_path nor duplicate_scenario names the column this '
      'migration renamed, so either it has already run or these functions are '
      'not the ones it was written against';
  end if;
end
$rewrite$;

alter table public.slice_items rename column caption to title;
alter table public.slice_items rename to slides;

alter table public.slides rename constraint slice_items_pkey            to slides_pkey;
alter table public.slides rename constraint slice_items_slice_id_fkey   to slides_slice_id_fkey;
alter table public.slides rename constraint slice_items_position_unique to slides_position_unique;
alter table public.slides rename constraint slice_items_keys_match_ids  to slides_keys_match_ids;

-- The primary-key and unique constraints carry an index of the same name, and
-- renaming the constraint renamed it with them. These two are the plain
-- indexes, which nothing renames for.
alter index public.slice_items_slice_id_idx rename to slides_slice_id_idx;
alter index public.slice_items_cell_ids_idx rename to slides_cell_ids_idx;

alter trigger set_slice_items_updated_at on public.slides
  rename to set_slides_updated_at;

comment on table public.slides is
  'One slide of a slice. It shows the frames of the cells it references — that strip is what the slide shows, so the two cannot disagree — and carries the words written over them. Empty cell_ids = a title-only divider slide.';

comment on column public.slides.title is
  'The words over this slide. A title rather than a name: it is authored content a reader reads, not structure a reader navigates.';

comment on column public.slides.cell_ids is
  'SOFT refs to cells (no FK — must survive scenario re-import). Same order as cell_keys.';

comment on column public.slides.cell_keys is
  'IR key-paths paired with cell_ids for orphan recovery after key renames.';

-- `cells.cell_key`'s comment names the table its keys are matched against, and
-- that name moved.
comment on column public.cells.cell_key is
  'Authored key: service/scenario/path/lane/step. Written by the import pipeline for origin=import, minted by upsert_cell for origin=app. Survives re-import; slides.cell_keys matches against it.';


do $$
declare
  v_left text;
begin
  -- Invariants, never censuses: each is vacuously true on an empty database
  -- and says something real on a populated one.
  if to_regclass('public.slice_items') is not null then
    raise exception 'slice_items survived the rename';
  end if;

  if exists (
    select 1 from information_schema.columns
     where table_schema = 'public' and table_name = 'cells' and column_name = 'picture'
  ) then
    raise exception 'cells.picture survived the rename';
  end if;

  select string_agg(name, ', ' order by name) into v_left
    from (
      select conname as name from pg_constraint
       where conrelid = 'public.slides'::regclass and conname like 'slice_item%'
      union all
      select indexname from pg_indexes
       where schemaname = 'public' and tablename = 'slides' and indexname like 'slice_item%'
      union all
      select tgname from pg_trigger
       where tgrelid = 'public.slides'::regclass and not tgisinternal
         and tgname like '%slice_item%'
    ) left_behind;

  if v_left is not null then
    raise exception 'dependent objects still carry the retired name: %', v_left;
  end if;

  select string_agg(p.proname, ', ' order by p.proname) into v_left
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
   where n.nspname = 'public'
     and p.proname in ('duplicate_path', 'duplicate_scenario')
     and p.prosrc ~ '\mpicture\M';

  if v_left is not null then
    raise exception 'a copy function still names the retired column: %', v_left;
  end if;
end
$$;

-- ─────────────────────────────────────────────────────────────────────────
-- 21000116000000_one_spelling_each.sql
-- ─────────────────────────────────────────────────────────────────────────

-- One spelling each, for ten columns that had two words between them.
--
-- Ten renames, and every one of them is the same complaint: this schema spells
-- a single idea more than one way, so a reader has to learn the table before
-- they can read the column.
--
--   findings                   → audit_findings
--   findings.check_name        → audit_findings.check_key
--   findings.note              → audit_findings.summary
--   cell_dependencies.label    → cell_dependencies.name
--   slices.description         → slices.summary
--   slices.slice_type          → slices.kind
--   slices.origin              → slices.authorship
--   paths.path_type            → paths.kind
--   scenarios.view_type        → scenarios.layout
--   business_model             → business_models
--
-- ── The two rules underneath ──────────────────────────────────────────────
--
-- **`_type` is not a name, it is a suffix apologising for one.** `path_type`,
-- `slice_type` and `view_type` all say "the kind of thing this is" in a column
-- that could just say `kind` — and `kind` is already the word on
-- `cell_dependencies`. Three spellings of one idea is two too many.
--
-- **One word per meaning: name, title, summary, note.** A `name` is what you
-- navigate by, a `title` is authored content, a `summary` is the sentence that
-- describes the thing, and a `note` is an aside. `findings.note` was never an
-- aside — it is the finding's own sentence, which is a summary. Same for
-- `slices.description`, which was a summary wearing the longer word.
-- `cell_dependencies.label` is the edge's name.
--
-- ── Two VALUE migrations, not just names ─────────────────────────────────
--
-- `paths.path_type` accepted four values where three will do: `unhappy` and
-- `alternative` are two words for the same thing, and neither says what it
-- means. Both become `variant`. Nothing is lost — `exception` already carries
-- "this went wrong", so `unhappy` was only ever a second spelling of `variant`
-- with a mood attached.
--
-- `scenarios.view_type` accepted `single | side-by-side | integrated`. The
-- client has ALREADY collapsed the last two: `viewTypeVocabulary.ts` maps both
-- to `stacked` on read and refuses to persist `stacked`. That seam existed to
-- let the data catch up, and this is the migration it was waiting for — the
-- rows move, the constraint becomes `single | stacked`, and the translation
-- module goes with them. A seam kept after its migration lands is a second
-- vocabulary that nothing forces to agree.
--
-- ── What this deliberately does NOT do ───────────────────────────────────
--
-- It does not drop `cell_dependencies.note` or `evidence.note`, though both
-- are the same `note`-versus-`summary` question the renames above answer. The
-- difference is that these two are WRITTEN here: `CellDependencyEditor.tsx`
-- writes the first, `CellEvidenceTab.tsx` reads and writes the second. A
-- column with a live editor behind it is a feature, and a vocabulary sweep
-- that deletes features has stopped being a vocabulary sweep. Same reasoning
-- that kept `slides.illustration` in `21000115000000`.
--
-- They stay as `note` rather than becoming `summary` because on those two the
-- word is honest: an edge's note and a piece of evidence's note are asides
-- beside the thing, not the thing's own sentence.
--
-- `paths.note` stays in both: a path's note genuinely IS an aside.
--
-- ── The dependent names, longhand ────────────────────────────────────────
--
-- `alter table … rename` moves neither constraints, indexes, triggers nor
-- policies. `__rename_schema_objects` did that in one call and
-- `21000109000000` dropped it. Every name below was read out of a live
-- catalog after applying `portable-core.generated.sql` to a stock Postgres 17,
-- so none of them is a guess — and they are written out rather than swept,
-- for the reason `21000115000000` gave: a name moved inside dynamic SQL is a
-- name the static readers cannot see, and a retired word nothing can see is a
-- retired word nothing forbids.

-- ---------------------------------------------------------------------------
-- 1. findings → audit_findings
-- ---------------------------------------------------------------------------

alter table public.findings rename column check_name to check_key;
alter table public.findings rename column note to summary;
alter table public.findings rename to audit_findings;

alter table public.audit_findings rename constraint findings_pkey             to audit_findings_pkey;
alter table public.audit_findings rename constraint findings_service_id_fkey  to audit_findings_service_id_fkey;
alter table public.audit_findings rename constraint findings_source_check     to audit_findings_source_check;
alter table public.audit_findings rename constraint findings_severity_check   to audit_findings_severity_check;
alter table public.audit_findings rename constraint findings_status_check     to audit_findings_status_check;
alter table public.audit_findings rename constraint findings_keys_match_ids   to audit_findings_keys_match_ids;

-- The pkey's index moved with its constraint; these three are the plain ones.
alter index public.findings_service_id_idx       rename to audit_findings_service_id_idx;
alter index public.findings_cell_ids_idx         rename to audit_findings_cell_ids_idx;
alter index public.findings_open_fingerprint_idx rename to audit_findings_open_fingerprint_idx;

alter trigger set_findings_updated_at on public.audit_findings
  rename to set_audit_findings_updated_at;

comment on table public.audit_findings is
  'Audit / whatif / import-sweep outputs. Never hand-created; humans may only change status.';
comment on column public.audit_findings.check_key is
  'Which check raised this. A key, not a sentence: it is matched against, not read.';
comment on column public.audit_findings.summary is
  'The finding''s own sentence — what is wrong. A summary rather than a note: it is the point of the row, not an aside beside it.';
comment on column public.audit_findings.fingerprint is
  'check_key + sorted cell_keys hash. Dedupe/reopen identity across runs.';

-- ---------------------------------------------------------------------------
-- 2. The single-column renames
-- ---------------------------------------------------------------------------

alter table public.cell_dependencies rename column label to name;

comment on column public.cell_dependencies.name is
  'What this edge is called on the canvas. A name, not a label: it is what a reader navigates by.';

alter table public.slices rename column description to summary;
alter table public.slices rename column slice_type  to kind;
alter table public.slices rename column origin      to authorship;

alter table public.slices rename constraint slices_slice_type_check to slices_kind_check;

comment on column public.slices.summary is
  'What this slice is for, in a sentence.';
comment on column public.slices.kind is
  'Which cut through the grid this is: journey, step, lane, cell or custom.';
comment on column public.slices.authorship is
  'Who wrote it: generated, customized or human. Named for the act, not the source, because a human may author a slice outright.';

-- ---------------------------------------------------------------------------
-- 3. paths.path_type → paths.kind, four values becoming three
-- ---------------------------------------------------------------------------

alter table public.paths drop constraint paths_path_type_check;
alter table public.paths rename column path_type to kind;

update public.paths
   set kind = 'variant'
 where kind in ('unhappy', 'alternative');

alter table public.paths add constraint paths_kind_check
  check (kind in ('happy', 'variant', 'exception'));

comment on column public.paths.kind is
  'happy, variant or exception. `variant` replaced `unhappy` and `alternative`, which were two spellings of the same thing; `exception` already carries "this went wrong".';

-- ---------------------------------------------------------------------------
-- 4. scenarios.view_type → scenarios.layout, and the client seam it retires
-- ---------------------------------------------------------------------------

alter table public.scenarios drop constraint scenarios_view_type_check;
alter table public.scenarios alter column view_type drop default;
alter table public.scenarios rename column view_type to layout;

update public.scenarios
   set layout = 'stacked'
 where layout in ('side-by-side', 'integrated');

alter table public.scenarios alter column layout set default 'single';
alter table public.scenarios add constraint scenarios_layout_check
  check (layout in ('single', 'stacked'));

comment on column public.scenarios.layout is
  'How this scenario''s paths are laid out: single, or stacked. `merged` is a display state the client holds and never persists.';

-- ---------------------------------------------------------------------------
-- 5. business_model → business_models
-- ---------------------------------------------------------------------------
--
-- Plural, like every other table. It was singular because it was renamed from
-- `propositions` by `21000111000000`, which took the singular from the noun
-- rather than from the convention around it.

alter table public.business_model rename to business_models;

alter table public.business_models rename constraint business_model_pkey            to business_models_pkey;
alter table public.business_models rename constraint business_model_service_id_fkey to business_models_service_id_fkey;

alter trigger set_business_model_updated_at on public.business_models
  rename to set_business_models_updated_at;

-- ---------------------------------------------------------------------------
-- 6. The four functions whose ARGUMENT names carry a retired word
-- ---------------------------------------------------------------------------
--
-- PostgREST sends RPC arguments by name, so an argument name is wire contract
-- and not decoration. `create or replace function` refuses to change one, so
-- each of these has to be dropped and recreated.
--
-- A drop discards the function's ACL and Postgres hands the recreated one the
-- default grant to PUBLIC. On a schema whose whole authoring posture is
-- "revoke from anon, grant to authenticated", silently widening four RPCs to
-- PUBLIC would be the worst possible way to land a rename — so the ACL is
-- captured first and replayed after, and the proof block at the end asserts
-- that anon still cannot execute them.
--
-- Scoped to four functions BY NAME. A catalog-wide sweep would also rewrite
-- `origin` inside `upsert_cell`, `add_lane` and four others, where `origin`
-- is the import-provenance column on cells and phases — a different column,
-- not renamed here, and renaming it would break the importer.

do $rewrite$
declare
  target record;
  after text;
  after_args text;
  entry text;
  grantee text;
  rewritten int := 0;
begin
  for target in
    select p.oid,
           p.proname,
           pg_get_function_identity_arguments(p.oid) as identity_args,
           p.proacl as acl
      from pg_proc p
      join pg_namespace n on n.oid = p.pronamespace
     where n.nspname = 'public'
       and p.proname in ('create_path', 'create_scenario', 'duplicate_path',
                         'set_cell_dependency')
  loop
    after := pg_get_functiondef(target.oid);
    after := regexp_replace(after, '\mpath_type\M', 'kind', 'g');
    after := regexp_replace(after, '\mview_type\M', 'layout', 'g');
    after := regexp_replace(after, '\mp_label\M',   'p_name', 'g');
    after := regexp_replace(after, '\mlabel\M',     'name',   'g');

    after_args := regexp_replace(target.identity_args, '\mpath_type\M', 'kind', 'g');

    execute format('drop function public.%I(%s)', target.proname, target.identity_args);
    execute after;

    -- Identity arguments are TYPES only, so the signature that named the old
    -- function names the new one too, and the grants below land on it.
    if target.acl is not null then
      execute format('revoke execute on function public.%I(%s) from public',
                     target.proname, target.identity_args);
      foreach entry in array target.acl loop
        grantee := split_part(entry, '=', 1);
        if grantee = '' then
          execute format('grant execute on function public.%I(%s) to public',
                         target.proname, target.identity_args);
        else
          execute format('grant execute on function public.%I(%s) to %I',
                         target.proname, target.identity_args, grantee);
        end if;
      end loop;
    end if;

    rewritten := rewritten + 1;
  end loop;

  if rewritten <> 4 then
    raise exception
      'expected to rewrite 4 functions, rewrote % — the argument names this '
      'migration was written against are not the ones in this database', rewritten;
  end if;
end
$rewrite$;

-- The bodies of everything else that reads a renamed column. Scoped by the
-- WORDS, which appear in no other sense inside these bodies: `findings` as a
-- relation, `business_model` as a relation, and the three `_type` columns.
do $bodies$
declare
  target record;
  after text;
begin
  for target in
    select p.oid, p.proname, pg_get_functiondef(p.oid) as def
      from pg_proc p
      join pg_namespace n on n.oid = p.pronamespace
     where n.nspname = 'public'
       and p.prokind in ('f', 'p')
       and pg_get_functiondef(p.oid) ~
           '\mfindings\M|\mbusiness_model\M|\mcheck_name\M|\mslice_type\M|\mpath_type\M|\mview_type\M'
  loop
    after := target.def;
    after := regexp_replace(after, '\mfindings\M',       'audit_findings', 'g');
    after := regexp_replace(after, '\mbusiness_model\M', 'business_models', 'g');
    after := regexp_replace(after, '\mcheck_name\M',     'check_key', 'g');
    after := regexp_replace(after, '\mslice_type\M',     'kind', 'g');
    after := regexp_replace(after, '\mpath_type\M',      'kind', 'g');
    after := regexp_replace(after, '\mview_type\M',      'layout', 'g');
    if after <> target.def then
      execute after;
    end if;
  end loop;
end
$bodies$;


do $$
declare
  v_left text;
begin
  -- Invariants, never censuses: each is vacuously true on an empty database
  -- and says something real on a populated one.
  if to_regclass('public.findings') is not null then
    raise exception 'findings survived the rename';
  end if;
  if to_regclass('public.business_model') is not null then
    raise exception 'business_model survived the rename';
  end if;

  select string_agg(table_name || '.' || column_name, ', ' order by table_name)
    into v_left
    from information_schema.columns
   where table_schema = 'public'
     and (   (table_name = 'audit_findings'    and column_name in ('check_name', 'note'))
          or (table_name = 'cell_dependencies' and column_name = 'label')
          or (table_name = 'slices'            and column_name in ('description', 'slice_type', 'origin'))
          or (table_name = 'paths'             and column_name = 'path_type')
          or (table_name = 'scenarios'         and column_name = 'view_type'));
  if v_left is not null then
    raise exception 'a retired column name survived: %', v_left;
  end if;

  -- The two value migrations. Vacuous on an empty database, and the only
  -- honest check on a populated one: not how many rows moved, but that none
  -- was left behind.
  if exists (select 1 from public.paths where kind not in ('happy', 'variant', 'exception')) then
    raise exception 'a path kept a retired kind';
  end if;
  if exists (select 1 from public.scenarios where layout not in ('single', 'stacked')) then
    raise exception 'a scenario kept a retired layout';
  end if;

  select string_agg(name, ', ' order by name) into v_left
    from (
      select conname as name from pg_constraint
       where conrelid in ('public.audit_findings'::regclass, 'public.business_models'::regclass,
                          'public.paths'::regclass, 'public.scenarios'::regclass,
                          'public.slices'::regclass)
         and conname ~ '^(findings|business_model)_|_(path_type|view_type|slice_type)_'
      union all
      select indexname from pg_indexes
       where schemaname = 'public' and indexname ~ '^(findings|business_model)_'
      union all
      select tgname from pg_trigger
       where not tgisinternal and tgname ~ '(findings|business_model)_updated_at'
         and tgname !~ 'audit_findings|business_models'
    ) left_behind;
  if v_left is not null then
    raise exception 'a dependent object still carries the retired name: %', v_left;
  end if;

  select string_agg(p.proname, ', ' order by p.proname) into v_left
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
   where n.nspname = 'public'
     and p.prokind in ('f', 'p')
     and p.prosrc ~ '\mfindings\M|\mbusiness_model\M|\mcheck_name\M|\mslice_type\M|\mview_type\M';
  if v_left is not null then
    raise exception 'a function body still names a retired column: %', v_left;
  end if;
end
$$;

-- ─────────────────────────────────────────────────────────────────────────
-- 21000117000000_a_scenario_left_merged_opens_merged.sql
-- ─────────────────────────────────────────────────────────────────────────

-- A scenario left merged opens merged.
--
-- `scenarios.layout` held `single | stacked`, and the canvas drew three
-- things: single (one path at a time), stacked (one full band per path on a
-- shared step axis) and merged (the paths combined into ONE blueprint). The
-- third was the one a reader reached for most and the only one the row could
-- not say — it lived in a session-local override, so a scenario a reviewer
-- left merged opened stacked for the next person, every time.
--
-- The first was a layout nobody chose. Stacked with one path selected IS one
-- path drawn in full; `single` only ever changed which grid component drew
-- it. A value that changes the component and not the picture is not a
-- layout, so it goes, and its rows move to `stacked`.
--
--   single  →  stacked      one path stacked is one band; nothing to see
--   (session merged)  →  merged   what the row could not say, it now says
--
-- The toggle's write is `update_scenario_layout`. SECURITY DEFINER behind
-- `is_service_account()`, like every other authoring write: `authenticated`
-- holds no UPDATE on the column, and a viewer's choice stays a session
-- choice by construction, not by convention.
--
-- `create_scenario` still checked the three values `21000116000000` retired
-- and defaulted to the one this migration retires. It is `create or replace`d
-- with the same argument names — PostgREST sends them by name — so its ACL
-- survives untouched.


update public.scenarios set layout = 'stacked' where layout = 'single';

alter table public.scenarios
  drop constraint scenarios_layout_check,
  add constraint scenarios_layout_check check (layout in ('stacked', 'merged')),
  alter column layout set default 'stacked';

comment on column public.scenarios.layout is
  'How this scenario opens: stacked = one full band per path on a shared '
  'step axis; merged = the paths combined into one blueprint. The header '
  'toggle writes it, so a scenario left merged opens merged.';

-- ---------------------------------------------------------------------------
-- create_scenario: the same function, two layouts, the right default
-- ---------------------------------------------------------------------------

create or replace function public.create_scenario(
  phase_id uuid,
  name text,
  layout text default 'stacked',
  lane_source_path_id uuid default null,
  lane_set jsonb default '[]'::jsonb,
  step_count int default 5,
  path_name text default 'Happy Path'
)
returns jsonb
language plpgsql security definer
set search_path = public, pg_catalog, pg_temp
as $$
declare
  scenario_id uuid;
  new_path_id uuid;
  next_order int;
  lane jsonb;
  step_id uuid;
  i int;
begin
  if not public.is_service_account() then
    raise exception 'This account cannot edit the blueprint'
      using errcode = '42501';
  end if;

  if coalesce(trim(name), '') = '' then
    raise exception 'A blueprint needs a name';
  end if;
  if layout not in ('stacked', 'merged') then
    raise exception 'Unknown layout %', layout
      using hint = 'One of: stacked, merged.';
  end if;

  select coalesce(max(position), -1) + 1 into next_order
  from public.scenarios where scenarios.phase_id = create_scenario.phase_id;

  insert into public.scenarios (phase_id, name, position, layout, origin)
  values (create_scenario.phase_id, create_scenario.name, next_order, create_scenario.layout, 'app')
  returning id into scenario_id;

  insert into public.paths (scenario_id, name, kind, origin)
  values (scenario_id, path_name, 'happy', 'app')
  returning id into new_path_id;

  -- Lanes: copied from a source path, or taken from the explicit set.
  if lane_source_path_id is not null then
    insert into public.lanes (path_id, name, lane_role, position, origin)
    select new_path_id, l.name, l.lane_role, l.position, 'app'
    from public.lanes l where l.path_id = lane_source_path_id;
  else
    for lane in select * from jsonb_array_elements(lane_set) loop
      insert into public.lanes (path_id, name, lane_role, position, origin)
      values (
        new_path_id,
        lane ->> 'name',
        nullif(lane ->> 'lane_role', ''),
        coalesce((lane ->> 'position')::int, 0),
        'app'
      );
    end loop;
  end if;

  -- Columns start unnamed; naming them is the first thing you do on the grid.
  for i in 0 .. greatest(step_count, 1) - 1 loop
    insert into public.steps (scenario_id, name, origin)
    values (scenario_id, 'Step ' || (i + 1), 'app')
    returning id into step_id;
    insert into public.path_steps (path_id, step_id, position)
    values (new_path_id, step_id, i);
  end loop;

  return jsonb_build_object('scenario_id', scenario_id, 'path_id', new_path_id);
end;
$$;

-- ---------------------------------------------------------------------------
-- update_scenario_layout: the toggle's write
-- ---------------------------------------------------------------------------

create or replace function public.update_scenario_layout(scenario_id uuid, layout text)
returns void
language plpgsql
security definer
set search_path = public, pg_catalog, pg_temp
as $$
begin
  if not public.is_service_account() then
    raise exception 'This account cannot edit the blueprint' using errcode = '42501';
  end if;
  if layout not in ('stacked', 'merged') then
    raise exception 'Unknown layout %', layout
      using hint = 'One of: stacked, merged.';
  end if;

  update public.scenarios s set layout = update_scenario_layout.layout
  where s.id = update_scenario_layout.scenario_id;
  if not found then
    raise exception 'Unknown scenario';
  end if;
end;
$$;

comment on function public.update_scenario_layout(uuid, text) is
  'The header toggle''s write: how this scenario''s board is drawn, stacked '
  'or merged. Its inverse is itself with the previous value.';


-- ---------------------------------------------------------------------------
-- The IR revision this shape is
-- ---------------------------------------------------------------------------

update public.schema_version
set version = '2026.09.04',
    applied_at = now();

do $version$
begin
  if not exists (select 1 from public.schema_version where version = '2026.09.04') then
    raise exception 'schema_version did not take the bump';
  end if;
end
$version$;

-- ---------------------------------------------------------------------------
-- Proof — invariants, never censuses
-- ---------------------------------------------------------------------------

do $proof$
declare
  def text;
begin
  select pg_get_constraintdef(c.oid) into def
    from pg_constraint c
   where c.conrelid = 'public.scenarios'::regclass
     and c.conname = 'scenarios_layout_check';
  if def is null or def !~ '''stacked''' or def !~ '''merged''' or def ~ '''single''' then
    raise exception 'scenarios_layout_check is not stacked | merged: %', def;
  end if;

  select column_default into def
    from information_schema.columns
   where table_schema = 'public' and table_name = 'scenarios' and column_name = 'layout';
  if def !~ '''stacked''' then
    raise exception 'scenarios.layout does not default to stacked: %', def;
  end if;

  -- Vacuous on an empty database; on a populated one, that no row was left behind.
  if exists (select 1 from public.scenarios where layout not in ('stacked', 'merged')) then
    raise exception 'a scenario kept a retired layout';
  end if;

  if exists (
    select 1 from pg_proc p join pg_namespace n on n.oid = p.pronamespace
     where n.nspname = 'public' and p.proname = 'create_scenario'
       and (p.prosrc ~ '''single''' or p.prosrc ~ 'side-by-side' or p.prosrc ~ 'integrated')
  ) then
    raise exception 'create_scenario still admits a retired layout';
  end if;

  if to_regprocedure('public.update_scenario_layout(uuid, text)') is null then
    raise exception 'update_scenario_layout is missing';
  end if;
end
$proof$;

-- ─────────────────────────────────────────────────────────────────────────
-- 21000118000000_a_resource_keeps_its_id_and_knows_its_cell.sql
-- ─────────────────────────────────────────────────────────────────────────

-- A resource keeps its id, knows its cell, and one of them is featured.
--
-- Three things `resources` could not say, and one it said wrong:
--
--   * A save churned every id. `sync_cell_resources` replaced a cell's list
--     by deleting the rows and inserting the list again, so a reorder — or
--     a save that changed nothing — gave every resource a fresh id. Nothing
--     minded while a resource was only a name and a url; the moment anything
--     hangs off a row (featuring it, below) a churned id is a lost reference.
--     Now the list is RECONCILED: a row that arrives with its id is updated
--     in place, a row without one is inserted, a row the list no longer
--     names is deleted. An id that is not one of this cell's rows is refused
--     rather than adopted.
--
--   * A placement's resource was invisible to the cell. `resources_one_owner`
--     said a row picks ONE of `cell_id` and `cell_touchpoint_id`, so every
--     reader that asks "what does this cell point at?" — the board embed, the
--     Resources tab — missed a placement's rows, which had no `cell_id`. A
--     placement is one touchpoint used at one cell, so what the placement
--     points at is what the cell points at, through that touchpoint. Every
--     resource carries its cell; a placement-owned one carries its placement
--     as well, and a COMPOSITE key `(cell_touchpoint_id, cell_id)` onto
--     `cell_touchpoints (id, cell_id)` holds the two to one row. MATCH
--     SIMPLE: a row with no placement is not checked against the placement
--     table at all.
--
--   * Nothing was featured. `featured` marks the resource its owner leads
--     with: one featured attachment per owner (the image a cell or a
--     placement shows), any number of featured links. A partial unique index
--     per owner shape is what makes "one" a rule rather than an intention.
--
--   * `kind` said `link | other`. `other` named nothing; an attachment is a
--     file the cell points at — a shipped image today, an object in Storage
--     once #113 lands — and it carries a url like a link does, so the
--     link-only url check becomes a check on every row.
--
-- The position rule moves with the ownership. `resources_cell_position_unique`
-- was `unique (cell_id, position)`, written when every row with a `cell_id`
-- was one of the cell's own list. Once a placement's rows carry the cell
-- too, a placement's position 0 collides with the cell's own position 0.
-- The rule was never about placement rows — their order is
-- `(cell_touchpoint_id, position)`, which stays — so the cell's rule is
-- re-issued as an EXCLUDE constraint over the same pair, restricted to the
-- cell's own rows, still DEFERRABLE: a unique index could carry the
-- predicate but not the deferral, and the deferral is what lets one
-- statement write a reorder without colliding with itself halfway through.
--
-- Four functions, all SECURITY DEFINER behind `is_service_account()`:
--
--   sync_cell_resources(p_cell_id, p_rows)       the cell's OWN list
--   sync_placement_resources(p_placement_id, p_rows)   one placement's list
--   set_featured_resource(p_resource_id, p_featured)
--   restore_featured_resources(p_rows)           the inverse of the last
--
-- The cell's list refuses a placement's ids — those are the touchpoint's to
-- write, and a cell list that quietly rewrote them would turn a featured
-- attachment into a link. Neither sync writes `kind` or `featured` on a kept
-- row: kind is decided when a row is made, and featuring is its own write.
-- Featuring an attachment clears the owner's previous featured attachment IN
-- THE SAME TRANSACTION, under the index that would otherwise refuse the
-- second, and returns the before-values of every row it touched — which is
-- the inverse, and what `restore_featured_resources` writes back with no
-- clearing rule.
--
-- A placement's `url` and `screenshots` columns are NOT read here. #111
-- copies them onto the placement as featured resources and drops them.
--
-- ── Replaying against an empty database ───────────────────────────────────
--
-- Every statement is a schema change or an UPDATE that touches zero rows on
-- an empty database. The proof asserts invariants — no row without a cell, a
-- placement's row in its cell, the constraints and indexes present, the
-- functions definer-guarded — vacuous on zero rows and real on a populated
-- instance.


-- ---------------------------------------------------------------------------
-- The columns and the rules
-- ---------------------------------------------------------------------------

alter table public.resources
  add column featured boolean not null default false;

update public.resources r
   set cell_id = ct.cell_id
  from public.cell_touchpoints ct
 where r.cell_touchpoint_id = ct.id
   and r.cell_id is null;

alter table public.resources drop constraint resources_one_owner;
alter table public.resources alter column cell_id set not null;

alter table public.cell_touchpoints
  add constraint cell_touchpoints_id_cell_id_key unique (id, cell_id);

alter table public.resources drop constraint resources_cell_touchpoint_id_fkey;
alter table public.resources
  add constraint resources_placement_in_cell_fkey
  foreign key (cell_touchpoint_id, cell_id)
  references public.cell_touchpoints (id, cell_id)
  on delete cascade;

alter table public.resources drop constraint resources_cell_position_unique;
alter table public.resources
  add constraint resources_cell_position_unique
  exclude using btree (cell_id with =, position with =)
  where (cell_touchpoint_id is null)
  deferrable initially deferred;

update public.resources set kind = 'attachment' where kind = 'other';
alter table public.resources drop constraint resources_kind_check;
alter table public.resources
  add constraint resources_kind_check check (kind in ('link', 'attachment'));

alter table public.resources drop constraint resources_link_has_url;
alter table public.resources
  add constraint resources_has_url check (nullif(btrim(url), '') is not null);

create unique index resources_one_featured_attachment_per_placement
  on public.resources (cell_touchpoint_id)
  where featured and kind = 'attachment' and cell_touchpoint_id is not null;

create unique index resources_one_featured_attachment_per_cell
  on public.resources (cell_id)
  where featured and kind = 'attachment' and cell_touchpoint_id is null;

comment on table public.resources is
  'Things a cell points at. Every row carries its cell; a row a touchpoint '
  'placement owns carries the placement as well, and the composite key holds '
  'the two to one row. A link is one kind of resource and `kind` carries the '
  'subtype.';

comment on column public.resources.cell_id is
  'The cell this resource belongs to — always. A placement-owned resource '
  'carries its placement in cell_touchpoint_id as well.';

comment on column public.resources.cell_touchpoint_id is
  'The touchpoint placement this resource belongs to, when it is a '
  'placement''s: a link or the image a touchpoint shows at this cell. Still '
  'the cell''s row; edited from the touchpoint.';

comment on column public.resources.kind is
  'link = a place on the web; attachment = a file the cell points at, today '
  'a site-relative image path, after #113 an object in Storage. Both carry a '
  'url. Host and file type are read at render, never stored.';

comment on column public.resources.featured is
  'The resource its owner leads with. One featured attachment per placement '
  'or per cell (the image it shows); any number of featured links.';

-- ---------------------------------------------------------------------------
-- The cell's list writes the cell's own rows, and keeps their ids
-- ---------------------------------------------------------------------------

create or replace function public.sync_cell_resources(
  p_cell_id uuid,
  p_rows    jsonb
)
returns void
language plpgsql
security definer
set search_path = public, pg_catalog, pg_temp
as $function$
declare
  v_nameless  int;
  v_foreign   int;
  v_placement int;
begin
  if not public.is_service_account() then
    raise exception 'This account cannot edit the blueprint' using errcode = '42501';
  end if;
  if not exists (select 1 from public.cells c where c.id = p_cell_id) then
    raise exception 'cell % does not exist', p_cell_id;
  end if;

  -- Refused rather than defaulted. The editor already falls back to the
  -- url's host, so a nameless row reaching here means a caller skipped that,
  -- and inventing a name on its behalf hides the bug.
  select count(*) into v_nameless
  from jsonb_to_recordset(coalesce(p_rows, '[]'::jsonb))
    as r(id uuid, kind text, name text, url text)
  where nullif(btrim(coalesce(r.name, '')), '') is null;
  if v_nameless <> 0 then
    raise exception '% resource(s) arrived with no name', v_nameless;
  end if;

  -- An id has to be one of this cell's own rows.
  select count(*) into v_foreign
  from jsonb_to_recordset(coalesce(p_rows, '[]'::jsonb)) as r(id uuid)
  where r.id is not null
    and not exists (
      select 1 from public.resources x
       where x.id = r.id and x.cell_id = p_cell_id
    );
  if v_foreign <> 0 then
    raise exception '% resource id(s) are not rows of cell %', v_foreign, p_cell_id;
  end if;

  -- And not one of a placement's. Those are the cell's to READ, and the
  -- touchpoint's list to write; a cell list rewriting them would turn a
  -- featured attachment into a link.
  select count(*) into v_placement
  from jsonb_to_recordset(coalesce(p_rows, '[]'::jsonb)) as r(id uuid)
  join public.resources x on x.id = r.id
  where x.cell_touchpoint_id is not null;
  if v_placement <> 0 then
    raise exception '% resource(s) belong to a touchpoint placement and are edited from it', v_placement;
  end if;

  -- Rows the list no longer names — the cell's own only.
  delete from public.resources x
   where x.cell_id = p_cell_id
     and x.cell_touchpoint_id is null
     and x.id not in (
       select r.id
         from jsonb_to_recordset(coalesce(p_rows, '[]'::jsonb)) as r(id uuid)
        where r.id is not null
     );

  -- Kept rows, updated in place — position included, kind left alone.
  update public.resources x
     set name       = btrim(r.name),
         url        = nullif(btrim(coalesce(r.url, '')), ''),
         position   = r.ord::int,
         updated_at = now()
    from rows from (
           jsonb_to_recordset(coalesce(p_rows, '[]'::jsonb))
             as (id uuid, kind text, name text, url text)
         ) with ordinality as r(id, kind, name, url, ord)
   where x.id = r.id
     and x.cell_id = p_cell_id;

  -- New rows.
  insert into public.resources (cell_id, kind, name, url, position, origin)
  select p_cell_id,
         coalesce(nullif(btrim(coalesce(r.kind, '')), ''), 'link'),
         btrim(r.name),
         nullif(btrim(coalesce(r.url, '')), ''),
         r.ord::int,
         'app'
    from rows from (
           jsonb_to_recordset(coalesce(p_rows, '[]'::jsonb))
             as (id uuid, kind text, name text, url text)
         ) with ordinality as r(id, kind, name, url, ord)
   where r.id is null;
end
$function$;

comment on function public.sync_cell_resources(uuid, jsonb) is
  'The cell''s own list, reconciled in order: delete the rows not named, '
  'update the named ones in place (name, url, position — never kind or '
  'featured), insert the rest. Refuses another cell''s id and a placement''s.';

-- ---------------------------------------------------------------------------
-- One list edits everything a placement points at
-- ---------------------------------------------------------------------------

create or replace function public.sync_placement_resources(
  p_placement_id uuid,
  p_rows         jsonb
)
returns void
language plpgsql
security definer
set search_path = public, pg_catalog, pg_temp
as $function$
declare
  v_cell_id  uuid;
  v_nameless int;
  v_foreign  int;
begin
  if not public.is_service_account() then
    raise exception 'This account cannot edit the blueprint' using errcode = '42501';
  end if;

  select ct.cell_id into v_cell_id
    from public.cell_touchpoints ct
   where ct.id = p_placement_id;
  if v_cell_id is null then
    raise exception 'touchpoint placement % does not exist', p_placement_id;
  end if;

  select count(*) into v_nameless
  from jsonb_to_recordset(coalesce(p_rows, '[]'::jsonb))
    as r(id uuid, kind text, name text, url text)
  where nullif(btrim(coalesce(r.name, '')), '') is null
     or nullif(btrim(coalesce(r.url, '')), '') is null;
  if v_nameless <> 0 then
    raise exception '% resource(s) arrived with no name or no url', v_nameless;
  end if;

  -- An id has to be one of THIS placement's rows.
  select count(*) into v_foreign
  from jsonb_to_recordset(coalesce(p_rows, '[]'::jsonb)) as r(id uuid)
  where r.id is not null
    and not exists (
      select 1 from public.resources x
       where x.id = r.id and x.cell_touchpoint_id = p_placement_id
    );
  if v_foreign <> 0 then
    raise exception '% resource id(s) are not rows of placement %', v_foreign, p_placement_id;
  end if;

  delete from public.resources x
   where x.cell_touchpoint_id = p_placement_id
     and x.id not in (
       select r.id
         from jsonb_to_recordset(coalesce(p_rows, '[]'::jsonb)) as r(id uuid)
        where r.id is not null
     );

  -- Kept rows: name, url, position. Not kind, not featured.
  update public.resources x
     set name       = btrim(r.name),
         url        = btrim(r.url),
         position   = r.ord::int,
         updated_at = now()
    from rows from (
           jsonb_to_recordset(coalesce(p_rows, '[]'::jsonb))
             as (id uuid, kind text, name text, url text)
         ) with ordinality as r(id, kind, name, url, ord)
   where x.id = r.id
     and x.cell_touchpoint_id = p_placement_id;

  insert into public.resources
    (cell_id, cell_touchpoint_id, kind, name, url, position, origin)
  select v_cell_id, p_placement_id,
         coalesce(nullif(btrim(coalesce(r.kind, '')), ''), 'link'),
         btrim(r.name),
         btrim(r.url),
         r.ord::int,
         'app'
    from rows from (
           jsonb_to_recordset(coalesce(p_rows, '[]'::jsonb))
             as (id uuid, kind text, name text, url text)
         ) with ordinality as r(id, kind, name, url, ord)
   where r.id is null;
end
$function$;

create or replace function public.set_featured_resource(
  p_resource_id uuid,
  p_featured    boolean
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_catalog, pg_temp
as $function$
declare
  v_row      public.resources;
  v_previous jsonb;
begin
  if not public.is_service_account() then
    raise exception 'This account cannot edit the blueprint' using errcode = '42501';
  end if;

  select * into v_row from public.resources where id = p_resource_id for update;
  if v_row.id is null then
    raise exception 'resource % does not exist', p_resource_id;
  end if;

  -- What this call changes, as it was. The row itself, and — when a
  -- preview is being set — the previous preview of the same owner.
  select coalesce(jsonb_agg(jsonb_build_object('id', x.id, 'featured', x.featured)), '[]'::jsonb)
    into v_previous
    from public.resources x
   where x.id = p_resource_id
      or (p_featured and v_row.kind = 'attachment'
          and x.featured and x.kind = 'attachment' and x.id <> p_resource_id
          and x.cell_touchpoint_id is not distinct from v_row.cell_touchpoint_id
          and x.cell_id = v_row.cell_id);

  if p_featured and v_row.kind = 'attachment' then
    update public.resources x
       set featured = false, updated_at = now()
     where x.featured and x.kind = 'attachment' and x.id <> p_resource_id
       and x.cell_touchpoint_id is not distinct from v_row.cell_touchpoint_id
       and x.cell_id = v_row.cell_id;
  end if;

  update public.resources
     set featured = p_featured, updated_at = now()
   where id = p_resource_id;

  return jsonb_build_object('previous', v_previous);
end
$function$;

create or replace function public.restore_featured_resources(p_rows jsonb)
returns void
language plpgsql
security definer
set search_path = public, pg_catalog, pg_temp
as $function$
declare
  v_expected int;
begin
  if not public.is_service_account() then
    raise exception 'This account cannot edit the blueprint' using errcode = '42501';
  end if;

  select count(*) into v_expected
    from jsonb_to_recordset(coalesce(p_rows, '[]'::jsonb)) as r(id uuid, featured boolean);
  if v_expected = 0 then
    raise exception 'nothing to restore';
  end if;

  if (select count(*) from public.resources x
        join jsonb_to_recordset(p_rows) as r(id uuid, featured boolean) on r.id = x.id)
     <> v_expected then
    raise exception 'some of the % resources to restore no longer exist', v_expected;
  end if;

  -- Clears first, then sets. The partial unique index behind "one preview
  -- per owner" is checked row by row, not at commit, so restoring
  -- {old: true, new: false} in one statement can meet a moment where both
  -- are true and be refused — the capture, run backwards.
  update public.resources x
     set featured = false, updated_at = now()
    from jsonb_to_recordset(p_rows) as r(id uuid, featured boolean)
   where x.id = r.id and not r.featured;
  update public.resources x
     set featured = true, updated_at = now()
    from jsonb_to_recordset(p_rows) as r(id uuid, featured boolean)
   where x.id = r.id and r.featured;
end
$function$;

comment on function public.sync_placement_resources(uuid, jsonb) is
  'The touchpoint''s list at one cell, replaced in order: delete the rows not '
  'named, update the named ones (name, url, position — never kind or '
  'featured), insert the rest. Refuses another placement''s id and a '
  'placement that is gone.';
comment on function public.set_featured_resource(uuid, boolean) is
  'One row''s featured flag. Featuring an attachment clears the owner''s '
  'previous featured attachment in the same transaction and returns both '
  'before-states, which is the inverse.';
comment on function public.restore_featured_resources(jsonb) is
  'The inverse of set_featured_resource: each {id, featured} written back '
  'as captured, no clearing rule.';


-- ---------------------------------------------------------------------------
-- The IR revision this shape is
-- ---------------------------------------------------------------------------

update public.schema_version
set version = '2026.09.05',
    applied_at = now();

do $version$
begin
  if not exists (select 1 from public.schema_version where version = '2026.09.05') then
    raise exception 'schema_version did not take the bump';
  end if;
end
$version$;

-- ---------------------------------------------------------------------------
-- Proof — invariants, never censuses
-- ---------------------------------------------------------------------------

do $proof$
declare
  bad int;
  fn  text;
begin
  -- 1. NO RESOURCE IS WITHOUT A CELL, AND A PLACEMENT'S SITS IN ITS CELL.
  select count(*) into bad from public.resources where cell_id is null;
  if bad <> 0 then raise exception '% resources have no cell', bad; end if;
  select count(*) into bad
    from public.resources r
    join public.cell_touchpoints ct on ct.id = r.cell_touchpoint_id
   where ct.cell_id <> r.cell_id;
  if bad <> 0 then
    raise exception '% resources name a placement in another cell', bad;
  end if;
  if exists (select 1 from public.resources where kind not in ('link', 'attachment')) then
    raise exception 'a resource kept a retired kind';
  end if;

  -- 2. THE CONSTRAINTS AND INDEXES ARE THERE.
  if not exists (select 1 from pg_constraint
                  where conname = 'resources_placement_in_cell_fkey') then
    raise exception 'resources_placement_in_cell_fkey is missing';
  end if;
  if exists (select 1 from pg_constraint where conname = 'resources_one_owner') then
    raise exception 'resources_one_owner survived';
  end if;
  if (select count(*) from pg_indexes
       where tablename = 'resources'
         and indexname in ('resources_one_featured_attachment_per_placement',
                           'resources_one_featured_attachment_per_cell')) <> 2 then
    raise exception 'the featured-attachment indexes are missing';
  end if;
  if not exists (select 1 from pg_constraint
                  where conname = 'resources_cell_position_unique'
                    and contype = 'x' and condeferrable) then
    raise exception 'the cell position rule is not a deferrable exclusion over the cell''s own rows';
  end if;

  -- 3. THE FOUR WRITES ARE DEFINER-GUARDED. Which roles may call them is
  --    the recipe's business, proved under its own mark below.
  foreach fn in array array[
    'public.sync_cell_resources(uuid, jsonb)',
    'public.sync_placement_resources(uuid, jsonb)',
    'public.set_featured_resource(uuid, boolean)',
    'public.restore_featured_resources(jsonb)'
  ] loop
    if not (select prosecdef from pg_proc where oid = fn::regprocedure) then
      raise exception '% is not SECURITY DEFINER', fn;
    end if;
  end loop;
end
$proof$;

-- ─────────────────────────────────────────────────────────────────────────
-- 21000119000000_a_placement_says_what_a_tool_does_here.sql
-- ─────────────────────────────────────────────────────────────────────────

-- A placement says what a tool does here, and nothing else.
--
-- `cell_touchpoints` carried three things about one touchpoint at one cell:
-- its words (`summary`) and two URL columns — `screenshots[]` and `url` —
-- that say what the placement POINTS AT. 21000118000000 gave `resources`
-- everything a pointer needs: a placement owner, a kind (`attachment` for an
-- image, `link` for a place on the web) and a `featured` flag for the one
-- the owner leads with. Two homes for one fact is one too many: the panel
-- read the column, the Resources tab read the row, and a screenshot added
-- one way was invisible the other.
--
-- So a placement becomes summary + role, and everything it points at is a
-- resource on it:
--
--   * `role` — `core | peripheral | null`. Whether the moment happens
--     THROUGH this touchpoint or the touchpoint is merely present at it. It
--     sits on the placement and not on the touchpoint: a poster is core at
--     recruitment and incidental three phases later. Null is the common
--     state — nobody has judged this placement — and renders nothing.
--   * `url` — copied onto the placement as a featured link, idempotently:
--     a url the placement already has as a resource is not copied twice.
--   * `screenshots[i]` — each copied as an attachment on the placement in
--     author order; the first becomes the featured one unless the placement
--     already leads with an attachment.
--   * then the two columns go. Postgres drops their column grants with them.
--
-- The two copy functions (`duplicate_path`, `duplicate_scenario`) named the
-- columns in their placement INSERT, and their placement-resource INSERT
-- predates 21000118000000's `cell_id NOT NULL`, so it would have failed the
-- first time a copied placement carried a resource. Both are rewritten
-- from their current definitions — the column lists and one reference — so
-- a copy carries role, featured and the placement's cell.
--
-- The one reference: `duplicate_path` has raised "column reference
-- scenario_id is ambiguous" on every call since 21000107000000 renamed
-- `paths.service_scenario_id` to `scenario_id`, the name of the function's
-- own local. Found by calling it on the replayed core while proving this
-- file; the local is renamed `v_scenario_id`, out of the column's way.
--
-- ── Replaying against an empty database ───────────────────────────────────
--
-- Every statement is a schema change, an idempotent copy over whatever rows
-- exist, or a function rewrite. The proof before the drop is an INVARIANT —
-- every url and screenshot a placement still holds is carried by a resource
-- on it — vacuous on zero placements; the proof at the foot asserts the
-- columns are gone and no function in `public` still reads them.


-- ---------------------------------------------------------------------------
-- 1. The role
-- ---------------------------------------------------------------------------

alter table public.cell_touchpoints
  add column role text
  constraint cell_touchpoints_role_check check (role in ('core', 'peripheral'));

comment on column public.cell_touchpoints.role is
  'core = the moment happens through this touchpoint; peripheral = present '
  'at it but not what it turns on. Null = nobody has judged this placement, '
  'which is the common state and renders nothing.';

-- ---------------------------------------------------------------------------
-- 2. Copy what the two columns hold onto the placement, as resources
-- ---------------------------------------------------------------------------

insert into public.resources
  (cell_id, cell_touchpoint_id, kind, name, url, position, featured, origin)
select ct.cell_id, ct.id, 'link', ct.name, btrim(ct.url),
       coalesce((select max(r.position) + 1 from public.resources r
                  where r.cell_touchpoint_id = ct.id), 0),
       not exists (
         select 1 from public.resources f
          where f.cell_touchpoint_id = ct.id and f.kind = 'link' and f.featured
       ),
       'import'
  from public.cell_touchpoints ct
 where nullif(btrim(ct.url), '') is not null
   and not exists (
     select 1 from public.resources r
      where r.cell_touchpoint_id = ct.id and r.url = btrim(ct.url)
   );

insert into public.resources
  (cell_id, cell_touchpoint_id, kind, name, url, position, featured, origin)
select ct.cell_id, ct.id, 'attachment', ct.name, btrim(shot.url),
       coalesce((select max(r.position) + 1 from public.resources r
                  where r.cell_touchpoint_id = ct.id), 0) + shot.ord - 1,
       shot.ord = 1 and not exists (
         select 1 from public.resources f
          where f.cell_touchpoint_id = ct.id and f.kind = 'attachment' and f.featured
       ),
       'import'
  from public.cell_touchpoints ct
  cross join lateral unnest(ct.screenshots) with ordinality as shot(url, ord)
 where nullif(btrim(shot.url), '') is not null
   and not exists (
     select 1 from public.resources r
      where r.cell_touchpoint_id = ct.id and r.url = btrim(shot.url)
   );

do $proof$
declare
  missing int;
begin
  select count(*) into missing
    from public.cell_touchpoints ct
   where (nullif(btrim(ct.url), '') is not null
          and not exists (select 1 from public.resources r
                           where r.cell_touchpoint_id = ct.id and r.url = btrim(ct.url)))
      or exists (select 1 from unnest(ct.screenshots) as shot(url)
                  where nullif(btrim(shot.url), '') is not null
                    and not exists (select 1 from public.resources r
                                     where r.cell_touchpoint_id = ct.id and r.url = btrim(shot.url)));
  if missing <> 0 then
    raise exception '% placements still hold a url or screenshot no resource carries', missing;
  end if;
end
$proof$;

-- ---------------------------------------------------------------------------
-- 3. The copy functions carry role, featured and the placement's cell
-- ---------------------------------------------------------------------------

do $rewrite$
declare
  target record;
  after  text;
  rewritten int := 0;
begin
  for target in
    select p.oid, p.proname
      from pg_proc p
      join pg_namespace n on n.oid = p.pronamespace
     where n.nspname = 'public'
       and p.proname in ('duplicate_path', 'duplicate_scenario')
  loop
    after := pg_get_functiondef(target.oid);

    -- The local that shares a column's name since 21000107000000.
    if target.proname = 'duplicate_path' then
      after := replace(after, '  scenario_id uuid;', '  v_scenario_id uuid;');
      after := replace(after, 'into scenario_id', 'into v_scenario_id');
      after := replace(after, 'if scenario_id is null', 'if v_scenario_id is null');
      after := replace(after,
        'select scenario_id, duplicate_path.name, duplicate_path.kind,',
        'select v_scenario_id, duplicate_path.name, duplicate_path.kind,');
      if after !~ 'v_scenario_id uuid;' or after ~ '\mselect scenario_id,' then
        raise exception 'duplicate_path still names its local ambiguously';
      end if;
    end if;

    -- The placement copy: role in place of the two URL columns.
    after := replace(after,
      '(cell_id, name, position, summary, screenshots, url, origin)',
      '(cell_id, name, position, summary, role, origin)');
    after := replace(after,
      'ct.summary, ct.screenshots, ct.url, ''app''',
      'ct.summary, ct.role, ''app''');

    -- The cell's own resources: its own only, featured carried.
    after := regexp_replace(after,
      '\(cell_id, kind, name, url, position, origin\)(\s+)select nc\.id, r\.kind, r\.name, r\.url, r\.position, ''app''(\s+)from public\.resources r(\s+)join public\.cells c on c\.id = r\.cell_id',
      '(cell_id, kind, name, url, position, featured, origin)\1select nc.id, r.kind, r.name, r.url, r.position, r.featured, ''app''\2from public.resources r\3join public.cells c on c.id = r.cell_id and r.cell_touchpoint_id is null');

    -- The placement's resources: the copied cell, the copied placement, featured.
    after := regexp_replace(after,
      '\(cell_touchpoint_id, kind, name, url, position, origin\)(\s+)select nct\.id, r\.kind, r\.name, r\.url, r\.position, ''app''',
      '(cell_id, cell_touchpoint_id, kind, name, url, position, featured, origin)\1select nc.id, nct.id, r.kind, r.name, r.url, r.position, r.featured, ''app''');

    if after ~ 'screenshots' or after !~ 'ct\.role' then
      raise exception '% still copies the two URL columns', target.proname;
    end if;
    if (select count(*) from regexp_matches(after, 'r\.featured', 'g')) <> 2 then
      raise exception '% does not carry featured on both resource copies', target.proname;
    end if;
    if after !~ 'r\.cell_touchpoint_id is null' or after !~ 'select nc\.id, nct\.id' then
      raise exception '% does not separate the cell''s own resources from a placement''s', target.proname;
    end if;

    execute after;
    rewritten := rewritten + 1;
  end loop;

  if rewritten <> 2 then
    raise exception 'expected to rewrite duplicate_path and duplicate_scenario, rewrote %', rewritten;
  end if;
end
$rewrite$;

-- ---------------------------------------------------------------------------
-- 4. The columns
-- ---------------------------------------------------------------------------

alter table public.cell_touchpoints
  drop column screenshots,
  drop column url;

comment on table public.cell_touchpoints is
  'One touchpoint used at one cell: its own summary and role at this moment. '
  'What it points at is in resources (cell_touchpoint_id).';


-- ---------------------------------------------------------------------------
-- The IR revision this shape is
-- ---------------------------------------------------------------------------

update public.schema_version
set version = '2026.09.06',
    applied_at = now();

do $version$
begin
  if not exists (select 1 from public.schema_version where version = '2026.09.06') then
    raise exception 'schema_version did not take the bump';
  end if;
end
$version$;

-- ---------------------------------------------------------------------------
-- Proof — invariants, never censuses
-- ---------------------------------------------------------------------------

do $proof$
declare
  bad int;
  def text;
begin
  if exists (
    select 1 from information_schema.columns
     where table_schema = 'public' and table_name = 'cell_touchpoints'
       and column_name in ('screenshots', 'url')
  ) then
    raise exception 'cell_touchpoints still carries screenshots or url';
  end if;

  select pg_get_constraintdef(c.oid) into def
    from pg_constraint c
   where c.conrelid = 'public.cell_touchpoints'::regclass
     and c.conname = 'cell_touchpoints_role_check';
  if def is null or def !~ '''core''' or def !~ '''peripheral''' then
    raise exception 'cell_touchpoints_role_check is not core | peripheral: %', def;
  end if;

  if exists (select 1 from pg_proc p join pg_namespace n on n.oid = p.pronamespace
              where n.nspname = 'public' and p.proname = 'duplicate_path'
                and (p.prosrc ~ 'select scenario_id, duplicate_path\.name'
                     or p.prosrc !~ 'v_scenario_id uuid;')) then
    raise exception 'duplicate_path still names its local ambiguously';
  end if;

  select count(*) into bad
    from pg_proc p join pg_namespace n on n.oid = p.pronamespace
   where n.nspname = 'public'
     and p.prokind in ('f', 'p')
     and p.prosrc ~ 'ct\.(screenshots|url)\M';
  if bad <> 0 then
    raise exception '% functions still read cell_touchpoints.screenshots or .url', bad;
  end if;

  if exists (select 1 from public.cell_touchpoints where role not in ('core', 'peripheral')) then
    raise exception 'a placement carries a role outside the vocabulary';
  end if;
end
$proof$;

-- ─────────────────────────────────────────────────────────────────────────
-- 21000120000000_a_touchpoint_is_a_thing_the_service_owns.sql
-- ─────────────────────────────────────────────────────────────────────────

-- A touchpoint is a thing the service owns.
--
-- A placement named its touchpoint by a bare `name`, per cell. The same tool
-- placed at nine cells was nine strings that happened to agree, and nothing
-- held them to one spelling, one kind, one summary. A touchpoint is a thing
-- the SERVICE owns — an app, a document, a channel — and a placement is one
-- use of it at one cell.
--
-- So: a registry, `touchpoints`, one row per (service, name); and a
-- placement names its touchpoint one of two ways and exactly one —
-- `touchpoint_id` into the registry, or `name` alone when the registry lacks
-- it. A name-only placement is still a placement: drawn dashed on the board,
-- opening the same panel, offered a "Link to registry" action. It is never
-- matched to the entry it resembles by a rule; that choice is the author's.
--
-- ── The fold ──────────────────────────────────────────────────────────────
--
-- Every existing placement name becomes a registry row for its service
-- (one per spelling, case-insensitively) and the placement links to it.
-- Nothing is lost and nothing is guessed: the registry is minted FROM the
-- names, so every placement lands linked. Vacuous on an empty database.
--
-- ── The functions ─────────────────────────────────────────────────────────
--
-- `sync_cell_touchpoints(p_cell_id, p_names)` brings a cell's placements
-- into line with its text: a new name mints a registry row and a linked
-- placement; a name typed back links the name-only row that kept its
-- writing; a removed placement with anything on it — words, a role,
-- resources — stays as a name-only row, one with nothing on it goes. It
-- hands back what it removed so the caller's inverse can put the words back.
-- `restore_cell_touchpoints` is that inverse. `set_placement_touchpoint`
-- is "Link to registry" and its own inverse; `remove_placement` /
-- `restore_placement` take a name-only row nobody wants off a cell and put
-- it back, resources included. All five SECURITY DEFINER behind
-- `is_service_account()`: `touchpoint_id` and `name` are structure, and
-- structure does not move through a column grant.
--
-- The two copy functions carry the placement's identity across, both ways.
--
-- ── Replaying against an empty database ───────────────────────────────────
--
-- Schema changes, a fold over zero rows, function definitions. The proof is
-- an INVARIANT: the registry exists, no placement names its touchpoint both
-- ways or neither, every placement whose service's registry holds its name
-- is linked, the five functions are definers.


-- ---------------------------------------------------------------------------
-- 1. The registry
-- ---------------------------------------------------------------------------

create table public.touchpoints (
  id         uuid primary key default gen_random_uuid(),
  service_id uuid not null references public.services (id) on delete cascade,
  name       text not null,
  kind       text not null default 'other'
               constraint touchpoints_kind_check
               check (kind in ('app', 'document', 'physical', 'channel', 'service', 'other')),
  summary    text,
  url        text,
  origin     text not null constraint touchpoints_origin_check check (origin in ('import', 'app')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint touchpoints_service_id_name_key unique (service_id, name)
);

create trigger set_touchpoints_updated_at
  before update on public.touchpoints
  for each row execute function public.set_updated_at();

comment on table public.touchpoints is
  'The service''s registry of touchpoints — the apps, documents, channels and '
  'things a moment happens through. One row per (service, name); a placement '
  'in cell_touchpoints is one use of one at one cell.';
comment on column public.touchpoints.kind is
  'app | document | physical | channel | service | other. What sort of thing '
  'this is; defaulted to other and judged later, never guessed from a name.';
comment on column public.touchpoints.summary is
  'What this touchpoint IS, for the service — not what it does at any one cell.';
comment on column public.touchpoints.url is
  'Where the touchpoint itself lives, when it has a home; a placement''s own '
  'link is a resource on the placement.';

-- ---------------------------------------------------------------------------
-- 2. Two ways to name a touchpoint, and exactly one
-- ---------------------------------------------------------------------------

alter table public.cell_touchpoints
  add column touchpoint_id uuid references public.touchpoints (id) on delete restrict,
  alter column name drop not null,
  drop constraint cell_touchpoints_cell_name_unique,
  add constraint cell_touchpoints_one_identity
    check ((touchpoint_id is null) <> (name is null)),
  add constraint cell_touchpoints_name_not_blank
    check (name is null or btrim(name) <> ''),
  add constraint cell_touchpoints_cell_id_touchpoint_id_key unique (cell_id, touchpoint_id);

create unique index cell_touchpoints_cell_name_key
  on public.cell_touchpoints (cell_id, lower(name))
  where name is not null;

comment on column public.cell_touchpoints.touchpoint_id is
  'The registry entry this placement names, or null for a name-only placement.';
comment on column public.cell_touchpoints.name is
  'The touchpoint''s name when the registry lacks it. Exactly one of name and '
  'touchpoint_id is set; linking to the registry clears it.';
comment on table public.cell_touchpoints is
  'One touchpoint used at one cell: its own summary and role at this moment. '
  'Named by touchpoint_id into the registry, or by name alone when the '
  'registry lacks it. What it points at is in resources.';

-- ---------------------------------------------------------------------------
-- 3. The fold: every name a registry row, every placement linked
-- ---------------------------------------------------------------------------

insert into public.touchpoints (service_id, name, origin)
select distinct on (ph.service_id, lower(ct.name))
       ph.service_id, ct.name, 'import'
  from public.cell_touchpoints ct
  join public.cells c on c.id = ct.cell_id
  join public.paths p on p.id = c.path_id
  join public.scenarios s on s.id = p.scenario_id
  join public.phases ph on ph.id = s.phase_id
 where ct.name is not null
 order by ph.service_id, lower(ct.name), ct.name;

update public.cell_touchpoints ct
   set touchpoint_id = tp.id,
       name          = null,
       updated_at    = now()
  from public.cells c
  join public.paths p on p.id = c.path_id
  join public.scenarios s on s.id = p.scenario_id
  join public.phases ph on ph.id = s.phase_id
  join public.touchpoints tp on tp.service_id = ph.service_id
 where c.id = ct.cell_id
   and ct.name is not null
   and lower(tp.name) = lower(ct.name);

-- ---------------------------------------------------------------------------
-- 4. The five placement writes
-- ---------------------------------------------------------------------------

create or replace function public.sync_cell_touchpoints(p_cell_id uuid, p_names text[])
returns jsonb
language plpgsql
security definer
set search_path = public, pg_catalog, pg_temp
as $function$
declare
  v_service_id uuid;
  v_lane_role  text;
  v_bearing    boolean;
  v_removed    jsonb;
  v_wanted     jsonb;
begin
  if not public.is_service_account() then
    raise exception 'This account cannot edit the blueprint' using errcode = '42501';
  end if;

  select ph.service_id, ln.lane_role
    into v_service_id, v_lane_role
    from public.cells c
    join public.lanes ln on ln.id = c.lane_id
    join public.paths p on p.id = c.path_id
    join public.scenarios s on s.id = p.scenario_id
    join public.phases ph on ph.id = s.phase_id
   where c.id = p_cell_id;

  if v_service_id is null then
    raise exception 'cell % is not attached to a service', p_cell_id;
  end if;

  -- Content on an actor lane is a sentence about what somebody did; syncing
  -- it would file that sentence in the registry as a tool.
  select v_lane_role in ('frontstage_tech', 'backstage_tech', 'support_systems')
         or exists (select 1 from public.cell_touchpoints where cell_id = p_cell_id)
    into v_bearing;

  if not v_bearing then
    return jsonb_build_object('skipped', true, 'removed', '[]'::jsonb);
  end if;

  select coalesce(jsonb_agg(jsonb_build_object('name', name, 'position', position)), '[]'::jsonb)
    into v_wanted
    from (
      select name, min(ord)::int as position
        from unnest(p_names) with ordinality as t(name, ord)
       where btrim(name) <> ''
       group by name
    ) deduped;

  insert into public.touchpoints (service_id, name, origin)
  select v_service_id, w.name, 'app'
    from jsonb_to_recordset(v_wanted) as w(name text, position int)
  on conflict (service_id, name) do nothing;

  -- A name typed back links the name-only row that was keeping its
  -- writing, rather than inserting a second row beside it.
  update public.cell_touchpoints ct
     set touchpoint_id = tp.id,
         name          = null,
         updated_at    = now()
    from jsonb_to_recordset(v_wanted) as w(name text, position int)
    join public.touchpoints tp
      on tp.service_id = v_service_id and tp.name = w.name
   where ct.cell_id = p_cell_id
     and ct.touchpoint_id is null
     and lower(ct.name) = lower(w.name)
     and not exists (select 1 from public.cell_touchpoints x
                      where x.cell_id = p_cell_id and x.touchpoint_id = tp.id);

  -- What leaves the text: linked rows whose name is not wanted. Handed back
  -- with everything on them, so the inverse can put the words back.
  select coalesce(jsonb_agg(jsonb_build_object(
           'name', tp.name,
           'position', ct.position,
           'summary', ct.summary,
           'role', ct.role,
           'resources', (select coalesce(jsonb_agg(jsonb_build_object(
                             'kind', r.kind, 'name', r.name, 'url', r.url,
                             'position', r.position, 'featured', r.featured, 'origin', r.origin
                           ) order by r.position), '[]'::jsonb)
                           from public.resources r where r.cell_touchpoint_id = ct.id)
         )), '[]'::jsonb)
    into v_removed
    from public.cell_touchpoints ct
    join public.touchpoints tp on tp.id = ct.touchpoint_id
   where ct.cell_id = p_cell_id
     and tp.name not in (
       select w.name from jsonb_to_recordset(v_wanted) as w(name text, position int)
     );

  -- A removed placement with anything on it stays as a name-only row —
  -- words, role and resources intact, drawn dashed — unless the cell already
  -- keeps a name-only row under that name. One with nothing on it goes.
  update public.cell_touchpoints ct
     set touchpoint_id = null,
         name          = tp.name,
         updated_at    = now()
    from public.touchpoints tp
   where ct.touchpoint_id = tp.id
     and ct.cell_id = p_cell_id
     and tp.name not in (
       select w.name from jsonb_to_recordset(v_wanted) as w(name text, position int)
     )
     and (coalesce(btrim(ct.summary), '') <> ''
          or ct.role is not null
          or exists (select 1 from public.resources r where r.cell_touchpoint_id = ct.id))
     and not exists (select 1 from public.cell_touchpoints x
                      where x.cell_id = p_cell_id and x.name is not null
                        and lower(x.name) = lower(tp.name));

  delete from public.cell_touchpoints ct
   using public.touchpoints tp
   where ct.touchpoint_id = tp.id
     and ct.cell_id = p_cell_id
     and tp.name not in (
       select w.name from jsonb_to_recordset(v_wanted) as w(name text, position int)
     );

  update public.cell_touchpoints ct
     set position = w.position,
         updated_at = now()
    from public.touchpoints tp,
         jsonb_to_recordset(v_wanted) as w(name text, position int)
   where ct.touchpoint_id = tp.id
     and ct.cell_id = p_cell_id
     and tp.name = w.name
     and ct.position is distinct from w.position;

  -- Name-only rows sit after the text's own, in the order they had.
  update public.cell_touchpoints ct
     set position = ranked.position,
         updated_at = now()
    from (
      select x.id,
             (select coalesce(max(position), -1) from public.cell_touchpoints y
               where y.cell_id = p_cell_id and y.touchpoint_id is not null)
             + row_number() over (order by x.position, x.name) as position
        from public.cell_touchpoints x
       where x.cell_id = p_cell_id and x.touchpoint_id is null
    ) ranked
   where ct.id = ranked.id
     and ct.position is distinct from ranked.position;

  insert into public.cell_touchpoints (cell_id, touchpoint_id, position, origin)
  select p_cell_id, tp.id, w.position, 'app'
    from jsonb_to_recordset(v_wanted) as w(name text, position int)
    join public.touchpoints tp
      on tp.service_id = v_service_id and tp.name = w.name
   where not exists (
     select 1 from public.cell_touchpoints ct
      where ct.cell_id = p_cell_id and ct.touchpoint_id = tp.id
   );

  return jsonb_build_object('skipped', false, 'removed', v_removed);
end
$function$;

create or replace function public.restore_cell_touchpoints(p_cell_id uuid, p_rows jsonb)
returns void
language plpgsql
security definer
set search_path = public, pg_catalog, pg_temp
as $function$
begin
  if not public.is_service_account() then
    raise exception 'This account cannot edit the blueprint' using errcode = '42501';
  end if;

  -- By name, linked or name-only: the revert re-ran the sync first, so a
  -- row that was kept name-only is linked again by the time this runs.
  update public.cell_touchpoints ct
     set summary    = r.summary,
         role       = r.role,
         updated_at = now()
    from jsonb_to_recordset(coalesce(p_rows, '[]'::jsonb))
           as r(name text, summary text, role text)
   where ct.cell_id = p_cell_id
     and ((ct.touchpoint_id is not null
           and exists (select 1 from public.touchpoints tp
                        where tp.id = ct.touchpoint_id and tp.name = r.name))
          or (ct.touchpoint_id is null and lower(ct.name) = lower(r.name)));

  -- The resources the placement carried, for a placement that has none —
  -- the one the same revert just re-inserted. One that still has its own
  -- is left alone rather than doubled.
  insert into public.resources
    (cell_id, cell_touchpoint_id, kind, name, url, position, featured, origin)
  select p_cell_id, ct.id,
         coalesce(nullif(btrim(e.kind), ''), 'link'), e.name, e.url,
         coalesce(e.position, e.ord::int - 1), coalesce(e.featured, false),
         coalesce(nullif(btrim(e.origin), ''), 'app')
    from jsonb_to_recordset(coalesce(p_rows, '[]'::jsonb))
           as r(name text, resources jsonb)
    join public.cell_touchpoints ct on ct.cell_id = p_cell_id
    left join public.touchpoints tp on tp.id = ct.touchpoint_id
    cross join lateral (
           select x.kind, x.name, x.url, x.position, x.featured, x.origin, x.ord
             from rows from (
                    jsonb_to_recordset(coalesce(r.resources, '[]'::jsonb))
                      as (kind text, name text, url text, position int, featured boolean, origin text)
                  ) with ordinality as x(kind, name, url, position, featured, origin, ord)
         ) e
   where ((ct.touchpoint_id is not null and tp.name = r.name)
          or (ct.touchpoint_id is null and lower(ct.name) = lower(r.name)))
     and nullif(btrim(e.url), '') is not null
     and not exists (select 1 from public.resources have where have.cell_touchpoint_id = ct.id);
end
$function$;

create or replace function public.set_placement_touchpoint(
  p_placement_id uuid,
  p_touchpoint_id uuid default null,
  p_name text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_catalog, pg_temp
as $function$
declare
  v_row public.cell_touchpoints;
  v_service_id uuid;
begin
  if not public.is_service_account() then
    raise exception 'This account cannot edit the blueprint' using errcode = '42501';
  end if;
  if (p_touchpoint_id is null) = (nullif(btrim(coalesce(p_name, '')), '') is null) then
    raise exception 'a placement names its touchpoint one way: a registry id or a name';
  end if;

  select ct.* into v_row from public.cell_touchpoints ct where ct.id = p_placement_id for update;
  if v_row.id is null then
    raise exception 'placement % does not exist', p_placement_id;
  end if;

  if p_touchpoint_id is not null then
    select ph.service_id into v_service_id
      from public.cells c
      join public.paths p on p.id = c.path_id
      join public.scenarios s on s.id = p.scenario_id
      join public.phases ph on ph.id = s.phase_id
     where c.id = v_row.cell_id;
    if not exists (select 1 from public.touchpoints tp
                    where tp.id = p_touchpoint_id and tp.service_id = v_service_id) then
      raise exception 'that touchpoint is not in this service''s registry';
    end if;
    if exists (select 1 from public.cell_touchpoints x
                where x.cell_id = v_row.cell_id and x.touchpoint_id = p_touchpoint_id and x.id <> v_row.id) then
      raise exception 'that cell already shows that touchpoint';
    end if;
  end if;

  update public.cell_touchpoints
     set touchpoint_id = p_touchpoint_id,
         name          = case when p_touchpoint_id is null then btrim(p_name) end,
         updated_at    = now()
   where id = p_placement_id;

  return jsonb_build_object('touchpoint_id', v_row.touchpoint_id, 'name', v_row.name);
end
$function$;

create or replace function public.remove_placement(p_placement_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_catalog, pg_temp
as $function$
declare
  v_row       jsonb;
  v_resources jsonb;
begin
  if not public.is_service_account() then
    raise exception 'This account cannot edit the blueprint' using errcode = '42501';
  end if;

  select to_jsonb(ct) into v_row from public.cell_touchpoints ct where ct.id = p_placement_id for update;
  if v_row is null then
    raise exception 'placement % does not exist', p_placement_id;
  end if;

  select coalesce(jsonb_agg(to_jsonb(r) order by r.position), '[]'::jsonb)
    into v_resources
    from public.resources r where r.cell_touchpoint_id = p_placement_id;

  delete from public.cell_touchpoints where id = p_placement_id;

  return jsonb_build_object('row', v_row, 'resources', v_resources);
end
$function$;

create or replace function public.restore_placement(p_row jsonb, p_resources jsonb default '[]'::jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_catalog, pg_temp
as $function$
declare
  v_id uuid;
begin
  if not public.is_service_account() then
    raise exception 'This account cannot edit the blueprint' using errcode = '42501';
  end if;

  insert into public.cell_touchpoints
    (id, cell_id, touchpoint_id, name, position, summary, role, origin, created_at)
  select r.id, r.cell_id, r.touchpoint_id, r.name,
         -- Its old position if free, else after everything the cell shows.
         case when exists (select 1 from public.cell_touchpoints x
                            where x.cell_id = r.cell_id and x.position = r.position)
              then (select coalesce(max(position), -1) + 1 from public.cell_touchpoints x
                     where x.cell_id = r.cell_id)
              else r.position end,
         r.summary, r.role, coalesce(r.origin, 'app'), coalesce(r.created_at, now())
    from jsonb_to_record(p_row)
      as r(id uuid, cell_id uuid, touchpoint_id uuid, name text, position int,
           summary text, role text, origin text, created_at timestamptz)
  returning id into v_id;

  if v_id is null then
    raise exception 'the captured placement could not be restored';
  end if;

  insert into public.resources
    (id, cell_id, cell_touchpoint_id, kind, name, url, position, featured, origin)
  select coalesce(e.id, gen_random_uuid()), (p_row ->> 'cell_id')::uuid, v_id,
         coalesce(nullif(btrim(e.kind), ''), 'link'), e.name, e.url,
         coalesce(e.position, e.ord::int - 1), coalesce(e.featured, false),
         coalesce(nullif(btrim(e.origin), ''), 'app')
    from rows from (
           jsonb_to_recordset(coalesce(p_resources, '[]'::jsonb))
             as (id uuid, kind text, name text, url text, position int, featured boolean, origin text)
         ) with ordinality as e(id, kind, name, url, position, featured, origin, ord)
   where nullif(btrim(e.url), '') is not null;

  return jsonb_build_object('placement_id', v_id);
end
$function$;

comment on function public.sync_cell_touchpoints(uuid, text[]) is
  'Brings a cell''s placements into line with its text. A new name mints a '
  'registry row; a name typed back links the name-only row; a removed '
  'placement with anything on it becomes name-only, one with nothing is '
  'deleted. Returns what it removed, for restore_cell_touchpoints.';
comment on function public.restore_cell_touchpoints(uuid, jsonb) is
  'The inverse of a sync: summary and role back by name, linked or '
  'name-only; resources re-created for a row that has none.';
comment on function public.set_placement_touchpoint(uuid, uuid, text) is
  'Names a placement''s touchpoint one way — a registry id, or a name the '
  'registry lacks — and returns the previous pair, which is the inverse.';
comment on function public.remove_placement(uuid) is
  'Deletes one placement and returns the row and its resources for '
  'restore_placement.';
comment on function public.restore_placement(jsonb, jsonb) is
  'The inverse of remove_placement: the row back under its own id, '
  'resources included.';

-- ---------------------------------------------------------------------------
-- 5. The copy functions carry a placement's identity across
-- ---------------------------------------------------------------------------

do $rewrite$
declare
  target record;
  after  text;
  rewritten int := 0;
begin
  for target in
    select p.oid, p.proname
      from pg_proc p
      join pg_namespace n on n.oid = p.pronamespace
     where n.nspname = 'public'
       and p.proname in ('duplicate_path', 'duplicate_scenario')
  loop
    after := pg_get_functiondef(target.oid);
    after := replace(after,
      '(cell_id, name, position, summary, role, origin)',
      '(cell_id, touchpoint_id, name, position, summary, role, origin)');
    after := replace(after,
      'select nc.id, ct.name, ct.position, ct.summary, ct.role, ''app''',
      'select nc.id, ct.touchpoint_id, ct.name, ct.position, ct.summary, ct.role, ''app''');
    after := replace(after,
      'on nct.cell_id = nc.id and nct.name = ct.name',
      'on nct.cell_id = nc.id and nct.touchpoint_id is not distinct from ct.touchpoint_id and nct.name is not distinct from ct.name');
    -- Found while proving the copy: duplicate_path's default kind was still
    -- 'alternative', a value paths_kind_check has refused since the kinds
    -- became happy | variant | exception. A copy is a variant.
    after := replace(after,
      'kind text DEFAULT ''alternative''::text',
      'kind text DEFAULT ''variant''::text');
    if after ~ '''alternative''' then
      raise exception '% still defaults a path kind the check refuses', target.proname;
    end if;
    if after !~ 'ct\.touchpoint_id, ct\.name' or after !~ 'nct\.touchpoint_id is not distinct from' then
      raise exception '% does not carry a placement''s identity', target.proname;
    end if;
    execute after;
    rewritten := rewritten + 1;
  end loop;
  if rewritten <> 2 then
    raise exception 'expected to rewrite duplicate_path and duplicate_scenario, rewrote %', rewritten;
  end if;
end
$rewrite$;


-- ---------------------------------------------------------------------------
-- The IR revision this shape is
-- ---------------------------------------------------------------------------

update public.schema_version
set version = '2026.09.07',
    applied_at = now();

do $version$
begin
  if not exists (select 1 from public.schema_version where version = '2026.09.07') then
    raise exception 'schema_version did not take the bump';
  end if;
end
$version$;

-- ---------------------------------------------------------------------------
-- Proof — invariants, never censuses
-- ---------------------------------------------------------------------------

do $proof$
declare
  bad int;
  fn  text;
begin
  if to_regclass('public.touchpoints') is null then
    raise exception 'the registry is missing';
  end if;
  if not exists (select 1 from pg_constraint
                  where conrelid = 'public.cell_touchpoints'::regclass
                    and conname = 'cell_touchpoints_one_identity') then
    raise exception 'cell_touchpoints has no one-identity check';
  end if;

  select count(*) into bad from public.cell_touchpoints
   where (touchpoint_id is null) = (name is null);
  if bad <> 0 then
    raise exception '% placements name their touchpoint both ways or neither', bad;
  end if;

  -- The fold left nothing name-only that its service's registry could name.
  select count(*) into bad
    from public.cell_touchpoints ct
    join public.cells c on c.id = ct.cell_id
    join public.paths p on p.id = c.path_id
    join public.scenarios s on s.id = p.scenario_id
    join public.phases ph on ph.id = s.phase_id
   where ct.name is not null
     and exists (select 1 from public.touchpoints tp
                  where tp.service_id = ph.service_id and lower(tp.name) = lower(ct.name));
  if bad <> 0 then
    raise exception '% placements stayed name-only with their name in the registry', bad;
  end if;

  foreach fn in array array[
    'public.sync_cell_touchpoints(uuid, text[])',
    'public.restore_cell_touchpoints(uuid, jsonb)',
    'public.set_placement_touchpoint(uuid, uuid, text)',
    'public.remove_placement(uuid)',
    'public.restore_placement(jsonb, jsonb)'
  ] loop
    if not (select prosecdef from pg_proc where oid = fn::regprocedure) then
      raise exception '% is not SECURITY DEFINER', fn;
    end if;
  end loop;
end
$proof$;
