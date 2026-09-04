-- The Supabase recipe — one conformant reference implementation.
--
-- ⚠ GENERATED FILE — DO NOT EDIT. Every line below was emitted from the
-- partition marks in supabase/migrations/. Edit the migration, then run
-- `npm run generate:portable-core`. A hand-edit is reverted by CI, which
-- regenerates this file and fails on any difference.
--
-- ⚠ GENERATED, and also OPTIONAL. Applied on top of the portable core, this
-- is how *Supabase* enforces the contract: request-scoped attribution from
-- `auth.uid()`, the anon / authenticated / service_role grants, the RLS
-- policies, the storage bucket for slice illustrations, and the optional
-- service-account tier.
--
-- It is fully supported — this is what the shipped app runs on. It is not
-- the contract. Another host writes its own recipe against the same core and
-- is just as conformant, which is the point of the partition.
--
-- Applying this needs the Supabase primitives to exist. In CI that is
-- supabase/portable/supabase-shim.sql, a harness and not something an
-- adopter installs.
--
-- Fragments carry the CURRENT vocabulary, not the one their migration was
-- written in: the core's renames are followed through. See the generator.
-- ─────────────────────────────────────────────────────────────────────────

-- ─────────────────────────────────────────────────────────────────────────
-- 20260716200000_template_schema.sql
-- ─────────────────────────────────────────────────────────────────────────

-- RLS and the read-only anon policies.
-- ---------------------------------------------------------------------------
-- Row Level Security (read-only for anon until auth is added)
-- ---------------------------------------------------------------------------

alter table public.services enable row level security;
alter table public.phases enable row level security;
alter table public.scenarios enable row level security;
alter table public.paths enable row level security;
alter table public.lanes enable row level security;
alter table public.steps enable row level security;
alter table public.path_steps enable row level security;
alter table public.cells enable row level security;
alter table public.cell_dependencies enable row level security;

create policy "services_select" on public.services for select using (true);
create policy "phases_select" on public.phases for select using (true);
create policy "scenarios_select" on public.scenarios for select using (true);
create policy "paths_select" on public.paths for select using (true);
create policy "lanes_select" on public.lanes for select using (true);
create policy "steps_select" on public.steps for select using (true);
create policy "path_steps_select" on public.path_steps for select using (true);
create policy "cells_select" on public.cells for select using (true);
create policy "cell_dependencies_select" on public.cell_dependencies for select using (true);

-- ─────────────────────────────────────────────────────────────────────────
-- 20260729120000_derived_layer.sql
-- ─────────────────────────────────────────────────────────────────────────

-- RLS, the role grants, and the storage bucket the app uploads to.
-- ============================================================
-- 4. RLS + grants
-- ============================================================
-- Attribution stamps the caller. On another host it is that host's
-- request-scoped identity; the COLUMN is core, the value it takes is not.
alter table public.slices   alter column created_by set default auth.uid();
alter table public.evidence alter column created_by set default auth.uid();

-- REQUIRED companion (deploy step, not SQL): disable public sign-ups in Auth settings
-- and use shouldCreateUser:false in the frontend — otherwise "authenticated" means
-- anyone on the internet. TO authenticated is authentication, not authorization:
-- acceptable for a closed team only.

alter table public.slices enable row level security;
alter table public.slides enable row level security;
alter table public.audit_findings enable row level security;
alter table public.evidence enable row level security;
alter table public.business_models enable row level security;

-- slices / slides: public read, authenticated write
create policy "slices_select" on public.slices for select using (true);
create policy "slices_insert_auth" on public.slices
  for insert to authenticated with check (true);
create policy "slices_update_auth" on public.slices
  for update to authenticated using (true) with check (true);
create policy "slices_delete_auth" on public.slices
  for delete to authenticated using (true);

create policy "slice_items_select" on public.slides for select using (true);
create policy "slice_items_insert_auth" on public.slides
  for insert to authenticated with check (true);
create policy "slice_items_update_auth" on public.slides
  for update to authenticated using (true) with check (true);
create policy "slice_items_delete_auth" on public.slides
  for delete to authenticated using (true);

-- audit_findings: public read; humans may flip STATUS only (column grant below); no
-- insert/delete for authenticated — skills write via service key.
create policy "findings_select" on public.audit_findings for select using (true);
create policy "findings_update_auth" on public.audit_findings
  for update to authenticated using (true) with check (true);
revoke insert, update, delete on public.audit_findings from authenticated;
grant update (status) on public.audit_findings to authenticated;

