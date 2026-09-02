-- A touchpoint is a thing the service owns.
--
-- A placement named its touchpoint by a bare `name`, per cell. The same tool
-- placed at nine cells was nine strings that happened to agree, and nothing
-- held them to one spelling, one kind, one summary. A touchpoint is a thing
-- the SERVICE owns — an app, a document, a channel — and a placement is one
-- use of it at one cell.
--
-- So: a registry, `touchpoints`, one row per (service, name); and a
-- placement names its touchpoint one of two ways and exactly one —
-- `touchpoint_id` into the registry, or `name` alone when the registry lacks
-- it. A name-only placement is still a placement: drawn dashed on the board,
-- opening the same panel, offered a "Link to registry" action. It is never
-- matched to the entry it resembles by a rule; that choice is the author's.
--
-- ── The fold ──────────────────────────────────────────────────────────────
--
-- Every existing placement name becomes a registry row for its service
-- (one per spelling, case-insensitively) and the placement links to it.
-- Nothing is lost and nothing is guessed: the registry is minted FROM the
-- names, so every placement lands linked. Vacuous on an empty database.
--
-- ── The functions ─────────────────────────────────────────────────────────
--
-- `sync_cell_touchpoints(p_cell_id, p_names)` brings a cell's placements
-- into line with its text: a new name mints a registry row and a linked
-- placement; a name typed back links the name-only row that kept its
-- writing; a removed placement with anything on it — words, a role,
-- resources — stays as a name-only row, one with nothing on it goes. It
-- hands back what it removed so the caller's inverse can put the words back.
-- `restore_cell_touchpoints` is that inverse. `set_placement_touchpoint`
-- is "Link to registry" and its own inverse; `remove_placement` /
-- `restore_placement` take a name-only row nobody wants off a cell and put
-- it back, resources included. All five SECURITY DEFINER behind
-- `is_service_account()`: `touchpoint_id` and `name` are structure, and
-- structure does not move through a column grant.
--
-- The two copy functions carry the placement's identity across, both ways.
--
-- ── Replaying against an empty database ───────────────────────────────────
--
-- Schema changes, a fold over zero rows, function definitions. The proof is
-- an INVARIANT: the registry exists, no placement names its touchpoint both
-- ways or neither, every placement whose service's registry holds its name
-- is linked, the five functions are definers.

-- @core

-- ---------------------------------------------------------------------------
-- 1. The registry
-- ---------------------------------------------------------------------------

