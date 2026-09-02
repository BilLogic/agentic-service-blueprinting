-- The two dependency kinds get the words the product uses, pointing the same way.
--
--   trigger  →  leads_to
--   needs    →  enables      (AND THE EDGE TURNS AROUND — see below)
--
-- 21000103000000 renamed the table and argued, correctly for its moment, that
-- the KIND column should keep `trigger`: a genus cannot also be one of its own
-- species. That argument was about the word `dependency`, and it still holds.
-- What it did not settle is whether `trigger` and `needs` were the right two
-- species, and the downstream instance has since found that they are not.
--
-- ── Why `trigger` becomes `leads_to` ──────────────────────────────────────
--
-- The panel groups these as "Set off by" / "Sets off" while the column stores
-- `trigger`. Product word and stored value disagree, which is the same class
-- of gap that made `links` ambiguous. `leads_to` IS the label, minus the
-- underscore, and it reads as one moment handing to the next rather than as an
-- alarm going off.
--
-- ── Why `needs` becomes `enables`, and why the rows must turn around ──────
--
-- This is the half that is not a rename. The two words put the source cell at
-- OPPOSITE ends of the same relationship:
--
--     A needs   B   →  B comes first, B is required by A
--     A enables B   →  A comes first, A makes B possible
--
-- So a `needs` row rewritten in place would claim the exact reverse of what it
-- was authored to say. `enables` is chosen because it puts BOTH kinds
-- source-first and upstream-first — makes it HAPPEN versus makes it POSSIBLE —
-- so an edge's direction can be read without first checking its kind:
--
--     "Creates breakout rooms"  --leads to--> "Reminds tutors to check them"
--     "generate_sample_blueprint.mjs" --enables--> "npm run dev with no .env"
--
-- The second is one of the 18 `needs` edges in the bundled sample, before and
-- after. Read it the old way — "the dev run needs the generator" — and the
-- meaning is identical; the words that carry it swap ends.
--
-- ── What could go wrong, and what stops it ────────────────────────────────
--
-- `cell_dependencies_source_target_kind_unique` covers (source, target, kind).
-- Turning a `needs` edge around cannot collide: the turned row's kind is
-- `enables`, which no row carries before this file runs (the old CHECK allowed
-- only `trigger` and `needs`), and a mutual pair (A,B,needs) + (B,A,needs)
-- turns into (B,A,enables) + (A,B,enables) — two distinct keys. An earlier
-- draft asserted against exactly that pair, which would have stranded a legal
-- database at 2026.08.31 over a collision that cannot happen.
--
-- The words "temporal" and "functional" go with the rename. They named the
-- distinction without ever making it usable.

alter table public.cell_dependencies
  drop constraint if exists cell_dependencies_kind_check;
alter table public.cell_dependencies
  alter column kind drop default;

update public.cell_dependencies
   set kind = 'leads_to'
 where kind = 'trigger';

-- The turn. Source and target swap in the same statement that renames the
-- kind, so no row is ever readable as "A enables B" while still meaning
-- "A needs B".
update public.cell_dependencies
   set source_cell_id = target_cell_id,
       target_cell_id = source_cell_id,
       kind = 'enables'
 where kind = 'needs';

alter table public.cell_dependencies
  add constraint cell_dependencies_kind_check
  check (kind in ('leads_to', 'enables'));
alter table public.cell_dependencies
  alter column kind set default 'leads_to';

comment on table public.cell_dependencies is
  'Dependency from one cell to another. kind: leads_to (makes it happen) | enables (makes it possible). Both read source-first and upstream-first.';
-- The column comment was set by 20260729120000 and followed the column through
-- the table rename; left alone it would keep teaching the retired words and
-- the retired direction to every schema reader.
comment on column public.cell_dependencies.kind is
  'leads_to = makes it happen (draws an arrow) | enables = makes it possible (panel only). Both read source-first.';

-- The literals inside `set_cell_dependency` — its `kind` default and the
-- guard that rejects an unknown kind.
--
-- Done here rather than through `__rewrite_function_bodies`, which
-- 21000109000000 dropped along with the other two vocabulary helpers once the
-- lane renames were finished. One function is one function; a helper that
-- sweeps every routine in the schema is what the wide renames needed and this
-- does not.
--
-- The patterns are QUOTED, so this cannot reach the word `trigger` where it
-- means a database trigger, and the grants ride through `create or replace`
-- untouched — a drop would take the ACL with it and the recreate would land on
-- EXECUTE TO PUBLIC.
do $rewrite$
declare
  v_before text;
  v_after text;
begin
  select pg_get_functiondef(p.oid) into v_before
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
   where n.nspname = 'public' and p.proname = 'set_cell_dependency';

  if v_before is null then
    raise exception 'set_cell_dependency is missing; nothing to rewrite';
  end if;

  v_after := replace(replace(v_before, '''trigger''', '''leads_to'''),
                     '''needs''', '''enables''');

  if v_after = v_before then
    raise exception
      'set_cell_dependency names neither retired kind, so this migration is '
      'either already applied or reading a function it does not recognise';
  end if;

  execute v_after;
end
$rewrite$;

do $$
declare
  v_left int;
  v_default text;
begin
  select count(*) into v_left
    from public.cell_dependencies where kind in ('trigger', 'needs');
  if v_left > 0 then
    raise exception '% dependency row(s) still carry a retired kind', v_left;
  end if;

  select pg_get_expr(d.adbin, d.adrelid) into v_default
    from pg_attrdef d
    join pg_attribute a on a.attrelid = d.adrelid and a.attnum = d.adnum
   where d.adrelid = 'public.cell_dependencies'::regclass and a.attname = 'kind';
  if v_default is null or v_default not like '%leads_to%' then
    raise exception 'the kind default is %, not leads_to', coalesce(v_default, 'absent');
  end if;

  if exists (
    select 1 from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.proname = 'set_cell_dependency'
      and p.prosrc ~ '''(trigger|needs)'''
  ) then
    raise exception 'set_cell_dependency still names a retired kind';
  end if;
end
$$;

-- ---------------------------------------------------------------------------
-- The bump. This file changes the shape — the CHECK, the default, the
-- direction of every `needs` row — so the target has to say so, or a database
-- that has not run this file is indistinguishable from one that has, and the
-- 2026.09.01 app draws its `needs` rows the wrong way round without a word.
-- ---------------------------------------------------------------------------

update public.schema_version
set version = '2026.09.01',
    applied_at = now();

do $version$
begin
  if not exists (select 1 from public.schema_version where version = '2026.09.01') then
    raise exception 'schema_version did not take the bump';
  end if;
end
$version$;
