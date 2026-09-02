-- A scenario left merged opens merged.
--
-- `scenarios.layout` held `single | stacked`, and the canvas drew three
-- things: single (one path at a time), stacked (one full band per path on a
-- shared step axis) and merged (the paths combined into ONE blueprint). The
-- third was the one a reader reached for most and the only one the row could
-- not say — it lived in a session-local override, so a scenario a reviewer
-- left merged opened stacked for the next person, every time.
--
-- The first was a layout nobody chose. Stacked with one path selected IS one
-- path drawn in full; `single` only ever changed which grid component drew
-- it. A value that changes the component and not the picture is not a
-- layout, so it goes, and its rows move to `stacked`.
--
--   single  →  stacked      one path stacked is one band; nothing to see
--   (session merged)  →  merged   what the row could not say, it now says
--
-- The toggle's write is `update_scenario_layout`. SECURITY DEFINER behind
-- `is_service_account()`, like every other authoring write: `authenticated`
-- holds no UPDATE on the column, and a viewer's choice stays a session
-- choice by construction, not by convention.
--
-- `create_scenario` still checked the three values `21000116000000` retired
-- and defaulted to the one this migration retires. It is `create or replace`d
-- with the same argument names — PostgREST sends them by name — so its ACL
-- survives untouched.

-- @core

update public.scenarios set layout = 'stacked' where layout = 'single';

alter table public.scenarios
  drop constraint scenarios_layout_check,
  add constraint scenarios_layout_check check (layout in ('stacked', 'merged')),
  alter column layout set default 'stacked';

comment on column public.scenarios.layout is
  'How this scenario opens: stacked = one full band per path on a shared '
  'step axis; merged = the paths combined into one blueprint. The header '
  'toggle writes it, so a scenario left merged opens merged.';

-- ---------------------------------------------------------------------------
-- create_scenario: the same function, two layouts, the right default
-- ---------------------------------------------------------------------------

create or replace function public.create_scenario(
  phase_id uuid,
  name text,
  layout text default 'stacked',
  lane_source_path_id uuid default null,
  lane_set jsonb default '[]'::jsonb,
  step_count int default 5,
  path_name text default 'Happy Path'
)
returns jsonb
language plpgsql security definer
set search_path = public, pg_catalog, pg_temp
as $$
declare
  scenario_id uuid;
  new_path_id uuid;
  next_order int;
  lane jsonb;
  step_id uuid;
  i int;
begin
  if not public.is_service_account() then
    raise exception 'This account cannot edit the blueprint'
      using errcode = '42501';
  end if;

  if coalesce(trim(name), '') = '' then
    raise exception 'A blueprint needs a name';
  end if;
  if layout not in ('stacked', 'merged') then
    raise exception 'Unknown layout %', layout
      using hint = 'One of: stacked, merged.';
  end if;

  select coalesce(max(position), -1) + 1 into next_order
  from public.scenarios where scenarios.phase_id = create_scenario.phase_id;

  insert into public.scenarios (phase_id, name, position, layout, origin)
  values (create_scenario.phase_id, create_scenario.name, next_order, create_scenario.layout, 'app')
  returning id into scenario_id;

  insert into public.paths (scenario_id, name, kind, origin)
  values (scenario_id, path_name, 'happy', 'app')
  returning id into new_path_id;

  -- Lanes: copied from a source path, or taken from the explicit set.
  if lane_source_path_id is not null then
    insert into public.lanes (path_id, name, lane_role, position, origin)
    select new_path_id, l.name, l.lane_role, l.position, 'app'
    from public.lanes l where l.path_id = lane_source_path_id;
  else
    for lane in select * from jsonb_array_elements(lane_set) loop
      insert into public.lanes (path_id, name, lane_role, position, origin)
      values (
        new_path_id,
        lane ->> 'name',
        nullif(lane ->> 'lane_role', ''),
        coalesce((lane ->> 'position')::int, 0),
        'app'
      );
    end loop;
  end if;

  -- Columns start unnamed; naming them is the first thing you do on the grid.
  for i in 0 .. greatest(step_count, 1) - 1 loop
    insert into public.steps (scenario_id, name, origin)
    values (scenario_id, 'Step ' || (i + 1), 'app')
    returning id into step_id;
    insert into public.path_steps (path_id, step_id, position)
    values (new_path_id, step_id, i);
  end loop;

  return jsonb_build_object('scenario_id', scenario_id, 'path_id', new_path_id);
end;
$$;

-- ---------------------------------------------------------------------------
-- update_scenario_layout: the toggle's write
-- ---------------------------------------------------------------------------

create or replace function public.update_scenario_layout(scenario_id uuid, layout text)
returns void
language plpgsql
security definer
set search_path = public, pg_catalog, pg_temp
as $$
begin
  if not public.is_service_account() then
    raise exception 'This account cannot edit the blueprint' using errcode = '42501';
  end if;
  if layout not in ('stacked', 'merged') then
    raise exception 'Unknown layout %', layout
      using hint = 'One of: stacked, merged.';
  end if;

  update public.scenarios s set layout = update_scenario_layout.layout
  where s.id = update_scenario_layout.scenario_id;
  if not found then
    raise exception 'Unknown scenario';
  end if;
end;
$$;

comment on function public.update_scenario_layout(uuid, text) is
  'The header toggle''s write: how this scenario''s board is drawn, stacked '
  'or merged. Its inverse is itself with the previous value.';

-- @recipe — the Supabase roles: a fresh function is executable by PUBLIC.
revoke execute on function public.update_scenario_layout(uuid, text) from public, anon;
grant execute on function public.update_scenario_layout(uuid, text) to authenticated;
-- @core

-- ---------------------------------------------------------------------------
-- The IR revision this shape is
-- ---------------------------------------------------------------------------

update public.schema_version
set version = '2026.09.04',
    applied_at = now();

do $version$
begin
  if not exists (select 1 from public.schema_version where version = '2026.09.04') then
    raise exception 'schema_version did not take the bump';
  end if;
end
$version$;

-- ---------------------------------------------------------------------------
-- Proof — invariants, never censuses
-- ---------------------------------------------------------------------------

do $proof$
declare
  def text;
begin
  select pg_get_constraintdef(c.oid) into def
    from pg_constraint c
   where c.conrelid = 'public.scenarios'::regclass
     and c.conname = 'scenarios_layout_check';
  if def is null or def !~ '''stacked''' or def !~ '''merged''' or def ~ '''single''' then
    raise exception 'scenarios_layout_check is not stacked | merged: %', def;
  end if;

  select column_default into def
    from information_schema.columns
   where table_schema = 'public' and table_name = 'scenarios' and column_name = 'layout';
  if def !~ '''stacked''' then
    raise exception 'scenarios.layout does not default to stacked: %', def;
  end if;

  -- Vacuous on an empty database; on a populated one, that no row was left behind.
  if exists (select 1 from public.scenarios where layout not in ('stacked', 'merged')) then
    raise exception 'a scenario kept a retired layout';
  end if;

  if exists (
    select 1 from pg_proc p join pg_namespace n on n.oid = p.pronamespace
     where n.nspname = 'public' and p.proname = 'create_scenario'
       and (p.prosrc ~ '''single''' or p.prosrc ~ 'side-by-side' or p.prosrc ~ 'integrated')
  ) then
    raise exception 'create_scenario still admits a retired layout';
  end if;

  if to_regprocedure('public.update_scenario_layout(uuid, text)') is null then
    raise exception 'update_scenario_layout is missing';
  end if;
end
$proof$;
