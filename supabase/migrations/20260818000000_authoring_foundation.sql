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

-- @recipe — everything from here is roles, RLS, grants and the storage
-- bucket, plus the one column default that stamps the caller.
alter table public.deleted_structure alter column deleted_by set default auth.uid();

alter table public.deleted_structure enable row level security;

-- Readable by anyone who can read the blueprint (the recovery list is part of
-- the editor); written only by the delete functions, which run as definer.
drop policy if exists "deleted_structure_select" on public.deleted_structure;
create policy "deleted_structure_select" on public.deleted_structure
  for select using (true);

grant select on public.deleted_structure to anon, authenticated;
revoke insert, update, delete, truncate on public.deleted_structure
  from anon, authenticated;

-- ---------------------------------------------------------------------------
-- Ordinary column writes the panel does directly (no function needed): the
-- blueprint's own text, and the resource links. Structural shape stays behind
-- the RPCs. Column grants accumulate on top of the derived layer's spec-field
-- grants (cells: function/form/value_props/owner/perceived_owner; layers:
-- owner_team/kpis/tools; phases: business_impact/operational_requirements).
-- ---------------------------------------------------------------------------
-- AMENDED. This granted `links` too, until `21000113000000` dissolved that
-- column into `resources`, `cell_touchpoints` and `evidence`.
--
-- An applied migration normally keeps the statement it was written with, and
-- this repository means that rule. It is spent here because leaving it made
-- the PORTABLE CORE UNAPPLIABLE — the artifact this template exists to ship.
-- The recipe is generated by flattening the series and is applied on top of
-- the core in one pass, so this grant ran after the drop and failed with
-- `column "links" of relation "cells" does not exist`. No superseding grant
-- later in the series can fix that; the statement has to stop naming a column
-- that will not exist.
--
-- `check:portable-core` compares the generated files against the migrations
-- and both agreed, so it stayed green. What caught it is the CI job that
-- APPLIES the recipe to a real Postgres. The two are not redundant.
grant update (content, description) on public.cells to authenticated;
grant update (name, layer_role) on public.layers to authenticated;
grant update (name) on public.steps to authenticated;
grant update (name, description, note, path_type) on public.paths to authenticated;
grant update (name, description, view_type) on public.service_scenarios to authenticated;

-- cells/layers/phases already carry update policies from the derived layer;
-- steps, paths and scenarios gain theirs here.
drop policy if exists "steps_update_auth" on public.steps;
create policy "steps_update_auth" on public.steps
  for update to authenticated using (true) with check (true);
drop policy if exists "paths_update_auth" on public.paths;
create policy "paths_update_auth" on public.paths
  for update to authenticated using (true) with check (true);
drop policy if exists "service_scenarios_update_auth" on public.service_scenarios;
create policy "service_scenarios_update_auth" on public.service_scenarios
  for update to authenticated using (true) with check (true);

-- ---------------------------------------------------------------------------
-- Evidence is display content, and the deployed app is a read-only viewer:
-- every other content table (cells, slices) already grants anon SELECT.
-- Evidence being authenticated-only surfaced as "permission denied for table
-- evidence" in the panel's Evidence tab for every visitor. Writes stay
-- authenticated-only, unchanged.
--
-- ⚠ Adopter decision: this makes evidence rows (including interview
-- excerpts) readable on public deploys. If your evidence holds sensitive
-- excerpts, drop this policy + grant AND revert the evidence_counts
-- security_invoker change below (the owner-rights view is what keeps the
-- anonymous assumption-lens count working without content access).
-- ---------------------------------------------------------------------------
grant select on public.evidence to anon;
drop policy if exists evidence_select_anon on public.evidence;
create policy evidence_select_anon on public.evidence
  for select to anon using (true);

-- With evidence publicly readable, the counts view's owner-rights execution
-- guards nothing (security-definer-view advisor ERROR): run it as the
-- querying user. Coupled to the anon-read decision above — see the warning.
alter view public.evidence_counts set (security_invoker = true);

-- ---------------------------------------------------------------------------
-- Findings canvas writes, in their final hardened form: the in-app agent
-- records findings directly, same as the IDE flow's service-key writes.
-- A finding may only be INSERTED as open — the dedupe rule is "dismissed
-- stays dismissed", so an insert that could set status directly would let one
-- forged row permanently suppress a real finding from every future audit run.
-- The UPDATE grant is column-narrowed: the derived layer's "humans may flip
-- STATUS only" widened only to the columns record-finding update-in-place
-- actually writes. Delete stays revoked everywhere;
-- findings_open_fingerprint_idx remains the dedupe backstop.
-- ---------------------------------------------------------------------------
drop policy if exists "findings_insert_auth" on public.findings;
create policy "findings_insert_auth" on public.findings
  for insert to authenticated with check (status = 'open');

grant insert on public.findings to authenticated;
revoke update on public.findings from authenticated;
grant update (status, note, severity, run_id, cell_ids, cell_keys, source)
  on public.findings to authenticated;

-- @core
comment on table public.findings is
  'Audit / whatif / import-sweep outputs. Written by skills (IDE service key or canvas authenticated agent); humans triage by status.';

-- @recipe — the storage bucket and its object policies.

-- ---------------------------------------------------------------------------
-- Storyboard uploads: people drop JPEGs and WebPs, and a mime rejection reads
-- like a bug rather than a rule.
-- ---------------------------------------------------------------------------
update storage.buckets
  set allowed_mime_types = array['image/png', 'image/jpeg', 'image/webp']
  where id = 'slice-illustrations';

-- The bucket's write policies name the *only* paths that may be written, and
-- the derived layer's pattern accepts none of the paths the app builds:
--
--   1. It hard-codes `\.png$`, so widening the mime types above would have
--      changed nothing — a JPEG would clear the bucket check and then be
--      refused by the policy.
--   2. It keys a frame's image by *position* (`frame-3.png`). Positions move:
--      splitting or reordering frames renumbers them, so every image would
--      silently repoint at a different frame. The app keys by `slice_items.id`
--      instead, which is stable across every edit that is not a delete.
--
-- The old names stay accepted so anything already uploaded keeps resolving.
-- Guarded: on hosted Supabase the migration role may not own storage.objects.
do $$
begin
  drop policy if exists "slice_illustrations_insert" on storage.objects;
  drop policy if exists "slice_illustrations_update" on storage.objects;

  create policy "slice_illustrations_insert" on storage.objects
    for insert to authenticated
    with check (
      bucket_id = 'slice-illustrations'
      and name ~ '^slices/[0-9a-f-]{36}/([0-9a-f-]{36}|frame-[0-9]+|character-ref)\.(png|jpg|webp)$'
    );
  create policy "slice_illustrations_update" on storage.objects
    for update to authenticated
    using (bucket_id = 'slice-illustrations')
    with check (
      bucket_id = 'slice-illustrations'
      and name ~ '^slices/[0-9a-f-]{36}/([0-9a-f-]{36}|frame-[0-9]+|character-ref)\.(png|jpg|webp)$'
    );
exception
  when insufficient_privilege then
    raise notice 'storage.objects policies skipped (not owner): bucket writes stay service-key only until these are added via the dashboard.';
end $$;
