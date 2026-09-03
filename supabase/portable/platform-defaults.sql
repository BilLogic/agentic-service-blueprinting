-- The one Supabase primitive the recipe assumes but never states: the grant
-- the platform performs at project creation.
--
-- supabase-shim.sql stands in for the role NAMES and the auth/storage
-- functions the recipe fragments call. This file stands in for the other thing
-- the recipe leans on without saying so — the SELECT the `anon` and
-- `authenticated` roles hold on every table in `public`.
--
-- The recipe never grants that on the blueprint spine (`services`, `phases`,
-- `scenarios`, `paths`, `steps`, `lanes`, `cells`, …). It says so in a
-- migration comment (21000113000000): "The platform grants anon these at
-- create time on every relation created in `public`." Supabase wires it once,
-- at project init, as a default privilege, so every table a later migration
-- creates is reachable by the Data API roles without a per-table GRANT — and
-- the recipe issues only the SURGICAL grants and revokes that DEPART from that
-- baseline (evidence and business_models are revoked from anon on top of it).
--
-- ⚠️ NOT part of the portable core, and not something an adopter installs — the
-- same status as supabase-shim.sql. It is a CI harness: a stock `postgres:17`
-- has no project-init step, so the seed-load check performs the platform's
-- default grant itself, BEFORE the core creates any table, and then lets the
-- recipe's surgical revokes land on top exactly as they do on a real project.
-- That is the whole reason the ordering matters: default first, tables next,
-- recipe's departures last.
--
-- Applied by `npm run check:seed-load` only. It exists so a keyless read — the
-- `anon` key the deployed app carries — returns the seeded content, which is
-- the thing that check is there to prove. Another host expresses the same
-- baseline with its own auth; here it is one ALTER DEFAULT PRIVILEGES.

grant usage on schema public to anon, authenticated;

-- The default privilege, set before the core runs: every table and view the
-- migrations create in `public` is granted SELECT to the Data API roles, the
-- way project creation does it. The recipe's own GRANTs and REVOKEs then apply
-- on top, so the surgical departures (evidence, business_models) still win.
alter default privileges in schema public
  grant select on tables to anon, authenticated;
