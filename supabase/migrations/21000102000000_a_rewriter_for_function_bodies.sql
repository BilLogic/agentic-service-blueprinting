-- A rewriter for function bodies, used by the seven vocabulary migrations that
-- follow it. Written 2026-08-25; the version number is a band allocation.
--
-- THE TRAP THIS EXISTS FOR: `alter table ... rename` moves the table and none
-- of the plpgsql that names it. Function bodies are stored as text and
-- resolved at call time, so a renamed table or column leaves every function
-- naming it DEPLOYABLE AND BROKEN until something calls it. This database has
-- 32 of them, including `mint_cell_key` — the write path for every cell, from
-- the panel editor and the agent alike. An assertion against
-- information_schema.columns cannot see inside a function body, so the obvious
-- check passes while the writes are landmines.
--
-- The second trap is in the repair. Postgres refuses to rename an input
-- parameter through CREATE OR REPLACE, so a function whose SIGNATURE changes
-- has to be dropped and recreated — and a recreated function comes back with
-- Postgres's default EXECUTE granted to PUBLIC, wider than it was. Capturing
-- the old ACL and re-granting it is not enough: the repair has to REVOKE what
-- the original had revoked, not only grant what it had granted. Upstream this
-- widened four ACLs on two SECURITY DEFINER writes before anyone noticed.
--
-- Both are handled once, here, instead of seven times by hand.
--
-- The expected count is asserted rather than reported. A sweep that silently
-- rewrites fewer bodies than the migration author counted is the landmine
-- again, shipped by a green migration.
--
-- Dropped by the last migration in this series: it is scaffolding for one
-- vocabulary change, not a permanent part of the schema.

create or replace function public.__rewrite_function_bodies(
  patterns text[],
  replacements text[],
  expected integer
) returns integer
language plpgsql
as $rewriter$
declare
  target record;
  before text;
  after text;
  after_args text;
  grantee text;
  entry text;
  i integer;
  rewritten integer := 0;
begin
  if array_length(patterns, 1) is distinct from array_length(replacements, 1) then
    raise exception 'patterns and replacements must be the same length';
  end if;

  for target in
    select p.oid,
           p.proname,
           pg_get_function_identity_arguments(p.oid) as identity_args,
           pg_get_function_arguments(p.oid) as args,
           p.proacl::text[] as acl
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.prokind = 'f'
      and p.proname not like '\_\_%'
    order by p.proname
  loop
    before := pg_get_functiondef(target.oid);
    after := before;
    after_args := target.args;

    for i in 1 .. array_length(patterns, 1) loop
      after := regexp_replace(after, patterns[i], replacements[i], 'g');
      after_args := regexp_replace(after_args, patterns[i], replacements[i], 'g');
    end loop;

    if after = before then
      continue;
    end if;

    if after_args is distinct from target.args then
      execute format('drop function public.%I(%s)', target.proname, target.identity_args);
      execute after;

      -- pg_get_function_identity_arguments is types only, so it still names
      -- the recreated function.
      if target.acl is not null then
        -- It had an explicit ACL, which the drop threw away and the recreate
        -- replaced with Postgres's default grant to PUBLIC.
        execute format('revoke execute on function public.%I(%s) from public',
                       target.proname, target.identity_args);
        foreach entry in array target.acl loop
          grantee := split_part(entry, '=', 1);
          if grantee = '' then
            execute format('grant execute on function public.%I(%s) to public',
                           target.proname, target.identity_args);
          else
            execute format('grant execute on function public.%I(%s) to %I',
                           target.proname, target.identity_args, grantee);
          end if;
        end loop;
      end if;
    else
      execute after;
    end if;

    rewritten := rewritten + 1;
  end loop;

  if rewritten <> expected then
    raise exception
      'expected % function bodies to change, rewrote % — the sweep and the migration disagree',
      expected, rewritten;
  end if;

  return rewritten;
end;
$rewriter$;

comment on function public.__rewrite_function_bodies(text[], text[], integer) is
  'Scaffolding for the lane-vocabulary rename. Rewrites plpgsql bodies that a table or column rename left naming the old identifier, restoring ACLs when the signature change forces a drop. Dropped by the migration that ends the series.';

revoke execute on function public.__rewrite_function_bodies(text[], text[], integer) from public;

-- ---------------------------------------------------------------------------
-- The second thing a rename does not move: everything hanging off the table.
--
-- `alter table ... rename to` renames the table and leaves its constraints,
-- indexes, policies and triggers carrying the old word forever. Upstream
-- renamed eleven by hand on one table, plus two more on `cells` that named the
-- old COLUMN. Hand-listing them is how you miss the ones a later migration
-- created — this schema builds its RESTRICTIVE write policies in a loop over a
-- table array, so their names exist nowhere in the source as literals.
--
-- Reading the catalog instead cannot miss them. Constraints go first: renaming
-- a unique or primary-key constraint renames the index behind it, so the index
-- pass would otherwise find a name that is already correct.
-- ---------------------------------------------------------------------------

create or replace function public.__rename_schema_objects(
  old_word text,
  new_word text
) returns integer
language plpgsql
as $renamer$
declare
  target record;
  renamed integer := 0;
