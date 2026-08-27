-- 21000112000000 — what `\m…\M` could not reach.
--
-- FOUND BY THE SWEEP, ON ITS FIRST RUN AGAINST A REAL DATABASE. Five objects
-- still carrying retired vocabulary, four of them prose and one of them a
-- dangling reference that breaks an RPC the app and the agent both call.
--
-- THE ONE THAT MATTERS. `set_cell_dependency` ends with
--
--   on conflict on constraint cell_triggers_source_target_kind_unique
--
-- and no such constraint exists. `21000103` renamed the table with a catalogue
-- sweep — `strpos` and `replace`, no word boundaries — so the constraint became
-- `cell_dependencies_source_target_kind_unique`. It rewrote function bodies
-- with a different tool and a different pattern:
--
--   select public.__rewrite_function_bodies(array['\mcell_triggers\M'], …)
--
-- `\M` asserts a word END, `_` is a word CONSTITUENT in Postgres regex, and so
-- `\mcell_triggers\M` cannot match inside `cell_triggers_source_target_kind_unique`.
-- The table reference in the same body was rewritten; the constraint name three
-- lines below it was not. `on conflict on constraint` resolves at execution, so
-- nothing failed at migration time and nothing has failed since — the function
-- raises the first time a user connects two cells on an instance built from
-- this series.
--
-- This is the identical failure the vocabulary guards were ported to catch, and
-- it is written down in two places in this repository already: `21000104`'s
-- header records having to give `cells_layer_step_slot_unique` its own pattern
-- for the same reason, and `scripts/retired-vocabulary.mjs` says the enforced
-- fragments are SUBSTRINGS because a word-boundary pattern is what lets a name
-- like this survive. Both were written from an upstream incident. This one is
-- ours, and it was here the whole time.
--
-- THE OTHER FOUR are prose: three comments and one `--` line inside a function
-- body. A comment is read by the next person and by an agent reading the
-- schema, so a stale one is a wrong answer with a citation.
--
-- NO SCHEMA VERSION BUMP, deliberately. `schema_version` records the SHAPE the
-- app codes against, and nothing here moves it: no table, column, signature or
-- IR field changes, and the app's call to `set_cell_dependency` is byte for
-- byte the call it was already making. A bump would tell every instance its
-- target is incompatible in order to ship a repair, and this series has
-- precedent for not doing that — `21000103` through `21000108` were six
-- migrations under one version. What the bump would buy is the ability to tell
-- a repaired database from a broken one by its stamp, which is worth wanting
-- and is not what a compatibility stamp is for.
--
-- NO SCAFFOLDING COMES BACK. `21000102`'s three helpers were dropped by
-- `21000109` and stay dropped, following `21000111`: the body rewrite is an
-- anonymous block and never exists as a callable object.

-- ---------------------------------------------------------------------------
-- Function bodies. Plain `replace` on the full definition — the reason this
-- migration exists is a pattern that was too clever, so this one is not.
-- ---------------------------------------------------------------------------

do $bodies$
declare
  target record;
  -- An array, not a record: `foreach … slice 1` hands back a text[] row of the
  -- 2-D literal below, and plpgsql rejects a record variable for it outright.
  edit text[];
  rewritten integer := 0;
  edits constant text[][] := array[
    -- The dangling constraint reference.
    array['cell_triggers_source_target_kind_unique',
          'cell_dependencies_source_target_kind_unique'],
    -- Prose inside `duplicate_path`, describing the join it is about to write.
    array['(path, layer, step, slot)', '(path, lane, step, slot)']
  ];
begin
  foreach edit slice 1 in array edits loop
    for target in
      select pro.oid, pro.proname, pg_get_functiondef(pro.oid) as body
      from pg_proc pro
      join pg_namespace nsp on nsp.oid = pro.pronamespace
      where nsp.nspname = 'public' and pro.prokind = 'f'
        and strpos(pg_get_functiondef(pro.oid), edit[1]) > 0
      order by pro.proname
    loop
      execute replace(target.body, edit[1], edit[2]);
      rewritten := rewritten + 1;
    end loop;
  end loop;

  -- Two edits, one function each. A zero here means an earlier migration
  -- already fixed one and this file is stale; a larger number means the
  -- literal is less distinctive than it looks. Either way, look before you
  -- lower it.
  if rewritten <> 2 then
    raise exception 'expected 2 function bodies to rewrite, rewrote %', rewritten;
  end if;
end
$bodies$;

-- ---------------------------------------------------------------------------
-- Comments. Rewritten in full rather than patched, so the text this schema
-- carries is the text in this file.
-- ---------------------------------------------------------------------------

comment on table public.phases is 'Ordered phase within a service';

comment on column public.cells.position is
  'Ordering within one (lane, step) slot. 0 for single-cell slots; tech-lane touchpoints occupy 0..n.';

comment on column public.slices.slice_type is
  'How the cut was made: journey (experience closure for an actor) | step (one column) | lane (one lane over the service) | cell (single-cell spec) | custom.';

-- ---------------------------------------------------------------------------
-- The post-condition, and the one this series did not have.
-- ---------------------------------------------------------------------------

do $assert$
declare
  found text[] := '{}';
  word text;
  words constant text[] := array['layer', 'lifecycle', 'cell_trigger',
                                 'service_scenario', 'propositions'];
begin
  -- What `scripts/check-retired-identifiers.mjs` sweeps, for the two kinds no
  -- rename moves: prose in a comment, and anything inside a function body.
  foreach word in array words loop
    found := found || array(
      select 'comment on ' || cls.relname ||
             coalesce('.' || att.attname, '') || ' — "' || word || '"'
      from pg_description des
      join pg_class cls on cls.oid = des.objoid
      join pg_namespace nsp on nsp.oid = cls.relnamespace
      left join pg_attribute att
             on att.attrelid = des.objoid and att.attnum = des.objsubid
                                          and des.objsubid > 0
      where nsp.nspname = 'public' and strpos(des.description, word) > 0);
    found := found || array(
      select 'function body ' || pro.proname || ' — "' || word || '"'
      from pg_proc pro
      join pg_namespace nsp on nsp.oid = pro.pronamespace
      where nsp.nspname = 'public' and pro.prokind = 'f'
        and strpos(coalesce(pro.prosrc, ''), word) > 0);
  end loop;

  if array_length(found, 1) > 0 then
    raise exception 'retired vocabulary survives: %', array_to_string(found, ', ');
  end if;
end
$assert$;

-- The reference the rewrite now names has to be real. Without this the edit
-- above could swap one dangling constraint name for another and every check in
-- this file would still pass — which is exactly how the original defect went
-- unnoticed: nothing asserted that the name in the body resolves.
do $resolves$
begin
  if not exists (
    select 1 from pg_constraint con
    join pg_class cls on cls.oid = con.conrelid
    join pg_namespace nsp on nsp.oid = cls.relnamespace
    where nsp.nspname = 'public' and cls.relname = 'cell_dependencies'
      and con.conname = 'cell_dependencies_source_target_kind_unique'
  ) then
    raise exception
      'set_cell_dependency now names cell_dependencies_source_target_kind_unique, which does not exist';
  end if;
end
$resolves$;