-- evidence / business_models: restricted read (interview excerpts, pricing are not
-- world-readable on public deploys); authenticated write.
create policy "evidence_select_auth" on public.evidence
  for select to authenticated using (true);
create policy "evidence_insert_auth" on public.evidence
  for insert to authenticated with check (true);
create policy "evidence_update_auth" on public.evidence
  for update to authenticated using (true) with check (true);
create policy "evidence_delete_auth" on public.evidence
  for delete to authenticated using (true);

create policy "propositions_select_auth" on public.business_models
  for select to authenticated using (true);
create policy "propositions_insert_auth" on public.business_models
  for insert to authenticated with check (true);
create policy "propositions_update_auth" on public.business_models
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

create policy "lanes_update_auth" on public.lanes
  for update to authenticated using (true) with check (true);
revoke update on public.lanes from authenticated;
grant update (owner_team, kpis, tools) on public.lanes to authenticated;

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

-- ─────────────────────────────────────────────────────────────────────────
-- 20260730090000_derived_layer_grants_hardening.sql
-- ─────────────────────────────────────────────────────────────────────────

-- F1 is entirely about the anon / authenticated roles.
-- ---- F1: explicit exposure grants ----
grant select on public.slices, public.slides, public.audit_findings to anon, authenticated;
grant select on public.evidence, public.business_models to authenticated;
grant insert, update, delete on public.slices, public.slides, public.evidence to authenticated;
grant insert, update on public.business_models to authenticated;
grant select on public.evidence_counts to anon, authenticated;

-- Defense-in-depth: strip legacy write privileges from anon (RLS already blocks the
-- DML, but TRUNCATE is not subject to RLS) and TRUNCATE from both roles everywhere.
revoke insert, update, delete, truncate on public.slices, public.slides,
  public.audit_findings, public.evidence, public.business_models from anon;
revoke select on public.evidence, public.business_models from anon;
revoke truncate on public.slices, public.slides, public.audit_findings,
  public.evidence, public.business_models, public.cells, public.lanes, public.phases
  from anon, authenticated;
revoke insert, update, delete on public.evidence_counts from anon, authenticated;

-- who "the caller" is, on Supabase.
alter table public.slides  alter column created_by set default auth.uid();
alter table public.business_models alter column created_by set default auth.uid();

-- ─────────────────────────────────────────────────────────────────────────
-- 20260818000000_authoring_foundation.sql
-- ─────────────────────────────────────────────────────────────────────────