begin
  for target in
    select con.conname as name, cls.relname as rel
    from pg_constraint con
    join pg_class cls on cls.oid = con.conrelid
    join pg_namespace nsp on nsp.oid = cls.relnamespace
    where nsp.nspname = 'public' and strpos(con.conname, old_word) > 0
    order by con.conname
  loop
    execute format('alter table public.%I rename constraint %I to %I',
                   target.rel, target.name, replace(target.name, old_word, new_word));
    renamed := renamed + 1;
  end loop;

  for target in
    select idx.relname as name
    from pg_class idx
    join pg_namespace nsp on nsp.oid = idx.relnamespace
    where nsp.nspname = 'public' and idx.relkind = 'i'
      and strpos(idx.relname, old_word) > 0
      and not exists (select 1 from pg_constraint con where con.conindid = idx.oid)
    order by idx.relname
  loop
    execute format('alter index public.%I rename to %I',
                   target.name, replace(target.name, old_word, new_word));
    renamed := renamed + 1;
  end loop;

  for target in
    select pol.polname as name, cls.relname as rel
    from pg_policy pol
    join pg_class cls on cls.oid = pol.polrelid
    join pg_namespace nsp on nsp.oid = cls.relnamespace
    where nsp.nspname = 'public' and strpos(pol.polname, old_word) > 0
    order by pol.polname
  loop
    execute format('alter policy %I on public.%I rename to %I',
                   target.name, target.rel, replace(target.name, old_word, new_word));
    renamed := renamed + 1;
  end loop;

  for target in
    select tg.tgname as name, cls.relname as rel
    from pg_trigger tg
    join pg_class cls on cls.oid = tg.tgrelid
    join pg_namespace nsp on nsp.oid = cls.relnamespace
    where nsp.nspname = 'public' and not tg.tgisinternal
      and strpos(tg.tgname, old_word) > 0
    order by tg.tgname
  loop
    execute format('alter trigger %I on public.%I rename to %I',
                   target.name, target.rel, replace(target.name, old_word, new_word));
    renamed := renamed + 1;
  end loop;

  raise notice 'renamed % objects carrying %', renamed, old_word;
  return renamed;
end;
$renamer$;

revoke execute on function public.__rename_schema_objects(text, text) from public;

-- ---------------------------------------------------------------------------
-- The post-condition, which is the check the counting never was.
--
-- An assertion against information_schema.columns cannot see inside a function
-- body, so it passes while the writes are broken. This looks everywhere the old
-- word can still be hiding — table and column names, constraint, index, policy
-- and trigger names, and every plpgsql body — and names what it found.
-- ---------------------------------------------------------------------------

create or replace function public.__assert_vocabulary_gone(
  stems text[],
  identifiers text[],
  kept_columns text[] default '{}'
) returns void
language plpgsql
as $assert$
declare
  stem text;
  identifier text;
  found text[] := '{}';
begin
  foreach stem in array stems loop
    found := found || array(
      select 'table ' || cls.relname
      from pg_class cls join pg_namespace nsp on nsp.oid = cls.relnamespace
      where nsp.nspname = 'public' and cls.relkind in ('r', 'v', 'm')
        and strpos(cls.relname, stem) > 0);
    found := found || array(
      select 'constraint ' || con.conname
      from pg_constraint con join pg_namespace nsp on nsp.oid = con.connamespace
      where nsp.nspname = 'public' and strpos(con.conname, stem) > 0);
    found := found || array(
      select 'index ' || idx.relname
      from pg_class idx join pg_namespace nsp on nsp.oid = idx.relnamespace
      where nsp.nspname = 'public' and idx.relkind = 'i'
        and strpos(idx.relname, stem) > 0);
    found := found || array(
      select 'policy ' || pol.polname
      from pg_policy pol
      join pg_class cls on cls.oid = pol.polrelid
      join pg_namespace nsp on nsp.oid = cls.relnamespace
      where nsp.nspname = 'public' and strpos(pol.polname, stem) > 0);
    found := found || array(
      select 'trigger ' || tg.tgname
      from pg_trigger tg
      join pg_class cls on cls.oid = tg.tgrelid
      join pg_namespace nsp on nsp.oid = cls.relnamespace
      where nsp.nspname = 'public' and not tg.tgisinternal
        and strpos(tg.tgname, stem) > 0);
  end loop;

  foreach identifier in array identifiers loop
    found := found || array(
      select 'column ' || cls.relname || '.' || att.attname
      from pg_attribute att
      join pg_class cls on cls.oid = att.attrelid
      join pg_namespace nsp on nsp.oid = cls.relnamespace
      where nsp.nspname = 'public' and cls.relkind = 'r'
        and att.attnum > 0 and not att.attisdropped
        and att.attname = identifier
        and not (cls.relname || '.' || att.attname = any(kept_columns)));
    found := found || array(
      select 'function ' || pro.proname
      from pg_proc pro join pg_namespace nsp on nsp.oid = pro.pronamespace
      where nsp.nspname = 'public' and pro.prokind = 'f'
        and pro.proname not like '\_\_%'
        and pg_get_functiondef(pro.oid) ~ ('\m' || identifier || '\M'));
  end loop;

  if array_length(found, 1) > 0 then
    raise exception 'the old vocabulary is still here: %', array_to_string(found, ', ');
  end if;
end;
$assert$;

revoke execute on function public.__assert_vocabulary_gone(text[], text[], text[]) from public;
