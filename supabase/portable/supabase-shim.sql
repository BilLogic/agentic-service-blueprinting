-- The smallest thing that lets stock Postgres run the Supabase recipe.
--
-- The package has always claimed a PORTABLE POSTGRES CORE that "runs on any
-- Postgres". That half now runs on a plain `postgres:17` with nothing in
-- front of it — no shim, no roles, no auth schema — because it is generated
-- from the migrations' partition marks and carries none of this.
--
-- This file is for the OTHER half. The Supabase recipe names primitives a
-- stock Postgres does not have, so CI stands these in before applying it, and
-- before replaying the full migration chain.
--
-- ⚠️ NOT part of the portable core, and not something an adopter installs.
-- It is a CI harness. It supplies the three role names the grants mention and
-- the two `auth.*` functions the recipe half calls, so the migrations can be
-- replayed somewhere Supabase is not. An adopter on another host replaces the
-- recipe with their own primitives instead — the point of the partition.
--
-- Deliberately minimal: every stub returns a value that makes the migration
-- APPLY, never one that makes an RLS policy meaningful. Nothing here should
-- ever be read as a security boundary; the CI run checks shape, not access.

-- The roles the grants name. NOLOGIN: nothing connects as them here.
do $$
begin
  if not exists (select from pg_roles where rolname = 'anon') then
    create role anon nologin noinherit;
  end if;
  if not exists (select from pg_roles where rolname = 'authenticated') then
    create role authenticated nologin noinherit;
  end if;
  if not exists (select from pg_roles where rolname = 'service_role') then
    create role service_role nologin noinherit bypassrls;
  end if;
end
$$;

create schema if not exists auth;

-- GoTrue's request-scoped helpers. Supabase reads them out of the JWT the
-- request carried; here there is no request, so they answer "nobody". Column
-- defaults that call auth.uid() therefore stamp NULL, which is why this shim
-- can only ever prove that the schema builds.
create or replace function auth.uid() returns uuid
language sql stable as $$ select null::uuid $$;

create or replace function auth.jwt() returns jsonb
language sql stable as $$ select '{}'::jsonb $$;

create or replace function auth.role() returns text
language sql stable as $$ select null::text $$;

-- GoTrue's account table, to the extent the migrations touch it. The tier
-- recipe hangs a BEFORE INSERT trigger on it to stamp app_metadata for
-- allowlisted emails, so the trigger needs somewhere to attach and the two
-- columns it reads and writes. Everything else GoTrue stores is irrelevant
-- here — this proves the trigger installs, never that it authenticates.
create table if not exists auth.users (
  id uuid primary key default gen_random_uuid(),
  email text,
  raw_app_meta_data jsonb,
  created_at timestamptz not null default now()
);

-- Supabase Storage, to the extent the migrations touch it: one bucket row to
-- update, one object table to attach policies to.
create schema if not exists storage;

create table if not exists storage.buckets (
  id text primary key,
  name text not null,
  public boolean not null default false,
  file_size_limit bigint,
  allowed_mime_types text[]
);

create table if not exists storage.objects (
  id uuid primary key default gen_random_uuid(),
  bucket_id text references storage.buckets (id),
  name text,
  owner uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  metadata jsonb
);

alter table storage.objects enable row level security;
