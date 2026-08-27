-- propositions → business_model. Written 2026-08-27.
--
-- The last row of the vocabulary map that still applies here (#84). Five rows
-- landed in the 2100 series on 2026-08-25; `sets_off` and `cells.maturity`
-- never existed in this package, so this is the remainder.
--
-- WHY THE WORD HAD TO GO. The table holds one business-model record per
-- service — funding, pricing, delivery cost, revenue model. "Proposition"
-- already means something else one level down: a CELL's value proposition,
-- carried in `cells.value_props`. One word for two concepts at two altitudes
-- is the collision, and the table is the one wearing the borrowed name.
--
-- THE COLUMN THAT KEEPS THE WORD, PERMANENTLY. `evidence.proposition_question_key`
-- records which of the three validation questions an evidence row answers —
-- `understand`, `value`, `usability`. Those three ARE propositions in the
-- ordinary sense: claims the service is betting on. The rename moves the
-- container, not the concept, so the column stays and is asserted below rather
-- than merely left alone. Note it is not an accident that the catalog sweep
-- cannot reach it: the sweep keys on the PLURAL `propositions`, the column is
-- singular, and its check constraint was explicitly named
-- `evidence_question_key_check` with no `proposition` in it.
--
-- NO SCAFFOLDING IS RE-ERECTED. `21000109` dropped `__rename_schema_objects`
-- and its two companions on the stated grounds that leaving a catalog-rewriting
-- SECURITY INVOKER function in the schema is "leaving a loaded tool on the
-- bench". That reasoning holds, so this migration does not bring them back for
-- one more use: the object sweep is inlined as an anonymous block, which never
-- exists as a callable object at all.
--
-- The rewriter is not needed either, and that was checked rather than assumed:
-- no persistent plpgsql body in the series names `propositions`. The only
-- source occurrence inside a function-shaped construct is the table array in
-- `20260818002000_service_account_tier.sql`, which is itself an anonymous `do`
-- block and leaves no body behind. The policies it builds in that loop are
-- exactly why the sweep below reads the catalog instead of a hand-written list
-- — their names appear nowhere in the source as literals.

alter table public.propositions rename to business_model;

-- ---------------------------------------------------------------------------
-- Everything hanging off the table, which the rename above does not move.
--
-- Constraints first: renaming a unique or primary-key constraint renames the
-- index behind it, so an index pass run first would find a name that is already
-- correct and a second pass would miss it. Same order as
-- `__rename_schema_objects` used, for the same reason.
--
-- The sweep keys on `propositions` and not on `proposition`. With the singular
-- it would rename `propositions_select_auth` to `business_models_select_auth`
-- and leave a plural `s` welded to a singular noun on every object it touched.
-- ---------------------------------------------------------------------------

do $sweep$
declare
  target record;
  renamed integer := 0;
begin
  for target in
    select con.conname as name, cls.relname as rel
    from pg_constraint con
    join pg_class cls on cls.oid = con.conrelid
    join pg_namespace nsp on nsp.oid = cls.relnamespace
    where nsp.nspname = 'public' and strpos(con.conname, 'propositions') > 0
    order by con.conname
  loop
    execute format('alter table public.%I rename constraint %I to %I',
                   target.rel, target.name,
                   replace(target.name, 'propositions', 'business_model'));
    renamed := renamed + 1;
  end loop;

  for target in
    select idx.relname as name
    from pg_class idx
    join pg_namespace nsp on nsp.oid = idx.relnamespace
    where nsp.nspname = 'public' and idx.relkind = 'i'
      and strpos(idx.relname, 'propositions') > 0
      and not exists (select 1 from pg_constraint con where con.conindid = idx.oid)
    order by idx.relname
  loop
    execute format('alter index public.%I rename to %I',
                   target.name, replace(target.name, 'propositions', 'business_model'));
    renamed := renamed + 1;
  end loop;

  for target in
    select pol.polname as name, cls.relname as rel
    from pg_policy pol
    join pg_class cls on cls.oid = pol.polrelid
    join pg_namespace nsp on nsp.oid = cls.relnamespace
    where nsp.nspname = 'public' and strpos(pol.polname, 'propositions') > 0
    order by pol.polname
  loop
    execute format('alter policy %I on public.%I rename to %I',
                   target.name, target.rel,
                   replace(target.name, 'propositions', 'business_model'));
    renamed := renamed + 1;
  end loop;

  for target in
    select tg.tgname as name, cls.relname as rel
    from pg_trigger tg
    join pg_class cls on cls.oid = tg.tgrelid
    join pg_namespace nsp on nsp.oid = cls.relnamespace
    where nsp.nspname = 'public' and not tg.tgisinternal
      and strpos(tg.tgname, 'propositions') > 0
    order by tg.tgname
  loop
    execute format('alter trigger %I on public.%I rename to %I',
                   target.name, target.rel,
                   replace(target.name, 'propositions', 'business_model'));
    renamed := renamed + 1;
  end loop;

  raise notice 'renamed % objects carrying propositions', renamed;
end
$sweep$;

comment on table public.business_model is
  'One business-model record per service. The three validation questions live as evidence rows keyed understand|value|usability. Restricted SELECT.';

comment on column public.business_model.created_by is
  'The caller at insert; null for service-key writes.';

-- ---------------------------------------------------------------------------
-- The post-condition. Counting how many objects were renamed proves only that
-- the loop ran; asking the catalog what is left proves the thing the migration
-- claims.
-- ---------------------------------------------------------------------------

do $assert$
declare
  found text[] := '{}';
begin
  found := found || array(
    select 'table ' || cls.relname
    from pg_class cls join pg_namespace nsp on nsp.oid = cls.relnamespace
    where nsp.nspname = 'public' and cls.relkind in ('r', 'v', 'm')
      and strpos(cls.relname, 'propositions') > 0);
  found := found || array(
    select 'column ' || cls.relname || '.' || att.attname
    from pg_attribute att
    join pg_class cls on cls.oid = att.attrelid
    join pg_namespace nsp on nsp.oid = cls.relnamespace
    where nsp.nspname = 'public' and att.attnum > 0 and not att.attisdropped
      and strpos(att.attname, 'propositions') > 0);
  found := found || array(
    select 'constraint ' || con.conname
    from pg_constraint con join pg_namespace nsp on nsp.oid = con.connamespace
    where nsp.nspname = 'public' and strpos(con.conname, 'propositions') > 0);
  found := found || array(
    select 'index ' || idx.relname
    from pg_class idx join pg_namespace nsp on nsp.oid = idx.relnamespace
    where nsp.nspname = 'public' and idx.relkind = 'i'
      and strpos(idx.relname, 'propositions') > 0);
  found := found || array(
    select 'policy ' || pol.polname
    from pg_policy pol
    join pg_class cls on cls.oid = pol.polrelid
    join pg_namespace nsp on nsp.oid = cls.relnamespace
    where nsp.nspname = 'public' and strpos(pol.polname, 'propositions') > 0);
  found := found || array(
    select 'trigger ' || tg.tgname
    from pg_trigger tg
    join pg_class cls on cls.oid = tg.tgrelid
    join pg_namespace nsp on nsp.oid = cls.relnamespace
    where nsp.nspname = 'public' and not tg.tgisinternal
      and strpos(tg.tgname, 'propositions') > 0);
  found := found || array(
    select 'function ' || pro.proname
    from pg_proc pro join pg_namespace nsp on nsp.oid = pro.pronamespace
    where nsp.nspname = 'public' and pro.prokind = 'f'
      and strpos(coalesce(pro.prosrc, ''), 'propositions') > 0);

  if array_length(found, 1) > 0 then
    raise exception 'propositions survives the rename in: %', array_to_string(found, ', ');
  end if;

  -- The table arrived under its new name, rather than the word merely leaving.
  if to_regclass('public.business_model') is null then
    raise exception 'business_model does not exist — the rename removed a table instead of moving it';
  end if;

  -- And the one occurrence that is meant to survive, asserted so a later sweep
  -- that removes it fails here instead of silently narrowing the evidence model.
  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'evidence'
      and column_name = 'proposition_question_key'
  ) then
    raise exception
      'evidence.proposition_question_key is gone — it is a permanent exemption, not residue (#84)';
  end if;
end
$assert$;

-- ---------------------------------------------------------------------------
-- The shape changed, so the number changes — `21000109`'s rule, and
-- `21000110` applied it even for a change with no DDL at all, on the grounds
-- that `schema_version` is ONE contract. A renamed table is the loudest kind of
-- shape change: a target at 2026.08.26 answers to `propositions` and a target
-- at this number does not.
--
-- Older numbers are NOT evicted from the supported list, following the
-- precedent this series set rather than a fresh judgement: `21000104` renamed
-- `layers` to `lanes` and 2026.07.16 stayed listed. A version leaves that list
-- when the migration that would carry it forward stops existing, which is a
-- deliberate act. That migration still exists — it is this file.
--
-- src/lib/backend/schemaVersion.ts carries the matching entry; `check:version`
-- fails if the two disagree.
-- ---------------------------------------------------------------------------

update public.schema_version
set version = '2026.08.27',
    applied_at = now();

do $version$
begin
  if not exists (select 1 from public.schema_version where version = '2026.08.27') then
    raise exception 'schema_version did not take the bump';
  end if;
end
$version$;
