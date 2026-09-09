-- @recipe — the whole file, header included. It rewrites the tier recipe's
-- own trigger function and reads `auth.users`, a Supabase table, so nothing
-- here belongs to a backend that is not Supabase.

-- The first account holds the keys.
--
-- Authored 2026-09-08. The version is an allocation counter, not a date.
--
-- The service-account tier ships with an allowlist and no way to get onto it.
-- `service_account_emails` is created empty, and nothing in this package —
-- no seed, no script, no documented step — ever inserts a row. So an adopter
-- who runs the setup as written gets the strict database with NO account in
-- the editing tier: every signed-in session, including the one belonging to
-- the person who just created the project, is a viewer. The way out is a
-- hand-written `update auth.users` whose text lives in the header of another
-- migration.
--
-- That is worse than it sounds, because the strict database is what the setup
-- produces by DEFAULT. `supabase db reset` applies every file in
-- `supabase/migrations/`, and the tier recipe is one of them — it is optional
-- in the sense that an adopter may delete the file, not in the sense that
-- skipping it is the default. Reaching the single-tier posture the package
-- calls its default takes a deliberate deletion.
--
-- So the trigger gains a second way to enroll: the FOUNDING account.
--
-- ── Why the first user, and not an empty allowlist ─────────────────────────
--
-- "The allowlist is empty" is the other predicate that closes the same gap,
-- and it is the dangerous one. An adopter who enables sign-ups and never
-- fills the allowlist — the exact adopter this fixes — would stamp EVERY
-- account created in that window. The gap it opens is unbounded and it grows
-- with the deployment's popularity.
--
-- "There are no accounts yet" stamps exactly one account, ever, and it is the
-- one belonging to whoever stood the project up. After that the allowlist
-- governs, as it already did. The bound is arithmetic rather than
-- procedural — the same trade the migration band makes.
--
-- Two things follow from it being a BEFORE INSERT row trigger. The new row is
-- not in the table yet, so the founding account sees a genuinely empty
-- `auth.users` and enrolls. And two accounts created in the same instant on a
-- brand-new project could both see it empty; both would be stamped, which is
-- the intended outcome for a project whose owner is signing up twice and an
-- accepted one otherwise.
--
-- ── Why it stays in the recipe ─────────────────────────────────────────────
--
-- Stamping matters only where something reads the stamp, and the only reader
-- is the tier recipe's own `is_service_account()`. Delete the recipe and the
-- seam is `select true` again: every signed-in session edits, there is no
-- tier to be enrolled in, and a role claim written onto `auth.users` would be
-- a value nothing consults. Moving the trigger into the core would hang
-- Supabase-specific auth machinery on adopters who chose the single-tier
-- posture, to no effect.
--
-- What made that argument look the other way was a client that decided the
-- tier by reading the claim: such a client goes read-only against a
-- permissive database, so the stamp had to exist everywhere to keep it
-- honest. The client now asks `is_service_account()` instead of guessing,
-- and is right in both postures without any stamp at all. The stamp is back
-- to doing one job — giving the strict posture an owner — which is the
-- recipe's job.

create or replace function public.flag_service_accounts()
returns trigger
language plpgsql
security definer
set search_path = public, pg_catalog, pg_temp
as $$
declare
  enroll boolean;
begin
  enroll := exists (
    select 1 from public.service_account_emails e
    where lower(e.email) = lower(new.email)
  );

  if not enroll then
    -- The founding account. Guarded because the alternative to a `false`
    -- here is an exception, and an exception in a BEFORE INSERT trigger on
    -- auth.users means nobody can create an account at all — a failure that
    -- surfaces at the first sign-up rather than at migration time.
    begin
      enroll := not exists (select 1 from auth.users);
    exception
      when insufficient_privilege then
        enroll := false;
    end;
  end if;

  if enroll then
    new.raw_app_meta_data :=
      coalesce(new.raw_app_meta_data, '{}'::jsonb) || '{"role":"service"}'::jsonb;
  end if;

  return new;
end;
$$;

comment on function public.flag_service_accounts() is
  'BEFORE INSERT on auth.users: stamps app_metadata.role=service on an account whose email is on service_account_emails, and on the first account a project ever has, so a fresh deployment of the tier recipe has an editor without a hand-written update.';

-- The trigger already exists and points at this function by name; replacing
-- the body is the whole change. Re-created only to keep a database that
-- somehow lost it whole.
drop trigger if exists flag_service_accounts on auth.users;
create trigger flag_service_accounts
  before insert on auth.users
  for each row execute function public.flag_service_accounts();

revoke execute on function public.flag_service_accounts() from public;
revoke execute on function public.flag_service_accounts()
  from anon, authenticated;
grant execute on function public.flag_service_accounts() to service_role;
