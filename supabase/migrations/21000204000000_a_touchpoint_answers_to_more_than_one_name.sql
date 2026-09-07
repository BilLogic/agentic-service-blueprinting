-- A touchpoint answers to more than one name.
--
-- Authored 2026-09-06. The version is an allocation counter, not a date.
--
-- The other half of the literal `21000203000000` began unwinding.
-- `src/lib/touchpointColors.ts` carries `TECH_LABEL_ALIASES` beside its colour
-- map: a second table, this one from an old spelling to the canonical name. A
-- deployment that stopped using one of two merged tools wants a slice written
-- before the merge to find the one that is left rather than mint a second. A
-- label that carried its own specification — a portal named for the view it
-- opened on — wants to resolve to the THING, because which view is the
-- placement summary's job. A lower-case spelling wants to resolve at all,
-- because a cell was typed by a person.
--
-- Every one of those is a fact about one deployment's own history, and none of
-- it is knowledge a renderer should hold. The alias RESOLUTION is generic
-- machinery and stays in code; the alias LIST is each deployment's, sourced
-- from a column. This is that column.
--
-- A touchpoint's `name` is its identity, unique deployment-wide
-- (`21000120000000`, ADR 0003). `aliases` are the other spellings that mean
-- the same row — the same shape `stakeholders.aliases` has carried since
-- `21000125000000`, where lane and cell text is matched against
-- `unnest(aliases)` to find the stakeholder a human wrote a nickname for.
--
-- ── Nullable, where the sibling column is NOT NULL ─────────────────────────
--
-- `stakeholders.aliases` is `text[] not null default '{}'`. This one is a
-- plain nullable `text[]`, and the difference is deliberate enough to be worth
-- writing down rather than leaving a reader to notice it as an inconsistency.
--
-- The slice this file belongs to adds columns and nothing else, and every
-- column it adds is nullable, so that the whole change is one shape: an add
-- that cannot fail on a populated table and cannot invent a value for a row
-- nobody has authored yet. On this column null carries a meaning the empty
-- array does not — "no aliases have been considered for this touchpoint", as
-- against "considered, and there are none" — which is the state all of today's
-- rows are in.
--
-- The cost is that a reader must write `coalesce(aliases, '{}')` where the
-- stakeholder reader writes `aliases`. That is one function's worth of care in
-- `touchpointColors.ts` against a NOT NULL that would have to be added,
-- defaulted and backfilled here. Narrowing this to `not null default '{}'`
-- later is a one-line follow-up that no existing row can fail, so the looser
-- shape forecloses nothing.
--
-- ── What is NOT constrained, and why ───────────────────────────────────────
--
-- Nothing here stops an alias colliding with another touchpoint's `name`, or
-- with another touchpoint's alias. Such a constraint is real and wanted, and
-- it belongs with the resolver that would be ambiguous without it. Written as
-- a database rule instead, it would refuse a WRITE rather than settle a READ,
-- and a board must draw rather than throw when two rows disagree — so the
-- resolver decides (a name beats another row's alias) and says so where the
-- decision is made. There is no index either: a registry of this size resolves
-- by sequential scan, and an index chosen before a query exists is a guess
-- about the query.
--
-- ── No new grant ───────────────────────────────────────────────────────────
--
-- The registry's table-level SELECT policy and grant, written in
-- `21000120000000`, already cover a new column, so nothing here belongs to the
-- recipe half. No UPDATE grant: the editing surface brings its own column
-- grant when it arrives, the way `21000127000000` did.
--
-- ── Replaying against an empty database ────────────────────────────────────
--
-- One additive column, nullable, no default beyond NULL, `if not exists` so a
-- re-run is a no-op. It replays clean against an empty database.
--
-- The proof is an INVARIANT, never a census: the column exists, it is
-- nullable, and it is an array of text rather than a single text. The last of
-- those is worth asserting because `text` and `text[]` are both plausible
-- spellings of "the other names", and a scalar column would silently accept
-- the first alias and lose the rest.

alter table public.touchpoints
  add column if not exists aliases text[];

comment on column public.touchpoints.aliases is
  'The other spellings that mean this touchpoint — an older name the service '
  'has stopped using, a label that carried its own specification, a '
  'lower-case one a person typed into a cell. The name is the identity; these '
  'resolve to it. The deployment''s own history, which is why it is a column '
  'and not a literal in touchpointColors.ts. Nullable rather than NOT NULL '
  'DEFAULT ''{}'' like stakeholders.aliases: null means no aliases have been '
  'considered, which is what every row means until somebody says otherwise. '
  'Uniqueness against other names and aliases is not constrained here — that '
  'rule settles a read, so it belongs with the resolver, which resolves a '
  'collision in favour of the name.';

do $proof$
declare
  v_type text;
  v_nullable text;
begin
  select data_type, is_nullable
    into v_type, v_nullable
    from information_schema.columns
   where table_schema = 'public'
     and table_name = 'touchpoints'
     and column_name = 'aliases';

  if v_type is null then
    raise exception
      'proof: touchpoints.aliases did not take';
  end if;

  if v_type <> 'ARRAY' then
    raise exception
      'proof: touchpoints.aliases is %, not an array — a scalar column keeps the first alias and loses the rest', v_type;
  end if;

  if v_nullable = 'NO' then
    raise exception
      'proof: touchpoints.aliases must be nullable — null is "no aliases considered", which is what every existing row means';
  end if;
end
$proof$;
