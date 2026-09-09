-- `deletion_impact` counts the delete that follows, for all four kinds.
--
-- The confirm dialog's entire job is the number, and two of the four kinds
-- answered with a number that was not true of the delete they preceded. Both
-- in the same way, and in opposite directions:
--
--   lane   `deletion_impact('lane', id)` counted the cells of ONE `lanes` row.
--          `remove_lane(scenario_id, lane_name)` deletes every same-named lane
--          across every path of the scenario. Measured against a live
--          blueprint: 11 reported, 93 deleted. An 8.5x UNDERCOUNT.
--
--   step   `deletion_impact('step', id)` counted that step across EVERY path.
--          `remove_step(path_id, step_id)` deletes only the cells on the path
--          it is given. Measured on the same blueprint: 12 reported, 5
--          deleted. An OVERCOUNT.
--
-- The cause is identity, not arithmetic. A lane delete is addressed by
-- (scenario, name) and a step delete by (path, step), but the function took a
-- single uuid and so could not name either delete. No sum over the wrong row
-- set gives the right answer; the row set was the defect.
--
-- `scope_id` supplies the missing half. `scenario` and `path` are addressed by
-- one id, ignore it, and are byte-for-byte the predicates they were — so every
-- existing caller is unaffected, in SQL and over PostgREST alike, because the
-- new argument has a default. `lane` needs nothing from the caller: it derives
-- the (scenario, name) pair from the lane it is handed, which is the same pair
-- `remove_lane` is called with. `step` REFUSES without it rather than guess a
-- path — an overcount in a delete dialog reads as "this is bigger than it is",
-- and a number nobody can justify is worse than an error that says why.
--
-- `remove_step` is rewritten alongside, because it reads `deletion_impact`
-- itself for the label and the `affected_slices` it archives. Left alone it
-- would call the two-argument form, hit the refusal, and stop deleting steps
-- at all. Its body is otherwise unchanged, and passing the path it was already
-- given also narrows the archived `affected_slices` from "slices touched on
-- any path" to the ones this delete actually costs.

-- @core

drop function if exists public.deletion_impact(text, uuid);

create or replace function public.deletion_impact(
  kind      text,
  target_id uuid,
  scope_id  uuid default null
)
returns jsonb
language plpgsql
stable
set search_path to 'public', 'pg_catalog', 'pg_temp'
as $$
declare
  affected uuid[];
  label    text;
begin
  if kind = 'scenario' then
    select array_agg(c.id), max(sc.name) into affected, label
    from public.cells c
    join public.paths p on p.id = c.path_id
    join public.scenarios sc on sc.id = p.scenario_id
    where sc.id = target_id;

  elsif kind = 'path' then
    select array_agg(c.id), max(p.name) into affected, label
    from public.cells c join public.paths p on p.id = c.path_id
    where p.id = target_id;

  elsif kind = 'step' then
    -- remove_step(path_id, step_id) is path-scoped, so this must be too.
    if scope_id is null then
      raise exception 'deletion_impact(''step'', ...) needs scope_id = the path_id'
        using hint = 'remove_step deletes only the cells on one path; without the path there is no true count.';
    end if;
    select array_agg(c.id), max(s.name) into affected, label
    from public.cells c join public.steps s on s.id = c.step_id
    where c.step_id = target_id and c.path_id = scope_id;

  elsif kind = 'lane' then
    -- remove_lane(scenario_id, lane_name) deletes by NAME across the whole
    -- scenario. Resolve the given lane to its (scenario, name) and count
    -- every lane the delete would actually take.
    select array_agg(c.id), max(l.name) into affected, label
    from public.cells c
    join public.lanes l on l.id = c.lane_id
    join public.paths p on p.id = l.path_id
    where p.scenario_id = (
            select p2.scenario_id
            from public.lanes l2
            join public.paths p2 on p2.id = l2.path_id
            where l2.id = target_id
          )
      and l.name = (select l3.name from public.lanes l3 where l3.id = target_id);

  else
    raise exception 'Unknown kind %', kind;
  end if;

  affected := coalesce(affected, array[]::uuid[]);

  return jsonb_build_object(
    'label', coalesce(label, ''),
    'cell_count', cardinality(affected),
    'dependency_count', (
      select count(*) from public.cell_dependencies t
      where t.source_cell_id = any(affected) or t.target_cell_id = any(affected)
    ),
    'affected_slices', public.slices_referencing(affected)
  );
end;
$$;

-- Unchanged except for the one call: it now hands `deletion_impact` the path
-- it was itself given, which is the scope of everything below it.
create or replace function public.remove_step(path_id uuid, step_id uuid)
returns uuid
language plpgsql security definer
set search_path to 'public', 'pg_catalog', 'pg_temp'
as $$
declare
  archive_id uuid;
  impact jsonb;
  payload jsonb;
