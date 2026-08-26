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

-- @recipe — this whole migration is the tier recipe. It is named that in
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
    'phases', 'service_scenarios', 'paths', 'steps', 'path_steps',
    'layers', 'cells', 'cell_triggers', 'slices', 'slice_items',
    'evidence', 'propositions', 'findings'
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
-- @core — a plain table. What stamps rows from it is the recipe's business.
create table if not exists public.service_account_emails (
  email text primary key,
  note text,
  created_at timestamptz not null default now()
);

comment on table public.service_account_emails is
  'Adopter-configured allowlist: accounts created with these emails are stamped app_metadata.role=service by the flag_service_accounts trigger. Operator-only (service role). Existing accounts are stamped directly on auth.users — see the header of this migration.';

-- @recipe
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
