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