-- everything from here is roles, RLS, grants and the storage
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
-- grants (cells: function/form/value_props/owner/perceived_owner; lanes:
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
grant update (content, summary) on public.cells to authenticated;
grant update (name, lane_role) on public.lanes to authenticated;
grant update (name) on public.steps to authenticated;
grant update (name, summary, summary, kind) on public.paths to authenticated;
grant update (name, summary, layout) on public.scenarios to authenticated;

-- cells/lanes/phases already carry update policies from the derived layer;
-- steps, paths and scenarios gain theirs here.
drop policy if exists "steps_update_auth" on public.steps;
create policy "steps_update_auth" on public.steps
  for update to authenticated using (true) with check (true);
drop policy if exists "paths_update_auth" on public.paths;
create policy "paths_update_auth" on public.paths
  for update to authenticated using (true) with check (true);
drop policy if exists "scenarios_update_auth" on public.scenarios;
create policy "scenarios_update_auth" on public.scenarios
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
-- records audit_findings directly, same as the IDE flow's service-key writes.
-- A finding may only be INSERTED as open — the dedupe rule is "dismissed
-- stays dismissed", so an insert that could set status directly would let one
-- forged row permanently suppress a real finding from every future audit run.
-- The UPDATE grant is column-narrowed: the derived layer's "humans may flip
-- STATUS only" widened only to the columns record-finding update-in-place
-- actually writes. Delete stays revoked everywhere;
-- findings_open_fingerprint_idx remains the dedupe backstop.
-- ---------------------------------------------------------------------------
drop policy if exists "findings_insert_auth" on public.audit_findings;
create policy "findings_insert_auth" on public.audit_findings
  for insert to authenticated with check (status = 'open');

grant insert on public.audit_findings to authenticated;
revoke update on public.audit_findings from authenticated;
grant update (status, summary, severity, run_id, cell_ids, cell_keys, source)
  on public.audit_findings to authenticated;

-- the storage bucket and its object policies.

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
--      silently repoint at a different frame. The app keys by `slides.id`
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

-- ─────────────────────────────────────────────────────────────────────────
-- 20260818001000_authoring_operations.sql
-- ─────────────────────────────────────────────────────────────────────────

-- the seam is core; naming the Supabase roles that may read it
-- is not.
grant execute on function public.is_service_account() to anon, authenticated;

-- Grants, part 2: the Supabase roles.
--
-- Read helpers stay open to anon on purpose: stable/immutable, no writes,
-- and they only describe data already readable through the SELECT policies.
-- The writes are revoked from anon and granted to `authenticated`, which
-- names the one role supposed to hold them. Another host substitutes its own
-- caller classes here; the PUBLIC revoke above stands either way.

-- Read helpers: open to anon.
grant execute on function public.key_slug(text) to anon, authenticated;
grant execute on function public.cell_natural_key(uuid) to anon, authenticated;
grant execute on function public.mint_cell_key(uuid, uuid, uuid) to anon, authenticated;
grant execute on function public.slices_referencing(uuid[]) to anon, authenticated;
grant execute on function public.deletion_impact(text, uuid) to anon, authenticated;

-- Writes: anon loses what PUBLIC already lost …
revoke execute on function public.create_scenario(uuid, text, text, uuid, jsonb, int, text) from anon;
revoke execute on function public.duplicate_scenario(uuid, text) from anon;
revoke execute on function public.create_phase(uuid, text, text) from anon;
revoke execute on function public.create_path(uuid, text, text, uuid) from anon;
revoke execute on function public.duplicate_path(uuid, text, text, boolean, boolean) from anon;
revoke execute on function public.add_step(uuid, text, int) from anon;
revoke execute on function public.add_lane(uuid, text, text, int) from anon;
revoke execute on function public.reorder_steps(uuid, uuid[]) from anon;
revoke execute on function public.set_path_steps(uuid, uuid[]) from anon;
revoke execute on function public.reorder_lanes(uuid, text[]) from anon;
revoke execute on function public.upsert_cell(uuid, uuid, uuid, text) from anon;
revoke execute on function public.set_cell_dependency(uuid, uuid, text, text, text) from anon;
revoke execute on function public.clear_cell_dependency(uuid) from anon;
revoke execute on function public.rename_phase(uuid, text) from anon;
revoke execute on function public.rename_scenario(uuid, text) from anon;
revoke execute on function public.rename_path(uuid, text) from anon;
revoke execute on function public.rename_owner_tag(text, text) from anon;
revoke execute on function public.delete_scenario(uuid) from anon;
revoke execute on function public.delete_path(uuid) from anon;
revoke execute on function public.remove_step(uuid, uuid) from anon;
revoke execute on function public.remove_lane(uuid, text) from anon;
revoke execute on function public.remove_lanes(uuid[]) from anon;
revoke execute on function public.delete_cell(uuid) from anon;

-- … and `authenticated` is named as the role that holds them.
grant execute on function public.create_scenario(uuid, text, text, uuid, jsonb, int, text) to authenticated;
grant execute on function public.duplicate_scenario(uuid, text) to authenticated;
grant execute on function public.create_phase(uuid, text, text) to authenticated;
grant execute on function public.create_path(uuid, text, text, uuid) to authenticated;
grant execute on function public.duplicate_path(uuid, text, text, boolean, boolean) to authenticated;
grant execute on function public.add_step(uuid, text, int) to authenticated;
grant execute on function public.add_lane(uuid, text, text, int) to authenticated;
grant execute on function public.reorder_steps(uuid, uuid[]) to authenticated;
grant execute on function public.set_path_steps(uuid, uuid[]) to authenticated;
grant execute on function public.reorder_lanes(uuid, text[]) to authenticated;
grant execute on function public.upsert_cell(uuid, uuid, uuid, text) to authenticated;
grant execute on function public.set_cell_dependency(uuid, uuid, text, text, text) to authenticated;
grant execute on function public.clear_cell_dependency(uuid) to authenticated;
grant execute on function public.rename_phase(uuid, text) to authenticated;
grant execute on function public.rename_scenario(uuid, text) to authenticated;
grant execute on function public.rename_path(uuid, text) to authenticated;
grant execute on function public.rename_owner_tag(text, text) to authenticated;
grant execute on function public.delete_scenario(uuid) to authenticated;
grant execute on function public.delete_path(uuid) to authenticated;
grant execute on function public.remove_step(uuid, uuid) to authenticated;
grant execute on function public.remove_lane(uuid, text) to authenticated;
grant execute on function public.remove_lanes(uuid[]) to authenticated;
grant execute on function public.delete_cell(uuid) to authenticated;

-- ─────────────────────────────────────────────────────────────────────────
-- 20260818002000_service_account_tier.sql
-- ─────────────────────────────────────────────────────────────────────────

-- this whole migration is the tier recipe. It is named that in
-- its own header: it reads a Supabase JWT, hangs a trigger on auth.users and
-- policies on storage.objects. Only the config table it reads is core.
create or replace function public.is_service_account()
returns boolean
language sql
stable
set search_path = pg_catalog, pg_temp
as $$
  select coalesce(
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'service',
    false
  )
$$;

comment on function public.is_service_account() is
  'True when the JWT app_metadata.role is service. Set via auth.users.raw_app_meta_data (service role only) or the service_account_emails config table — users cannot self-assign (user_metadata is ignored on purpose).';

grant execute on function public.is_service_account() to anon, authenticated;

-- ---------------------------------------------------------------------------
-- RESTRICTIVE write policies on every blueprint + derived-layer table. They
-- AND with the permissive policies, so a non-service session keeps its reads
-- but loses every direct write.
-- ---------------------------------------------------------------------------
do $$
declare
  t text;
begin
  foreach t in array array[
    'phases', 'scenarios', 'paths', 'steps', 'path_steps',
    'lanes', 'cells', 'cell_dependencies', 'slices', 'slides',
    'evidence', 'business_models', 'audit_findings'
  ] loop
    execute format('drop policy if exists %I on public.%I',
      t || '_insert_service_only', t);
    execute format('drop policy if exists %I on public.%I',
      t || '_update_service_only', t);
    execute format('drop policy if exists %I on public.%I',
      t || '_delete_service_only', t);
    execute format(
      'create policy %I on public.%I as restrictive for insert to authenticated with check (public.is_service_account())',
      t || '_insert_service_only', t);
    execute format(
      'create policy %I on public.%I as restrictive for update to authenticated using (public.is_service_account()) with check (public.is_service_account())',
      t || '_update_service_only', t);
    execute format(
      'create policy %I on public.%I as restrictive for delete to authenticated using (public.is_service_account())',
      t || '_delete_service_only', t);
  end loop;
end $$;

-- ---------------------------------------------------------------------------
-- Storage joins the tier: the slice-illustration policies check only bucket
-- and filename shape, so without this a viewer could upload and overwrite
-- any illustration in a public bucket. Guarded: on hosted Supabase the
-- migration role may not own storage.objects.
-- ---------------------------------------------------------------------------
do $$
begin
  drop policy if exists "slice_illustrations_service_only" on storage.objects;
  create policy "slice_illustrations_service_only"
    on storage.objects as restrictive for all to authenticated
    using (bucket_id <> 'slice-illustrations' or public.is_service_account())
    with check (bucket_id <> 'slice-illustrations' or public.is_service_account());
exception
  when insufficient_privilege then
    raise notice 'storage.objects tier policy skipped (not owner): add slice_illustrations_service_only via the dashboard.';
end $$;

-- ---------------------------------------------------------------------------
-- Enrollment config: which emails become service accounts at sign-up.
--
-- Empty by default — the adopter fills it. Service-role only: this table is
-- an operator control surface, not app data. (No RLS policies = no access
-- for anon/authenticated once RLS is enabled; service_role bypasses RLS.)
-- ---------------------------------------------------------------------------
alter table public.service_account_emails enable row level security;
revoke all on public.service_account_emails from public, anon, authenticated;

-- Stamp the role at account creation for allowlisted emails.
create or replace function public.flag_service_accounts()
returns trigger
language plpgsql
security definer
set search_path = public, pg_catalog, pg_temp
as $$
begin
  if exists (
    select 1 from public.service_account_emails e
    where lower(e.email) = lower(new.email)
  ) then
    new.raw_app_meta_data :=
      coalesce(new.raw_app_meta_data, '{}'::jsonb) || '{"role":"service"}'::jsonb;
  end if;
  return new;
end;
$$;

drop trigger if exists flag_service_accounts on auth.users;
create trigger flag_service_accounts
  before insert on auth.users
  for each row execute function public.flag_service_accounts();

-- Operator routine; it has no business on the public REST surface. The grant
-- that would expose it is the PUBLIC default (a per-role revoke alone is a
-- no-op), so PUBLIC is revoked explicitly.
revoke execute on function public.flag_service_accounts() from public;
revoke execute on function public.flag_service_accounts()
  from anon, authenticated;
grant execute on function public.flag_service_accounts() to service_role;

-- ─────────────────────────────────────────────────────────────────────────
-- 20260819000000_agent_surface.sql
-- ─────────────────────────────────────────────────────────────────────────

-- the caller stamp, RLS, the owner-scoped policies, and the
-- audit_findings grants: every one of them names a Supabase primitive.
alter table public.agent_sessions
  alter column created_by set default auth.uid();

alter table public.agent_sessions enable row level security;
alter table public.agent_messages enable row level security;

-- Transcripts are private to their author. The app never writes created_by —
-- the column default stamps the caller, which is exactly what the WITH CHECK
-- requires, so inserts pass and every read/update/delete is filtered to the
-- caller's own rows.
create policy "agent sessions are owner-scoped"
  on public.agent_sessions
  for all
  to authenticated
  using (created_by = auth.uid())
  with check (created_by = auth.uid());

create policy "agent messages are owner-scoped"
  on public.agent_messages
  for all
  to authenticated
  using (
    exists (
      select 1 from public.agent_sessions s
      where s.id = session_id and s.created_by = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.agent_sessions s
      where s.id = session_id and s.created_by = auth.uid()
    )
  );

-- ---------------------------------------------------------------------------
-- Findings: let the in-app agent record and triage through the signed-in
-- session, restoring the foundation migration's hardened form
-- (20260818000000) rather than a blanket grant:
--
--   * A finding may only be INSERTED as open — the dedupe rule is "dismissed
--     stays dismissed", so an insert that could set status directly would let
--     one forged pre-dismissed row permanently suppress a real finding from
--     every future audit run. record_finding inserts without status and takes
--     the column default ('open').
--   * The UPDATE grant is column-narrowed to what record-finding's
--     update-in-place and human triage actually write. Delete stays revoked
--     everywhere; findings_open_fingerprint_idx remains the dedupe backstop.
--
-- The tier recipe's RESTRICTIVE policies (when applied) still confine every
-- one of these writes to service accounts.
-- ---------------------------------------------------------------------------
grant insert on public.audit_findings to authenticated;
revoke update on public.audit_findings from authenticated;
grant update (status, summary, severity, run_id, cell_ids, cell_keys, source)
  on public.audit_findings to authenticated;

drop policy if exists "findings_insert_auth" on public.audit_findings;
create policy "findings_insert_auth" on public.audit_findings
  for insert to authenticated with check (status = 'open');

-- ─────────────────────────────────────────────────────────────────────────
-- 21000101000000_schema_version_is_a_table.sql
-- ─────────────────────────────────────────────────────────────────────────

-- another host re-expresses these with its own primitives: the
-- version is world-readable and nobody but a migration writes it.

alter table public.schema_version enable row level security;

create policy "schema_version_select" on public.schema_version for select using (true);

grant select on public.schema_version to anon, authenticated;

-- ─────────────────────────────────────────────────────────────────────────
-- 21000113000000_one_column_held_two_unrelated_things.sql
-- ─────────────────────────────────────────────────────────────────────────

-- RLS and the Supabase role grants for both tables. Another host
-- expresses "anyone may read, only the service account may write" with its own
-- primitives; the tables above are plain Postgres.

alter table public.cell_touchpoints enable row level security;
alter table public.resources enable row level security;

create policy cell_touchpoints_select_anon on public.cell_touchpoints
  for select to anon using (true);
create policy cell_touchpoints_select_auth on public.cell_touchpoints
  for select to authenticated using (true);
create policy cell_touchpoints_insert_service_only on public.cell_touchpoints
  for insert to authenticated with check (public.is_service_account());
create policy cell_touchpoints_update_service_only on public.cell_touchpoints
  for update to authenticated
  using (public.is_service_account())
  with check (public.is_service_account());
create policy cell_touchpoints_delete_service_only on public.cell_touchpoints
  for delete to authenticated using (public.is_service_account());

create policy resources_select_anon on public.resources
  for select to anon using (true);
create policy resources_select_auth on public.resources
  for select to authenticated using (true);
create policy resources_insert_service_only on public.resources
  for insert to authenticated with check (public.is_service_account());
create policy resources_update_service_only on public.resources
  for update to authenticated
  using (public.is_service_account())
  with check (public.is_service_account());
create policy resources_delete_service_only on public.resources
  for delete to authenticated using (public.is_service_account());

grant select on public.cell_touchpoints, public.resources to anon, authenticated;
grant insert, delete on public.cell_touchpoints, public.resources to authenticated;
-- Column-level, as the authoring migration argues for `cells`: what a row
-- SAYS may move through a direct update; WHICH cell or placement owns it is
-- structure, and structure does not.
grant update (name, position, summary)
  on public.cell_touchpoints to authenticated;
grant update (kind, name, url, position) on public.resources to authenticated;
-- The platform grants anon these at create time on every relation created in
-- `public`. Nothing anonymous writes, and TRUNCATE is not subject to RLS.
revoke insert, update, delete, truncate
  on public.cell_touchpoints, public.resources from anon;
revoke truncate on public.cell_touchpoints, public.resources from authenticated;

-- the Supabase role that calls it.
grant execute on function public.sync_cell_resources(uuid, jsonb) to authenticated;

-- ─────────────────────────────────────────────────────────────────────────
-- 21000115000000_a_slide_a_frame_and_a_title.sql
-- ─────────────────────────────────────────────────────────────────────────

-- policies exist only where the Supabase recipe was applied, and
-- their names are the one dependent kind the core cannot carry.

alter policy "slice_items_select"      on public.slides rename to "slides_select";
alter policy "slice_items_insert_auth" on public.slides rename to "slides_insert_auth";
alter policy "slice_items_update_auth" on public.slides rename to "slides_update_auth";
alter policy "slice_items_delete_auth" on public.slides rename to "slides_delete_auth";

-- ─────────────────────────────────────────────────────────────────────────
-- 21000116000000_one_spelling_each.sql
-- ─────────────────────────────────────────────────────────────────────────

-- policies exist only where the Supabase recipe was applied, and
-- their names are the one dependent kind the core cannot carry.

-- Policies are renamed from the CATALOG, not by literal name, and this is the
-- one place in this migration where that is forced rather than preferred.
--
-- The two supported build paths disagree about what these policies are called
-- when this file runs:
--
--   REPLAY (a real project) applies migrations in timestamp order, so the
--   policies exist by the time `21000111000000`'s sweep runs, and it renames
--   them `propositions_*` → `business_model_*`.
--
--   THE TWO HALVES (core, then shim, then recipe) run the entire core first —
--   sweep included — while no policy exists yet. The recipe then creates them
--   as `propositions_*`, and nothing ever sweeps them.
--
-- Same series, same statements, two different catalogs. A literal `alter
-- policy` can only satisfy one of them, which is exactly why `21000111000000`
-- swept rather than listing: its own header says these names "appear nowhere
-- in the source as literals". They appear in two forms instead.
--
-- So this keys on the RETIRED WORDS and renames whatever it finds. The static
-- readers lose nothing here: the words being retired are written out below in
-- plain text, so a search for `findings` or `business_model` still lands on
-- this block.
do $policies$
declare
  target record;
  renamed int := 0;
begin
  for target in
    select pol.polname as name, cls.relname as rel
      from pg_policy pol
      join pg_class cls on cls.oid = pol.polrelid
      join pg_namespace nsp on nsp.oid = cls.relnamespace
     where nsp.nspname = 'public'
       and cls.relname in ('audit_findings', 'business_models')
       and (pol.polname like 'findings%'
            or pol.polname like 'propositions%'
            or pol.polname like 'business\_model\_%')
  loop
    execute format(
      'alter policy %I on public.%I rename to %I',
      target.name,
      target.rel,
      case
        when target.name like 'findings%' then
          'audit_' || target.name
        else
          'business_models_' || regexp_replace(target.name, '^(propositions|business_model)_', '')
      end);
    renamed := renamed + 1;
  end loop;

  -- Vacuous where policies were never created (a core-only database), and a
  -- real assertion where they were: no count, just "nothing was left behind".
  if exists (
    select 1
      from pg_policy pol
      join pg_class cls on cls.oid = pol.polrelid
      join pg_namespace nsp on nsp.oid = cls.relnamespace
     where nsp.nspname = 'public'
       and (pol.polname like 'findings%'
            or pol.polname like 'propositions%'
            or pol.polname like 'business\_model\_%')
  ) then
    raise exception 'a policy still carries a retired table name';
  end if;
end
$policies$;

-- The recreated RPCs did not widen. This is a RECIPE proof and not a core one
-- because `anon` is a role only the recipe creates: the core drops and replays
-- whatever ACL it found, and the question "did anon keep its revoke" can only
-- be asked where anon exists. Asking it in the core would make the portable
-- core name the host it exists to be independent of.
do $anon$
declare
  widened text;
begin
  select string_agg(p.proname, ', ' order by p.proname) into widened
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
   where n.nspname = 'public'
     and p.proname in ('create_path', 'create_scenario', 'duplicate_path',
                       'set_cell_dependency')
     and has_function_privilege('anon', p.oid, 'execute');
  if widened is not null then
    raise exception 'the drop-and-recreate widened an RPC to anon: %', widened;
  end if;
end
$anon$;

-- ─────────────────────────────────────────────────────────────────────────
-- 21000117000000_a_scenario_left_merged_opens_merged.sql
-- ─────────────────────────────────────────────────────────────────────────

-- the Supabase roles: a fresh function is executable by PUBLIC.
revoke execute on function public.update_scenario_layout(uuid, text) from public, anon;
grant execute on function public.update_scenario_layout(uuid, text) to authenticated;

-- ─────────────────────────────────────────────────────────────────────────
-- 21000118000000_a_resource_keeps_its_id_and_knows_its_cell.sql
-- ─────────────────────────────────────────────────────────────────────────

-- the Supabase roles. A fresh function is executable by PUBLIC,
-- and the cell's list was an invoker function until now.
revoke execute on function public.sync_cell_resources(uuid, jsonb) from public, anon;
grant execute on function public.sync_cell_resources(uuid, jsonb) to authenticated;
revoke execute on function public.sync_placement_resources(uuid, jsonb) from public, anon;
grant execute on function public.sync_placement_resources(uuid, jsonb) to authenticated;
revoke execute on function public.set_featured_resource(uuid, boolean) from public, anon;
grant execute on function public.set_featured_resource(uuid, boolean) to authenticated;
revoke execute on function public.restore_featured_resources(jsonb) from public, anon;
grant execute on function public.restore_featured_resources(jsonb) to authenticated;
-- the four writes are closed to the public role and open to the
-- signed-in one.
do $recipe_proof$
declare
  fn text;
begin
  foreach fn in array array[
    'public.sync_cell_resources(uuid, jsonb)',
    'public.sync_placement_resources(uuid, jsonb)',
    'public.set_featured_resource(uuid, boolean)',
    'public.restore_featured_resources(jsonb)'
  ] loop
    if has_function_privilege('anon', fn, 'execute') then
      raise exception 'anon can execute %', fn;
    end if;
    if not has_function_privilege('authenticated', fn, 'execute') then
      raise exception 'authenticated cannot execute %', fn;
    end if;
  end loop;
end
$recipe_proof$;

-- ─────────────────────────────────────────────────────────────────────────
-- 21000119000000_a_placement_says_what_a_tool_does_here.sql
-- ─────────────────────────────────────────────────────────────────────────

-- the panel's column-scoped edit gains the new column; the two
-- dropped ones took their grants with them.
grant update (role) on public.cell_touchpoints to authenticated;

-- ─────────────────────────────────────────────────────────────────────────
-- 21000120000000_a_touchpoint_is_a_thing_the_service_owns.sql
-- ─────────────────────────────────────────────────────────────────────────

-- the registry's RLS and grants, the same shape as every other
-- root-scoped table; the five structural writes closed to anon.
alter table public.touchpoints enable row level security;

create policy touchpoints_select_anon on public.touchpoints
  for select to anon using (true);
create policy touchpoints_select_auth on public.touchpoints
  for select to authenticated using (true);
create policy touchpoints_insert_service_only on public.touchpoints
  for insert to authenticated with check (public.is_service_account());
create policy touchpoints_update_service_only on public.touchpoints
  for update to authenticated
  using (public.is_service_account())
  with check (public.is_service_account());
create policy touchpoints_delete_service_only on public.touchpoints
  for delete to authenticated using (public.is_service_account());

grant select on public.touchpoints to anon, authenticated;
grant insert, delete on public.touchpoints to authenticated;
grant update (name, kind, summary, url) on public.touchpoints to authenticated;
revoke insert, update, delete, truncate on public.touchpoints from anon;
revoke truncate on public.touchpoints from authenticated;

revoke execute on function public.sync_cell_touchpoints(uuid, text[]) from public, anon;
grant execute on function public.sync_cell_touchpoints(uuid, text[]) to authenticated;
revoke execute on function public.restore_cell_touchpoints(uuid, jsonb) from public, anon;
grant execute on function public.restore_cell_touchpoints(uuid, jsonb) to authenticated;
revoke execute on function public.set_placement_touchpoint(uuid, uuid, text) from public, anon;
grant execute on function public.set_placement_touchpoint(uuid, uuid, text) to authenticated;
revoke execute on function public.remove_placement(uuid) from public, anon;
grant execute on function public.remove_placement(uuid) to authenticated;
revoke execute on function public.restore_placement(jsonb, jsonb) from public, anon;
grant execute on function public.restore_placement(jsonb, jsonb) to authenticated;

-- ─────────────────────────────────────────────────────────────────────────
-- 21000121000000_an_upload_is_an_attachment_with_a_stable_url.sql
-- ─────────────────────────────────────────────────────────────────────────

-- the bucket, its policies, and their proof.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'cell-attachments', 'cell-attachments', true, 10485760,
  array[
    'image/png', 'image/jpeg', 'image/webp', 'image/gif', 'image/svg+xml',
    'video/mp4', 'video/webm', 'video/quicktime',
    'audio/mpeg', 'audio/mp4', 'audio/wav', 'audio/ogg',
    'application/pdf'
  ]
)
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "cell_attachments_select" on storage.objects;
drop policy if exists "cell_attachments_insert" on storage.objects;
drop policy if exists "cell_attachments_update" on storage.objects;
drop policy if exists "cell_attachments_delete" on storage.objects;

