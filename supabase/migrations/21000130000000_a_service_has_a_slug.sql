-- A service has a slug.
--
-- A deployment may hold more than one service (ADR 0003), and the moment it
-- does, something has to name which one a reader — or an agent — is looking at.
-- The name cannot: it is free text, it is renamed, and two services may be
-- called almost the same thing. So a service gets a `slug`: a short, stable,
-- URL-safe identity of its own, unique across the deployment, which a route
-- (`/<slug>`) and a scoped read can both key on.
--
-- ── Its own identity, not a derivation ─────────────────────────────────────
--
-- A slug DERIVED from the name at read time would need no column at all, and
-- that is the version worth arguing against: it moves a service's URL every
-- time somebody edits the name, and it has nothing to say when two names
-- slugify alike. A column fixes both — a rename leaves the route where it was,
-- and the unique constraint refuses the collision rather than letting two
-- services share a route.
--
-- ── Nullable, backfilled, then made unique ─────────────────────────────────
--
-- The table may already hold rows, so the column cannot arrive NOT NULL with no
-- default. It lands nullable, every existing row is backfilled, and only then
-- does the unique constraint go on — a populated column a constraint can trust.
--
-- It STAYS nullable on purpose. The seam that reads it (`src/lib/serviceSlug.ts`)
-- keeps a name-derived fallback for a row whose slug is null, so a deployer who
-- clears the slug gets the name-derived route back rather than a broken one.
-- That fallback is only meaningful if null is reachable, so the column is not
-- narrowed to NOT NULL here.
--
-- ── The backfill reuses key_slug, the database's own slugifier ──────────────
--
-- `public.key_slug` (20260818001000) is the function `src/lib/serviceSlug.ts`
-- documents itself as mirroring:
-- `trim('-', regexp_replace(lower(value), '[^a-z0-9]+', '-'))`. Reusing it
-- keeps the backfill in step with the app's derivation rather than minting a
-- third copy of the slug rule; for every ASCII name the two agree exactly.
-- `coalesce(..., id::text)` supplies the id fallback for the pathological
-- all-non-ASCII name, where the app falls back to the row id and `key_slug` to
-- an md5 fragment; either is stable, unique and resolvable, and a service so
-- named keeps whatever route it had.
--
-- ── The editable grant is deliberately NOT here ────────────────────────────
--
-- Letting an author EDIT the slug is a panel write, and a later ticket — the
-- same split `21000123000000` (add `entity_examples`) and `21000128000000`
-- (grant the panel its UPDATE, beside the policy that makes the grant mean
-- anything) already drew. Routing and scoping only READ the slug, so this file
-- adds no `grant update (slug)`: a write surface with no writer is a column the
-- RLS posture has to account for before any mutation touches it. When the edit
-- panel arrives it adds the grant and the policy together, exactly as the
-- examples panel did.
--
-- ── Replaying against an empty database ────────────────────────────────────
--
-- Additive: one nullable column, a backfill that matches whatever rows exist,
-- and a constraint dropped-if-exists before it is re-added so a re-run and an
-- empty replay both no-op. The whole migration is portable core — a plain
-- column and a plain constraint on a plain table, with no Supabase primitive
-- named — and the table-level select policy already covers a new column, so
-- there is no recipe fragment. The schema version does not move (the same
-- stance as 21000123000000).
--
-- The proof is an INVARIANT, never a census, which is the series' own rule:
-- after this file every service row has a slug and all slugs are
-- distinct. That is vacuously true of an empty replay's zero rows and is the
-- evidence on a populated target that the backfill reached every row and the
-- constraint has something to guard.

-- ── 1. The column, nullable ────────────────────────────────────────────────

alter table public.services
  add column if not exists slug text;

comment on column public.services.slug is
  'A service''s stable route slug: `/<slug>` opens it, and a scoped agent read names it. Its own identity, not derived from the name — a rename does not move the URL, and the unique constraint stops two services colliding. Backfilled from the name-derived slug (public.key_slug) when added; nullable so a cleared slug falls back to the name-derived route in the app. Editable by the deployer through a later panel write, which adds the UPDATE grant then.';

-- ── 2. Backfill every existing row from its name-derived slug ───────────────
--
-- Scoped to `slug is null` so it is idempotent and touches nothing a re-run has
-- already filled.

update public.services
   set slug = coalesce(public.key_slug(name), id::text)
 where slug is null;

-- ── 3. The unique constraint, once the column is populated ──────────────────
--
-- Dropped-if-exists first so this is idempotent across a re-run.

alter table public.services
  drop constraint if exists services_slug_key;
alter table public.services
  add constraint services_slug_key unique (slug);

comment on constraint services_slug_key on public.services is
  'One slug per service, per deployment. Two services whose names slugify alike are refused rather than colliding on a shared route.';

-- ── 4. Prove it ────────────────────────────────────────────────────────────
--
-- Invariants, not a census. Zero rows on an empty replay satisfy both; a
-- populated target is the case they exist to check.

do $proof$
declare
  v_missing  integer;
  v_total    integer;
  v_distinct integer;
begin
  select count(*) into v_missing
    from public.services
   where slug is null;
  if v_missing <> 0 then
    raise exception
      'proof: % service row(s) have a null slug after backfill; the backfill did not reach every row', v_missing;
  end if;

  select count(*), count(distinct slug) into v_total, v_distinct
    from public.services;
  if v_total <> v_distinct then
    raise exception
      'proof: % service rows carry only % distinct slugs; the unique constraint has a collision to reject', v_total, v_distinct;
  end if;
end
$proof$;