create table public.touchpoints (
  id         uuid primary key default gen_random_uuid(),
  service_id uuid not null references public.services (id) on delete cascade,
  name       text not null,
  kind       text not null default 'other'
               constraint touchpoints_kind_check
               check (kind in ('app', 'document', 'physical', 'channel', 'service', 'other')),
  summary    text,
  url        text,
  origin     text not null constraint touchpoints_origin_check check (origin in ('import', 'app')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint touchpoints_service_id_name_key unique (service_id, name)
);

create trigger set_touchpoints_updated_at
  before update on public.touchpoints
  for each row execute function public.set_updated_at();

comment on table public.touchpoints is
  'The service''s registry of touchpoints — the apps, documents, channels and '
  'things a moment happens through. One row per (service, name); a placement '
  'in cell_touchpoints is one use of one at one cell.';
comment on column public.touchpoints.kind is
  'app | document | physical | channel | service | other. What sort of thing '
  'this is; defaulted to other and judged later, never guessed from a name.';
comment on column public.touchpoints.summary is
  'What this touchpoint IS, for the service — not what it does at any one cell.';
comment on column public.touchpoints.url is
  'Where the touchpoint itself lives, when it has a home; a placement''s own '
  'link is a resource on the placement.';

-- ---------------------------------------------------------------------------
-- 2. Two ways to name a touchpoint, and exactly one
-- ---------------------------------------------------------------------------

alter table public.cell_touchpoints
  add column touchpoint_id uuid references public.touchpoints (id) on delete restrict,
  alter column name drop not null,
  drop constraint cell_touchpoints_cell_name_unique,
  add constraint cell_touchpoints_one_identity
    check ((touchpoint_id is null) <> (name is null)),
  add constraint cell_touchpoints_name_not_blank
    check (name is null or btrim(name) <> ''),
  add constraint cell_touchpoints_cell_id_touchpoint_id_key unique (cell_id, touchpoint_id);

create unique index cell_touchpoints_cell_name_key
  on public.cell_touchpoints (cell_id, lower(name))
  where name is not null;

comment on column public.cell_touchpoints.touchpoint_id is
  'The registry entry this placement names, or null for a name-only placement.';
comment on column public.cell_touchpoints.name is
  'The touchpoint''s name when the registry lacks it. Exactly one of name and '
  'touchpoint_id is set; linking to the registry clears it.';
comment on table public.cell_touchpoints is
  'One touchpoint used at one cell: its own summary and role at this moment. '
  'Named by touchpoint_id into the registry, or by name alone when the '
  'registry lacks it. What it points at is in resources.';

-- ---------------------------------------------------------------------------
-- 3. The fold: every name a registry row, every placement linked
-- ---------------------------------------------------------------------------

insert into public.touchpoints (service_id, name, origin)
select distinct on (ph.service_id, lower(ct.name))
       ph.service_id, ct.name, 'import'
  from public.cell_touchpoints ct
  join public.cells c on c.id = ct.cell_id
  join public.paths p on p.id = c.path_id
  join public.scenarios s on s.id = p.scenario_id
  join public.phases ph on ph.id = s.phase_id
 where ct.name is not null
 order by ph.service_id, lower(ct.name), ct.name;

update public.cell_touchpoints ct
   set touchpoint_id = tp.id,
       name          = null,
       updated_at    = now()
  from public.cells c
  join public.paths p on p.id = c.path_id
  join public.scenarios s on s.id = p.scenario_id
  join public.phases ph on ph.id = s.phase_id
  join public.touchpoints tp on tp.service_id = ph.service_id
 where c.id = ct.cell_id
   and ct.name is not null
   and lower(tp.name) = lower(ct.name);

-- ---------------------------------------------------------------------------
-- 4. The five placement writes
-- ---------------------------------------------------------------------------

create or replace function public.sync_cell_touchpoints(p_cell_id uuid, p_names text[])
returns jsonb
language plpgsql
security definer
set search_path = public, pg_catalog, pg_temp
as $function$
declare
  v_service_id uuid;
  v_lane_role  text;
  v_bearing    boolean;
  v_removed    jsonb;
  v_wanted     jsonb;
begin
  if not public.is_service_account() then
    raise exception 'This account cannot edit the blueprint' using errcode = '42501';
  end if;

  select ph.service_id, ln.lane_role
    into v_service_id, v_lane_role
    from public.cells c
    join public.lanes ln on ln.id = c.lane_id
    join public.paths p on p.id = c.path_id
    join public.scenarios s on s.id = p.scenario_id
    join public.phases ph on ph.id = s.phase_id
   where c.id = p_cell_id;

  if v_service_id is null then
    raise exception 'cell % is not attached to a service', p_cell_id;
  end if;

  -- Content on an actor lane is a sentence about what somebody did; syncing
  -- it would file that sentence in the registry as a tool.
  select v_lane_role in ('frontstage_tech', 'backstage_tech', 'support_systems')
         or exists (select 1 from public.cell_touchpoints where cell_id = p_cell_id)
    into v_bearing;

  if not v_bearing then
    return jsonb_build_object('skipped', true, 'removed', '[]'::jsonb);
  end if;

  select coalesce(jsonb_agg(jsonb_build_object('name', name, 'position', position)), '[]'::jsonb)
    into v_wanted
    from (
      select name, min(ord)::int as position
        from unnest(p_names) with ordinality as t(name, ord)
       where btrim(name) <> ''
       group by name
    ) deduped;

  insert into public.touchpoints (service_id, name, origin)
  select v_service_id, w.name, 'app'
    from jsonb_to_recordset(v_wanted) as w(name text, position int)
  on conflict (service_id, name) do nothing;

  -- A name typed back links the name-only row that was keeping its
  -- writing, rather than inserting a second row beside it.
  update public.cell_touchpoints ct
     set touchpoint_id = tp.id,
         name          = null,
         updated_at    = now()
    from jsonb_to_recordset(v_wanted) as w(name text, position int)
    join public.touchpoints tp
      on tp.service_id = v_service_id and tp.name = w.name
   where ct.cell_id = p_cell_id
     and ct.touchpoint_id is null
     and lower(ct.name) = lower(w.name)
     and not exists (select 1 from public.cell_touchpoints x
                      where x.cell_id = p_cell_id and x.touchpoint_id = tp.id);

  -- What leaves the text: linked rows whose name is not wanted. Handed back
  -- with everything on them, so the inverse can put the words back.
  select coalesce(jsonb_agg(jsonb_build_object(
           'name', tp.name,
           'position', ct.position,
           'summary', ct.summary,
           'role', ct.role,
           'resources', (select coalesce(jsonb_agg(jsonb_build_object(
                             'kind', r.kind, 'name', r.name, 'url', r.url,
                             'position', r.position, 'featured', r.featured, 'origin', r.origin
                           ) order by r.position), '[]'::jsonb)
                           from public.resources r where r.cell_touchpoint_id = ct.id)
         )), '[]'::jsonb)
    into v_removed
    from public.cell_touchpoints ct
    join public.touchpoints tp on tp.id = ct.touchpoint_id
   where ct.cell_id = p_cell_id
     and tp.name not in (
       select w.name from jsonb_to_recordset(v_wanted) as w(name text, position int)
     );

  -- A removed placement with anything on it stays as a name-only row —
  -- words, role and resources intact, drawn dashed — unless the cell already
  -- keeps a name-only row under that name. One with nothing on it goes.
  update public.cell_touchpoints ct
     set touchpoint_id = null,
         name          = tp.name,
         updated_at    = now()
    from public.touchpoints tp
   where ct.touchpoint_id = tp.id
     and ct.cell_id = p_cell_id
     and tp.name not in (
       select w.name from jsonb_to_recordset(v_wanted) as w(name text, position int)
     )
     and (coalesce(btrim(ct.summary), '') <> ''
          or ct.role is not null
          or exists (select 1 from public.resources r where r.cell_touchpoint_id = ct.id))
     and not exists (select 1 from public.cell_touchpoints x
                      where x.cell_id = p_cell_id and x.name is not null
                        and lower(x.name) = lower(tp.name));

  delete from public.cell_touchpoints ct
   using public.touchpoints tp
   where ct.touchpoint_id = tp.id
     and ct.cell_id = p_cell_id
     and tp.name not in (
       select w.name from jsonb_to_recordset(v_wanted) as w(name text, position int)
     );

  update public.cell_touchpoints ct
     set position = w.position,
         updated_at = now()
    from public.touchpoints tp,
         jsonb_to_recordset(v_wanted) as w(name text, position int)
   where ct.touchpoint_id = tp.id
     and ct.cell_id = p_cell_id
     and tp.name = w.name
     and ct.position is distinct from w.position;

  -- Name-only rows sit after the text's own, in the order they had.
  update public.cell_touchpoints ct
     set position = ranked.position,
         updated_at = now()
    from (
      select x.id,
             (select coalesce(max(position), -1) from public.cell_touchpoints y
               where y.cell_id = p_cell_id and y.touchpoint_id is not null)
             + row_number() over (order by x.position, x.name) as position
        from public.cell_touchpoints x
       where x.cell_id = p_cell_id and x.touchpoint_id is null
    ) ranked
   where ct.id = ranked.id
     and ct.position is distinct from ranked.position;

  insert into public.cell_touchpoints (cell_id, touchpoint_id, position, origin)
  select p_cell_id, tp.id, w.position, 'app'
    from jsonb_to_recordset(v_wanted) as w(name text, position int)
    join public.touchpoints tp
      on tp.service_id = v_service_id and tp.name = w.name
   where not exists (
     select 1 from public.cell_touchpoints ct
      where ct.cell_id = p_cell_id and ct.touchpoint_id = tp.id
   );

  return jsonb_build_object('skipped', false, 'removed', v_removed);
end
$function$;

create or replace function public.restore_cell_touchpoints(p_cell_id uuid, p_rows jsonb)
returns void
language plpgsql
security definer
set search_path = public, pg_catalog, pg_temp
as $function$
begin
  if not public.is_service_account() then
    raise exception 'This account cannot edit the blueprint' using errcode = '42501';
  end if;

  -- By name, linked or name-only: the revert re-ran the sync first, so a
  -- row that was kept name-only is linked again by the time this runs.
  update public.cell_touchpoints ct
     set summary    = r.summary,
         role       = r.role,
         updated_at = now()
    from jsonb_to_recordset(coalesce(p_rows, '[]'::jsonb))
           as r(name text, summary text, role text)
   where ct.cell_id = p_cell_id
     and ((ct.touchpoint_id is not null
           and exists (select 1 from public.touchpoints tp
                        where tp.id = ct.touchpoint_id and tp.name = r.name))
          or (ct.touchpoint_id is null and lower(ct.name) = lower(r.name)));

  -- The resources the placement carried, for a placement that has none —
  -- the one the same revert just re-inserted. One that still has its own
  -- is left alone rather than doubled.
  insert into public.resources
    (cell_id, cell_touchpoint_id, kind, name, url, position, featured, origin)
  select p_cell_id, ct.id,
         coalesce(nullif(btrim(e.kind), ''), 'link'), e.name, e.url,
         coalesce(e.position, e.ord::int - 1), coalesce(e.featured, false),
         coalesce(nullif(btrim(e.origin), ''), 'app')
    from jsonb_to_recordset(coalesce(p_rows, '[]'::jsonb))
           as r(name text, resources jsonb)
    join public.cell_touchpoints ct on ct.cell_id = p_cell_id
    left join public.touchpoints tp on tp.id = ct.touchpoint_id
    cross join lateral (
           select x.kind, x.name, x.url, x.position, x.featured, x.origin, x.ord
             from rows from (
                    jsonb_to_recordset(coalesce(r.resources, '[]'::jsonb))
                      as (kind text, name text, url text, position int, featured boolean, origin text)
                  ) with ordinality as x(kind, name, url, position, featured, origin, ord)
         ) e
   where ((ct.touchpoint_id is not null and tp.name = r.name)
          or (ct.touchpoint_id is null and lower(ct.name) = lower(r.name)))
     and nullif(btrim(e.url), '') is not null
     and not exists (select 1 from public.resources have where have.cell_touchpoint_id = ct.id);
end
$function$;

create or replace function public.set_placement_touchpoint(
  p_placement_id uuid,
  p_touchpoint_id uuid default null,
  p_name text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_catalog, pg_temp
as $function$
declare
  v_row public.cell_touchpoints;
  v_service_id uuid;
begin
  if not public.is_service_account() then
    raise exception 'This account cannot edit the blueprint' using errcode = '42501';
  end if;
  if (p_touchpoint_id is null) = (nullif(btrim(coalesce(p_name, '')), '') is null) then
    raise exception 'a placement names its touchpoint one way: a registry id or a name';
  end if;

  select ct.* into v_row from public.cell_touchpoints ct where ct.id = p_placement_id for update;
  if v_row.id is null then
    raise exception 'placement % does not exist', p_placement_id;
  end if;

  if p_touchpoint_id is not null then
    select ph.service_id into v_service_id
      from public.cells c
      join public.paths p on p.id = c.path_id
      join public.scenarios s on s.id = p.scenario_id
      join public.phases ph on ph.id = s.phase_id
     where c.id = v_row.cell_id;
    if not exists (select 1 from public.touchpoints tp
                    where tp.id = p_touchpoint_id and tp.service_id = v_service_id) then
      raise exception 'that touchpoint is not in this service''s registry';
    end if;
    if exists (select 1 from public.cell_touchpoints x
                where x.cell_id = v_row.cell_id and x.touchpoint_id = p_touchpoint_id and x.id <> v_row.id) then
      raise exception 'that cell already shows that touchpoint';
    end if;
  end if;

  update public.cell_touchpoints
     set touchpoint_id = p_touchpoint_id,
         name          = case when p_touchpoint_id is null then btrim(p_name) end,
         updated_at    = now()
   where id = p_placement_id;

  return jsonb_build_object('touchpoint_id', v_row.touchpoint_id, 'name', v_row.name);
end
$function$;

create or replace function public.remove_placement(p_placement_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_catalog, pg_temp
as $function$
declare
  v_row       jsonb;
  v_resources jsonb;
begin
  if not public.is_service_account() then
    raise exception 'This account cannot edit the blueprint' using errcode = '42501';
  end if;

  select to_jsonb(ct) into v_row from public.cell_touchpoints ct where ct.id = p_placement_id for update;
  if v_row is null then
    raise exception 'placement % does not exist', p_placement_id;
  end if;

  select coalesce(jsonb_agg(to_jsonb(r) order by r.position), '[]'::jsonb)
    into v_resources
    from public.resources r where r.cell_touchpoint_id = p_placement_id;

  delete from public.cell_touchpoints where id = p_placement_id;

  return jsonb_build_object('row', v_row, 'resources', v_resources);
end
$function$;

create or replace function public.restore_placement(p_row jsonb, p_resources jsonb default '[]'::jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_catalog, pg_temp
as $function$
declare
  v_id uuid;
begin
  if not public.is_service_account() then
    raise exception 'This account cannot edit the blueprint' using errcode = '42501';
  end if;

  insert into public.cell_touchpoints
    (id, cell_id, touchpoint_id, name, position, summary, role, origin, created_at)
  select r.id, r.cell_id, r.touchpoint_id, r.name,
         -- Its old position if free, else after everything the cell shows.
         case when exists (select 1 from public.cell_touchpoints x
                            where x.cell_id = r.cell_id and x.position = r.position)
              then (select coalesce(max(position), -1) + 1 from public.cell_touchpoints x
                     where x.cell_id = r.cell_id)
              else r.position end,
         r.summary, r.role, coalesce(r.origin, 'app'), coalesce(r.created_at, now())
    from jsonb_to_record(p_row)
      as r(id uuid, cell_id uuid, touchpoint_id uuid, name text, position int,
           summary text, role text, origin text, created_at timestamptz)
  returning id into v_id;

  if v_id is null then
    raise exception 'the captured placement could not be restored';
  end if;

  insert into public.resources
    (id, cell_id, cell_touchpoint_id, kind, name, url, position, featured, origin)
  select coalesce(e.id, gen_random_uuid()), (p_row ->> 'cell_id')::uuid, v_id,
         coalesce(nullif(btrim(e.kind), ''), 'link'), e.name, e.url,
         coalesce(e.position, e.ord::int - 1), coalesce(e.featured, false),
         coalesce(nullif(btrim(e.origin), ''), 'app')
    from rows from (
           jsonb_to_recordset(coalesce(p_resources, '[]'::jsonb))
             as (id uuid, kind text, name text, url text, position int, featured boolean, origin text)
         ) with ordinality as e(id, kind, name, url, position, featured, origin, ord)
   where nullif(btrim(e.url), '') is not null;

  return jsonb_build_object('placement_id', v_id);
end
$function$;

comment on function public.sync_cell_touchpoints(uuid, text[]) is
  'Brings a cell''s placements into line with its text. A new name mints a '
  'registry row; a name typed back links the name-only row; a removed '
  'placement with anything on it becomes name-only, one with nothing is '
  'deleted. Returns what it removed, for restore_cell_touchpoints.';
comment on function public.restore_cell_touchpoints(uuid, jsonb) is
  'The inverse of a sync: summary and role back by name, linked or '
  'name-only; resources re-created for a row that has none.';
comment on function public.set_placement_touchpoint(uuid, uuid, text) is
  'Names a placement''s touchpoint one way — a registry id, or a name the '
  'registry lacks — and returns the previous pair, which is the inverse.';
comment on function public.remove_placement(uuid) is
  'Deletes one placement and returns the row and its resources for '
  'restore_placement.';
comment on function public.restore_placement(jsonb, jsonb) is
  'The inverse of remove_placement: the row back under its own id, '
  'resources included.';

-- ---------------------------------------------------------------------------
-- 5. The copy functions carry a placement's identity across
-- ---------------------------------------------------------------------------

do $rewrite$
declare
  target record;
  after  text;
  rewritten int := 0;
begin
  for target in
    select p.oid, p.proname
      from pg_proc p
      join pg_namespace n on n.oid = p.pronamespace
     where n.nspname = 'public'
       and p.proname in ('duplicate_path', 'duplicate_scenario')
  loop
    after := pg_get_functiondef(target.oid);
    after := replace(after,
      '(cell_id, name, position, summary, role, origin)',
      '(cell_id, touchpoint_id, name, position, summary, role, origin)');
    after := replace(after,
      'select nc.id, ct.name, ct.position, ct.summary, ct.role, ''app''',
      'select nc.id, ct.touchpoint_id, ct.name, ct.position, ct.summary, ct.role, ''app''');
    after := replace(after,
      'on nct.cell_id = nc.id and nct.name = ct.name',
      'on nct.cell_id = nc.id and nct.touchpoint_id is not distinct from ct.touchpoint_id and nct.name is not distinct from ct.name');
    -- Found while proving the copy: duplicate_path's default kind was still
    -- 'alternative', a value paths_kind_check has refused since the kinds
    -- became happy | variant | exception. A copy is a variant.
    after := replace(after,
      'kind text DEFAULT ''alternative''::text',
      'kind text DEFAULT ''variant''::text');
    if after ~ '''alternative''' then
      raise exception '% still defaults a path kind the check refuses', target.proname;
    end if;
    if after !~ 'ct\.touchpoint_id, ct\.name' or after !~ 'nct\.touchpoint_id is not distinct from' then
      raise exception '% does not carry a placement''s identity', target.proname;
    end if;
    execute after;
    rewritten := rewritten + 1;
  end loop;
  if rewritten <> 2 then
    raise exception 'expected to rewrite duplicate_path and duplicate_scenario, rewrote %', rewritten;
  end if;
end
$rewrite$;

-- @recipe — the registry's RLS and grants, the same shape as every other
-- root-scoped table; the five structural writes closed to anon.
alter table public.touchpoints enable row level security;

create policy touchpoints_select_anon on public.touchpoints
  for select to anon using (true);
create policy touchpoints_select_auth on public.touchpoints
  for select to authenticated using (true);
create policy touchpoints_insert_service_only on public.touchpoints
  for insert to authenticated with check (public.is_service_account());
create policy touchpoints_update_service_only on public.touchpoints
  for update to authenticated
  using (public.is_service_account())
  with check (public.is_service_account());
create policy touchpoints_delete_service_only on public.touchpoints
  for delete to authenticated using (public.is_service_account());

grant select on public.touchpoints to anon, authenticated;
grant insert, delete on public.touchpoints to authenticated;
grant update (name, kind, summary, url) on public.touchpoints to authenticated;
revoke insert, update, delete, truncate on public.touchpoints from anon;
revoke truncate on public.touchpoints from authenticated;

revoke execute on function public.sync_cell_touchpoints(uuid, text[]) from public, anon;
grant execute on function public.sync_cell_touchpoints(uuid, text[]) to authenticated;
revoke execute on function public.restore_cell_touchpoints(uuid, jsonb) from public, anon;
grant execute on function public.restore_cell_touchpoints(uuid, jsonb) to authenticated;
revoke execute on function public.set_placement_touchpoint(uuid, uuid, text) from public, anon;
grant execute on function public.set_placement_touchpoint(uuid, uuid, text) to authenticated;
revoke execute on function public.remove_placement(uuid) from public, anon;
grant execute on function public.remove_placement(uuid) to authenticated;
revoke execute on function public.restore_placement(jsonb, jsonb) from public, anon;
grant execute on function public.restore_placement(jsonb, jsonb) to authenticated;
-- @core

-- ---------------------------------------------------------------------------
-- The IR revision this shape is
-- ---------------------------------------------------------------------------

update public.schema_version
set version = '2026.09.07',
    applied_at = now();

do $version$
begin
  if not exists (select 1 from public.schema_version where version = '2026.09.07') then
    raise exception 'schema_version did not take the bump';
  end if;
end
$version$;

-- ---------------------------------------------------------------------------
-- Proof — invariants, never censuses
-- ---------------------------------------------------------------------------

do $proof$
declare
  bad int;
  fn  text;
begin
  if to_regclass('public.touchpoints') is null then
    raise exception 'the registry is missing';
  end if;
  if not exists (select 1 from pg_constraint
                  where conrelid = 'public.cell_touchpoints'::regclass
                    and conname = 'cell_touchpoints_one_identity') then
    raise exception 'cell_touchpoints has no one-identity check';
  end if;

  select count(*) into bad from public.cell_touchpoints
   where (touchpoint_id is null) = (name is null);
  if bad <> 0 then
    raise exception '% placements name their touchpoint both ways or neither', bad;
  end if;

  -- The fold left nothing name-only that its service's registry could name.
  select count(*) into bad
    from public.cell_touchpoints ct
    join public.cells c on c.id = ct.cell_id
    join public.paths p on p.id = c.path_id
    join public.scenarios s on s.id = p.scenario_id
    join public.phases ph on ph.id = s.phase_id
   where ct.name is not null
     and exists (select 1 from public.touchpoints tp
                  where tp.service_id = ph.service_id and lower(tp.name) = lower(ct.name));
  if bad <> 0 then
    raise exception '% placements stayed name-only with their name in the registry', bad;
  end if;

  foreach fn in array array[
    'public.sync_cell_touchpoints(uuid, text[])',
    'public.restore_cell_touchpoints(uuid, jsonb)',
    'public.set_placement_touchpoint(uuid, uuid, text)',
    'public.remove_placement(uuid)',
    'public.restore_placement(jsonb, jsonb)'
  ] loop
    if not (select prosecdef from pg_proc where oid = fn::regprocedure) then
      raise exception '% is not SECURITY DEFINER', fn;
    end if;
  end loop;
end
$proof$;
