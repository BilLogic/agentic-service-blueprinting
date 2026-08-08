-- Derived layer: slices, findings, evidence, propositions + cell/lane/phase spec fields.
-- Plan: agentic-service-blueprinting docs/plans/2026-07-29-002 (stage 1: uno-blueprint).
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
  created_by uuid default auth.uid(),
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
  created_by uuid default auth.uid(),
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

-- ============================================================
-- 4. RLS + grants
-- ============================================================
-- REQUIRED companion (deploy step, not SQL): disable public sign-ups in Auth settings
-- and use shouldCreateUser:false in the frontend — otherwise "authenticated" means
-- anyone on the internet. TO authenticated is authentication, not authorization:
-- acceptable for a closed team only.

alter table public.slices enable row level security;
alter table public.slice_items enable row level security;
alter table public.findings enable row level security;
alter table public.evidence enable row level security;
alter table public.propositions enable row level security;

-- slices / slice_items: public read, authenticated write
create policy "slices_select" on public.slices for select using (true);
create policy "slices_insert_auth" on public.slices
  for insert to authenticated with check (true);
create policy "slices_update_auth" on public.slices
  for update to authenticated using (true) with check (true);
create policy "slices_delete_auth" on public.slices
  for delete to authenticated using (true);

create policy "slice_items_select" on public.slice_items for select using (true);
create policy "slice_items_insert_auth" on public.slice_items
  for insert to authenticated with check (true);
create policy "slice_items_update_auth" on public.slice_items
  for update to authenticated using (true) with check (true);
create policy "slice_items_delete_auth" on public.slice_items
  for delete to authenticated using (true);

-- findings: public read; humans may flip STATUS only (column grant below); no
-- insert/delete for authenticated — skills write via service key.
create policy "findings_select" on public.findings for select using (true);
create policy "findings_update_auth" on public.findings
  for update to authenticated using (true) with check (true);
revoke insert, update, delete on public.findings from authenticated;
grant update (status) on public.findings to authenticated;

-- evidence / propositions: restricted read (interview excerpts, pricing are not
-- world-readable on public deploys); authenticated write.
create policy "evidence_select_auth" on public.evidence
  for select to authenticated using (true);
create policy "evidence_insert_auth" on public.evidence
  for insert to authenticated with check (true);
create policy "evidence_update_auth" on public.evidence
  for update to authenticated using (true) with check (true);
create policy "evidence_delete_auth" on public.evidence
  for delete to authenticated using (true);

create policy "propositions_select_auth" on public.propositions
  for select to authenticated using (true);
create policy "propositions_insert_auth" on public.propositions
  for insert to authenticated with check (true);
create policy "propositions_update_auth" on public.propositions
  for update to authenticated using (true) with check (true);

-- evidence_counts view: public (counts only, no content)
grant select on public.evidence_counts to anon, authenticated;

-- Human-editable spec columns on IR-owned tables: column-scoped UPDATE only.
-- (Content columns stay service-key-only.)
create policy "cells_update_auth" on public.cells
  for update to authenticated using (true) with check (true);
revoke update on public.cells from authenticated;
grant update (function, form, value_props, owner, perceived_owner)
  on public.cells to authenticated;

create policy "layers_update_auth" on public.layers
  for update to authenticated using (true) with check (true);
revoke update on public.layers from authenticated;
grant update (owner_team, kpis, tools) on public.layers to authenticated;

create policy "phases_update_auth" on public.phases
  for update to authenticated using (true) with check (true);
revoke update on public.phases from authenticated;
grant update (business_impact, operational_requirements) on public.phases to authenticated;

-- ============================================================
-- 5. Storage bucket for slice illustrations
-- ============================================================
-- Object paths come only from DB ids/positions:
--   slices/<slice_id>/frame-<position>.png, slices/<slice_id>/character-ref.png

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('slice-illustrations', 'slice-illustrations', true, 5242880, array['image/png'])
on conflict (id) do nothing;

-- storage.objects policies fail on hosted Supabase when the migration role doesn't own
-- the table ("must be owner"): apply where possible, degrade visibly otherwise (writes
-- then go through the service key only; see deploy notes).
do $$
begin
  create policy "slice_illustrations_insert" on storage.objects
    for insert to authenticated
    with check (
      bucket_id = 'slice-illustrations'
      and name ~ '^slices/[0-9a-f-]{36}/(frame-[0-9]+|character-ref)\.png$'
    );
  create policy "slice_illustrations_select" on storage.objects
    for select to authenticated
    using (bucket_id = 'slice-illustrations');
  create policy "slice_illustrations_update" on storage.objects
    for update to authenticated
    using (bucket_id = 'slice-illustrations')
    with check (
      bucket_id = 'slice-illustrations'
      and name ~ '^slices/[0-9a-f-]{36}/(frame-[0-9]+|character-ref)\.png$'
    );
exception
  when insufficient_privilege then
    raise notice 'storage.objects policies skipped (not owner): bucket writes are service-key only until policies are added via the dashboard.';
end $$;