create policy "cell_attachments_select" on storage.objects
  for select to authenticated
  using (bucket_id = 'cell-attachments');

create policy "cell_attachments_insert" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'cell-attachments'
    and public.is_service_account()
    and name ~ '^cells/[0-9a-f-]{36}/[0-9a-f-]{36}\.[a-z0-9]{1,8}$'
  );

create policy "cell_attachments_update" on storage.objects
  for update to authenticated
  using (bucket_id = 'cell-attachments' and public.is_service_account())
  with check (
    bucket_id = 'cell-attachments'
    and public.is_service_account()
    and name ~ '^cells/[0-9a-f-]{36}/[0-9a-f-]{36}\.[a-z0-9]{1,8}$'
  );

create policy "cell_attachments_delete" on storage.objects
  for delete to authenticated
  using (bucket_id = 'cell-attachments' and public.is_service_account());

do $proof$
declare
  bad int;
begin
  if not exists (select 1 from storage.buckets where id = 'cell-attachments' and public) then
    raise exception 'the cell-attachments bucket is missing or not public';
  end if;

  select count(*) into bad
    from pg_policies
   where schemaname = 'storage' and tablename = 'objects'
     and policyname in ('cell_attachments_select', 'cell_attachments_insert',
                        'cell_attachments_update', 'cell_attachments_delete');
  if bad <> 4 then
    raise exception 'expected four cell_attachments policies on storage.objects, found %', bad;
  end if;

  select count(*) into bad
    from pg_policies
   where schemaname = 'storage' and tablename = 'objects'
     and policyname in ('cell_attachments_insert', 'cell_attachments_update', 'cell_attachments_delete')
     and ('anon' = any(roles) or 'public' = any(roles)
          or coalesce(qual, '') || coalesce(with_check, '') not like '%is_service_account()%');
  if bad <> 0 then
    raise exception '% cell_attachments write policies are open to anon or unguarded', bad;
  end if;
