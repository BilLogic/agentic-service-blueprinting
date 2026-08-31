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
-- Turning a `needs` edge around moves it onto a key that another row might
-- already hold — only if two `needs` rows are mirror images of each other,
-- which is a contradiction nobody can have meant. That is asserted before any
-- row moves, so a database holding one fails here instead of losing an edge to
-- a silent conflict.
--
-- The words "temporal" and "functional" go with the rename. They named the
-- distinction without ever making it usable.

do $$
declare
  v_mirrored int;
begin
  select count(*) into v_mirrored
  from public.cell_dependencies a
  join public.cell_dependencies b
    on b.kind = 'needs'
   and b.source_cell_id = a.target_cell_id
   and b.target_cell_id = a.source_cell_id
  where a.kind = 'needs';

  if v_mirrored > 0 then
    raise exception
      '% needs edge(s) are mirror images of each other. Turning them around '
      'would collide on cell_dependencies_source_target_kind_unique, and a '
      'pair that both needs the other is a contradiction this migration will '
      'not resolve by guessing.', v_mirrored;
  end if;
end
$$;

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