begin
  if not public.is_service_account() then
    raise exception 'This account cannot edit the blueprint'
      using errcode = '42501';
  end if;

  impact := public.deletion_impact('step', step_id, remove_step.path_id);

  select jsonb_build_object(
    'step', to_jsonb(s),
    'path_id', remove_step.path_id,
    'cells', (select coalesce(jsonb_agg(to_jsonb(c)), '[]'::jsonb)
              from public.cells c
              where c.step_id = s.id and c.path_id = remove_step.path_id)
  ) into payload
  from public.steps s where s.id = step_id;

  insert into public.deleted_structure (kind, label, payload, affected_slices)
  values ('step', impact ->> 'label', payload, impact -> 'affected_slices')
  returning id into archive_id;

  delete from public.cells
    where cells.step_id = remove_step.step_id and cells.path_id = remove_step.path_id;
  delete from public.path_steps
    where path_steps.step_id = remove_step.step_id and path_steps.path_id = remove_step.path_id;

  -- Orphaned step rows serve nothing; the scenario keeps only columns in use.
  delete from public.steps s
    where s.id = remove_step.step_id
      and not exists (select 1 from public.path_steps ps where ps.step_id = s.id);

  -- Renumber what is left so positions stay contiguous.
  with ordered as (
    select ps.step_id, row_number() over (order by ps.position) - 1 as position
    from public.path_steps ps where ps.path_id = remove_step.path_id
  )
  update public.path_steps ps
    set position = ordered.position
    from ordered
    where ps.path_id = remove_step.path_id and ps.step_id = ordered.step_id;

  return archive_id;
end;
$$;

-- The proofs are invariants, not counts: they hold on an empty replay and on a
-- loaded database, because what changed is which rows the predicates ADDRESS,
-- and that is visible without any rows at all.
do $$
declare
  v_impact jsonb;
  v_refused boolean := false;
begin
  -- One signature, three arguments, the third optional. Two of them would mean
  -- an overload, and PostgREST would resolve `{kind, target_id}` to whichever
  -- it liked — which is the old behaviour surviving under the new name.
  if (select count(*) from pg_proc p
        join pg_namespace n on n.oid = p.pronamespace
       where n.nspname = 'public' and p.proname = 'deletion_impact') <> 1 then
    raise exception 'public.deletion_impact is not a single function; an overload would let the old signature answer';
  end if;

  if (select pronargs from pg_proc p
        join pg_namespace n on n.oid = p.pronamespace
       where n.nspname = 'public' and p.proname = 'deletion_impact') <> 3 then
    raise exception 'public.deletion_impact does not take three arguments';
  end if;

  if (select pronargdefaults from pg_proc p
        join pg_namespace n on n.oid = p.pronamespace
       where n.nspname = 'public' and p.proname = 'deletion_impact') <> 1 then
    raise exception 'scope_id has no default; every existing two-argument caller would break';
  end if;

  -- The refusal is the `step` contract. Asserted by calling, because a body is
  -- text until something runs it.
  begin
    select public.deletion_impact('step', gen_random_uuid()) into v_impact;
  exception when others then
    v_refused := true;
  end;
  if not v_refused then
    raise exception 'deletion_impact(''step'', id) answered without a scope; it cannot know which path';
  end if;

  -- And the three that answer still answer, over the current vocabulary.
  select public.deletion_impact('lane', gen_random_uuid()) into v_impact;
  if v_impact -> 'affected_slices' is null then
    raise exception 'deletion_impact(''lane'', …) no longer reports affected_slices';
  end if;
  select public.deletion_impact('scenario', gen_random_uuid()) into v_impact;
  if v_impact -> 'affected_slices' is null then
    raise exception 'deletion_impact(''scenario'', …) no longer reports affected_slices';
  end if;
  select public.deletion_impact('path', gen_random_uuid()) into v_impact;
  if v_impact -> 'affected_slices' is null then
    raise exception 'deletion_impact(''path'', …) no longer reports affected_slices';
  end if;

  -- The caller that would have hit the refusal on every step delete.
  if exists (
    select 1 from pg_proc p
      join pg_namespace n on n.oid = p.pronamespace
     where n.nspname = 'public' and p.proname = 'remove_step'
       and p.prosrc like '%deletion_impact(''step'', step_id)%'
  ) then
    raise exception 'remove_step still calls deletion_impact without a scope, which now refuses';
  end if;
end
$$;

-- @recipe — the grant names the Supabase roles. The function itself is core;
-- who may call it over PostgREST is this deployment's business. Dropping the
-- two-argument form dropped its grants with it, so this restores them on the
-- signature that exists now.

grant execute on function public.deletion_impact(text, uuid, uuid) to anon, authenticated;