end
$proof$;

-- ─────────────────────────────────────────────────────────────────────────
-- 21000125000000_an_entity_has_a_status_and_a_lane_names_its_actor.sql
-- ─────────────────────────────────────────────────────────────────────────

-- the cast's RLS and grants, the same shape as every other
-- root-scoped catalog; the lane's actor is one more column the panel writes.
alter table public.stakeholders enable row level security;

create policy stakeholders_select_anon on public.stakeholders
  for select to anon using (true);
create policy stakeholders_select_auth on public.stakeholders
  for select to authenticated using (true);
create policy stakeholders_insert_service_only on public.stakeholders
  for insert to authenticated with check (public.is_service_account());
create policy stakeholders_update_service_only on public.stakeholders
  for update to authenticated
  using (public.is_service_account())
  with check (public.is_service_account());
create policy stakeholders_delete_service_only on public.stakeholders
  for delete to authenticated using (public.is_service_account());

grant select on public.stakeholders to anon, authenticated;
grant insert, delete on public.stakeholders to authenticated;
-- The platform's default privilege hands a new table's whole UPDATE to
-- authenticated; take it back before naming the columns the panel may write,
-- or the list narrows nothing there.
revoke update on public.stakeholders from authenticated;
grant update (name, kind, summary, aliases) on public.stakeholders to authenticated;
revoke insert, update, delete, truncate on public.stakeholders from anon;
revoke truncate on public.stakeholders from authenticated;

-- The three columns the editors that follow will write. cells' table-wide
-- UPDATE was revoked long ago, so its column grants ARE the surface; paths is
-- granted the same way so the two behave alike on any host.
grant update (stakeholder_id) on public.lanes to authenticated;
grant update (status) on public.cells to authenticated;
grant update (status) on public.paths to authenticated;
