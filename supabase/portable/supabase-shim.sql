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
-- Deliberately minimal, but faithful where fidelity is cheap: a stub that
-- answers differently from the thing it stands in for teaches a habit rather
-- than proving a behaviour. Nothing here should ever be read as a security
-- boundary — a caller who reaches this file can set its inputs — and the CI
-- run still checks shape, not access.

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

-- USAGE on the schema, because Supabase grants it. `is_service_account()` is
-- not SECURITY DEFINER, so every RESTRICTIVE write policy that ANDs with it
-- calls `auth.jwt()` AS THE CALLER — and without this line a signed-in author
-- meets `permission denied for schema auth` instead of the policy's answer.
-- Nothing noticed while the checks read `pg_policies`; the first thing to ask
-- the question as the role found it immediately (#369). Verified against a
-- deployed project: `nspacl` on `auth` there carries `anon=U` and
-- `authenticated=U`.
grant usage on schema auth to anon, authenticated;

-- GoTrue's request-scoped helpers. Supabase resolves the request's JWT into
-- the `request.jwt.claims` GUC and reads all three of these out of it, so
-- that is what these read too: an unset GUC answers "nobody", and a
-- `set_config('request.jwt.claims', …, true)` inside a rehearsal or a
-- migration's proof block answers what the author set.
--
-- Standing them in as constants was the older shape, and it was not a
-- simplification but a different behaviour: `auth.jwt()` returning an empty
-- object unconditionally meant `public.is_service_account()` could never be
-- true here, so every write RPC guarded by it refused and no guarded write
-- could be rehearsed behind the shim at all (#358).
--
-- `nullif` before the cast because a GUC that has been set and then cleared
-- reads back as the empty string, and `''::jsonb` is a syntax error rather
-- than an absent claim.
--
-- No claim reads back as NULL rather than `{}`, because that is what
-- Supabase's own `auth.jwt()` returns. An empty object would be friendlier to
-- a caller writing `auth.jwt() -> 'x'`, and nothing in this series can tell
-- the two apart — but a stand-in whose whole purpose is fidelity does not get
-- to keep a small lie because the small lie is convenient. This file has
-- already cost three separate rehearsals a wrong answer by differing from
-- Supabase in one place.
--
-- Still not a security boundary: a caller who can `set_config` can claim
-- anything. It makes the shim answer the question Supabase answers; it does
-- not make the answer trustworthy.
create or replace function auth.jwt() returns jsonb
language sql stable as $$
  select nullif(current_setting('request.jwt.claims', true), '')::jsonb
$$;

create or replace function auth.uid() returns uuid
language sql stable as $$ select nullif(auth.jwt() ->> 'sub', '')::uuid $$;

create or replace function auth.role() returns text
language sql stable as $$ select nullif(auth.jwt() ->> 'role', '') $$;

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
