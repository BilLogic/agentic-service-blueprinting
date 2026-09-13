-- A cell's featured image is its frame.
--
-- Authored 2026-09-13.
--
-- A cell had two ways to have "its picture": the `frame` column, and a
-- resource attachment flagged `featured`, which the panel led with whatever the
-- frame held. And a touchpoint's stock logo lived only on the touchpoint, so a
-- deployment that wanted a logo on a slide uploaded a copy of it as the cell's
-- frame, and the panel drew the logo twice.
--
-- The model is now one slot. The FEATURED IMAGE of a cell is `cells.frame`:
-- whatever a person chose — a storyboard illustration, a screenshot, one of the
-- cell's attachments, or its touchpoint's logo. What is stored is what shows;
-- nothing is substituted at display time. Links keep `resources.featured`,
-- which is the panel's buttons and a different thing.
--
-- ── WHY A FUNCTION AND NOT A COLUMN GRANT ────────────────────────────────
--
-- `authenticated` holds no UPDATE on `frame`, and no function wrote it: frames
-- arrived through seeds and imports only. A column grant would open a write
-- the ledger never sees. Every other author write is a logged, undoable
-- operation, so this one is too: `set_cell_featured_image` returns the frame
-- AS IT STOOD, and its inverse is the same function pointed at that value.
--
-- It accepts an https address (an attachment's url) or a path on this site
-- (a stock logo such as `/touchpoint-logos/…`), or null to clear. A path that
-- starts `//` or `/\` is another host to a browser and is refused, as is any
-- other scheme: this string is drawn as an image source.
--
-- ── WHY PLACING A CELL FILLS AN EMPTY FRAME ──────────────────────────────
--
-- A cell placed on a touchpoint that carries a logo leads with that logo
-- until somebody chooses otherwise. The two functions that place a cell on a
-- registry entry — `sync_cell_touchpoints`, which mints placements from a
-- cell's text, and `set_placement_touchpoint`, which links a placement to an
-- entry — set `frame` to the entry's `icon_url` when the frame is null or
-- blank and the entry has one. The stock path is stored, never a copy. A frame
-- that holds anything is never overwritten.
--
-- The sync fills only for placements it INSERTS, so a text save on a cell
-- already on that touchpoint does not refill a frame somebody cleared.
--
-- Both are rewritten from `pg_get_functiondef`, the way `21000131000000`
-- rewrote them, and each replacement is asserted to have landed. Neither
-- signature changes, and `create or replace` keeps both ACLs.
--
-- ── Replaying against an empty database ──────────────────────────────────
--
-- One new function, two rewrites, and a proof that builds its own fixture and
-- gives it back inside a sentinel-exception block.

-- @core

create or replace function public.set_cell_featured_image(
  cell_id uuid,
  image_url text
)
returns jsonb
language plpgsql
security definer
set search_path to 'public', 'pg_catalog', 'pg_temp'
as $function$
declare
  found_id uuid;
  previous_frame text;
  next_frame text;
begin
  if not public.is_service_account() then
    raise exception 'This account cannot edit the blueprint'
      using errcode = '42501';
  end if;

  select c.id, c.frame into found_id, previous_frame
    from public.cells c
   where c.id = set_cell_featured_image.cell_id
   for update;
  if found_id is null then
    raise exception 'That cell no longer exists';
  end if;

  next_frame := nullif(btrim(set_cell_featured_image.image_url), '');
  if next_frame is not null and next_frame !~ '^(https://|/[^/\\])' then
    raise exception 'A featured image is an https address or a path on this site';
  end if;

  update public.cells c
     set frame = next_frame
   where c.id = found_id;

  return jsonb_build_object('cell_id', found_id, 'frame', previous_frame);
end;
$function$;

comment on function public.set_cell_featured_image(uuid, text) is
  'Sets a cell''s featured image, which is its frame: an https address, a '
  'path on this site, or null to clear. Returns the frame as it stood, which '
  'is the inverse.';

revoke execute on function public.set_cell_featured_image(uuid, text) from public;

-- @recipe — the grants name the Supabase roles, on the same terms as every
-- other authoring write.

revoke execute on function public.set_cell_featured_image(uuid, text) from anon;
grant execute on function public.set_cell_featured_image(uuid, text) to authenticated;

-- @core

-- ---------------------------------------------------------------------------
-- The sync fills an empty frame with the logo of a touchpoint it places
-- ---------------------------------------------------------------------------

do $rewrite$
declare
  before text;
  after  text;
begin
  before := pg_get_functiondef('public.sync_cell_touchpoints(uuid, text[])'::regprocedure);
  after  := replace(before,
    $r$  insert into public.cell_touchpoints (cell_id, touchpoint_id, position, origin)
  select p_cell_id, tp.id, w.position, 'app'
    from jsonb_to_recordset(v_wanted) as w(name text, position int)
    join public.touchpoints tp
      on tp.name = w.name
   where not exists (
     select 1 from public.cell_touchpoints ct
      where ct.cell_id = p_cell_id and ct.touchpoint_id = tp.id
   );$r$,
    $r$  -- A placement it inserts on a touchpoint with a logo fills an empty
  -- frame with that logo's path; a frame that holds anything is left alone.
  with placed as (
    insert into public.cell_touchpoints (cell_id, touchpoint_id, position, origin)
    select p_cell_id, tp.id, w.position, 'app'
      from jsonb_to_recordset(v_wanted) as w(name text, position int)
      join public.touchpoints tp
        on tp.name = w.name
     where not exists (
       select 1 from public.cell_touchpoints ct
        where ct.cell_id = p_cell_id and ct.touchpoint_id = tp.id
     )
    returning touchpoint_id, position
  )
  update public.cells c
     set frame = logo.icon_url
    from (
      select btrim(tp.icon_url) as icon_url
        from placed
        join public.touchpoints tp on tp.id = placed.touchpoint_id
       where nullif(btrim(tp.icon_url), '') is not null
       order by placed.position
       limit 1
    ) logo
   where c.id = p_cell_id
     and nullif(btrim(c.frame), '') is null;$r$);

  if after = before then
    raise exception 'sync_cell_touchpoints was not rewritten at all';
  end if;
  if after !~ 'returning touchpoint_id, position' then
    raise exception 'sync_cell_touchpoints does not read back what it placed';
  end if;

  execute after;
end
$rewrite$;

-- ---------------------------------------------------------------------------
-- Linking a placement to a registry entry fills an empty frame the same way
-- ---------------------------------------------------------------------------

do $rewrite$
declare
  before text;
  after  text;
begin
  before := pg_get_functiondef('public.set_placement_touchpoint(uuid, uuid, text)'::regprocedure);
  after  := replace(before,
    $r$         updated_at    = now()
   where id = p_placement_id;
$r$,
    $r$         updated_at    = now()
   where id = p_placement_id;

  -- An entry with a logo fills the cell's empty frame with that logo's path;
  -- a frame that holds anything is left alone.
  if p_touchpoint_id is not null then
    update public.cells c
       set frame = btrim(tp.icon_url)
      from public.touchpoints tp
     where tp.id = p_touchpoint_id
       and c.id = v_row.cell_id
       and nullif(btrim(tp.icon_url), '') is not null
       and nullif(btrim(c.frame), '') is null;
  end if;
$r$);

  if after = before then
    raise exception 'set_placement_touchpoint was not rewritten at all';
  end if;
  if after !~ 'that touchpoint is not in the registry' then
    raise exception 'set_placement_touchpoint lost its registry-membership check';
  end if;

  execute after;
end
$rewrite$;

-- ---------------------------------------------------------------------------
-- The behaviour, performed
-- ---------------------------------------------------------------------------
--
--   1. setting returns the frame as it stood, and feeding that back undoes it;
--   2. clearing stores null, and a refused address and a missing cell each
--      fail with the sentence the panel shows;
--   3. an account that is not the service account cannot write;
--   4. the sync fills an empty frame with the logo of a touchpoint it places,
--      and leaves a set frame alone;
--   5. linking a placement to an entry with a logo does the same.
do $featured_image$
declare
  svc uuid;
  phase uuid;
  scen uuid;
  pth uuid;
  stp uuid;
  lane_tp uuid;
  lane_b uuid;
  lane_c uuid;
  cell_a uuid;
  cell_b uuid;
  cell_c uuid;
  entry uuid;
  placement uuid;
  logo constant text := '/touchpoint-logos/example-logo.png';
  shot constant text := 'https://example.supabase.co/storage/v1/object/public/cell-attachments/shot.png';
  before_set jsonb;
  before_clear jsonb;
  now_frame text;
  done boolean := false;
  msg text;
begin
  perform set_config(
    'request.jwt.claims', '{"app_metadata":{"role":"service"}}', true);
  if not public.is_service_account() then
    perform set_config('request.jwt.claims', '', true);
    raise notice
      'featured-image proof skipped: this environment cannot hold a service claim, so the guarded write cannot run here';
    return;
  end if;
  perform set_config('request.jwt.claims', '', true);

  begin
    perform set_config(
      'request.jwt.claims', '{"app_metadata":{"role":"service"}}', true);

    insert into public.services (name)
      values ('featured-image fixture') returning id into svc;
    insert into public.phases (service_id, name, position)
      values (svc, 'fixture phase', 0) returning id into phase;
    insert into public.scenarios (phase_id, name, position)
      values (phase, 'fixture scenario', 0) returning id into scen;
    insert into public.paths (scenario_id, name, kind)
      values (scen, 'fixture path', 'happy') returning id into pth;
    insert into public.steps (scenario_id, name)
      values (scen, 'fixture step') returning id into stp;
    insert into public.path_steps (path_id, step_id, position)
      values (pth, stp, 0);
    insert into public.lanes (path_id, name, position, lane_role)
      values (pth, 'fixture touchpoints', 0, 'frontstage_touchpoints') returning id into lane_tp;
    insert into public.lanes (path_id, name, position, lane_role)
      values (pth, 'fixture touchpoints B', 1, 'backstage_touchpoints') returning id into lane_b;
    insert into public.lanes (path_id, name, position)
      values (pth, 'fixture lane C', 2) returning id into lane_c;
    insert into public.cells (path_id, lane_id, step_id, content)
      values (pth, lane_tp, stp, 'Fixture tool') returning id into cell_a;
    insert into public.cells (path_id, lane_id, step_id, content, frame)
      values (pth, lane_b, stp, 'Fixture tool', shot) returning id into cell_b;
    insert into public.cells (path_id, lane_id, step_id, content)
      values (pth, lane_c, stp, 'fixture actor') returning id into cell_c;
    insert into public.touchpoints (name, origin, icon_url)
      values ('Fixture tool', 'app', logo) returning id into entry;

    -- 1. SET, AND ITS UNDO.
    before_set := public.set_cell_featured_image(cell_c, shot);
    if before_set ->> 'frame' is not null or (before_set ->> 'cell_id')::uuid <> cell_c then
      raise exception 'setting did not return the frame as it stood: %', before_set;
    end if;
    select frame into now_frame from public.cells where id = cell_c;
    if now_frame is distinct from shot then
      raise exception 'setting stored %, not the address', now_frame;
    end if;
    perform public.set_cell_featured_image(
      (before_set ->> 'cell_id')::uuid, before_set ->> 'frame');
    select frame into now_frame from public.cells where id = cell_c;
    if now_frame is not null then
      raise exception 'undo left the frame as %', now_frame;
    end if;

    -- 2. A LOGO PATH IS ACCEPTED, AND CLEARING STORES NULL.
    perform public.set_cell_featured_image(cell_c, logo);
    before_clear := public.set_cell_featured_image(cell_c, '  ');
    select frame into now_frame from public.cells where id = cell_c;
    if now_frame is not null or before_clear ->> 'frame' is distinct from logo then
      raise exception 'clearing left % and returned %', now_frame, before_clear;
    end if;

    begin
      perform public.set_cell_featured_image(cell_c, '//evil.example/x.png');
      raise exception 'a protocol-relative address was accepted';
    exception when others then
      get stacked diagnostics msg = message_text;
      if msg <> 'A featured image is an https address or a path on this site' then raise; end if;
    end;
    begin
      perform public.set_cell_featured_image(cell_c, 'javascript:alert(1)');
      raise exception 'a script address was accepted';
    exception when others then
      get stacked diagnostics msg = message_text;
      if msg <> 'A featured image is an https address or a path on this site' then raise; end if;
    end;
    begin
      perform public.set_cell_featured_image(gen_random_uuid(), shot);
      raise exception 'a missing cell was accepted';
    exception when others then
      get stacked diagnostics msg = message_text;
      if msg <> 'That cell no longer exists' then raise; end if;
    end;

    -- 3. NO SERVICE CLAIM, NO WRITE — where the environment can tell the
    -- difference. A stock replay's `is_service_account()` is `select true`,
    -- and there the guard has nothing to refuse.
    perform set_config('request.jwt.claims', '{"app_metadata":{}}', true);
    if not public.is_service_account() then
      begin
        perform public.set_cell_featured_image(cell_c, shot);
        raise exception 'an account without the service claim set a featured image';
      exception when insufficient_privilege then
        null;
      end;
    end if;
    perform set_config(
      'request.jwt.claims', '{"app_metadata":{"role":"service"}}', true);

    -- 4. THE SYNC FILLS AN EMPTY FRAME, AND LEAVES A SET ONE.
    perform public.sync_cell_touchpoints(cell_a, array['Fixture tool']);
    perform public.sync_cell_touchpoints(cell_b, array['Fixture tool']);
    select frame into now_frame from public.cells where id = cell_a;
    if now_frame is distinct from logo then
      raise exception 'placing an empty cell on a logo left its frame as %', now_frame;
    end if;
    select frame into now_frame from public.cells where id = cell_b;
    if now_frame is distinct from shot then
      raise exception 'placing overwrote a set frame with %', now_frame;
    end if;

    -- A text save on a cell already placed does not refill a cleared frame.
    perform public.set_cell_featured_image(cell_a, null);
    perform public.sync_cell_touchpoints(cell_a, array['Fixture tool']);
    select frame into now_frame from public.cells where id = cell_a;
    if now_frame is not null then
      raise exception 'a resync refilled a cleared frame with %', now_frame;
    end if;

    -- 5. LINKING A NAME-ONLY PLACEMENT TO THE ENTRY FILLS THE SAME WAY.
    insert into public.cell_touchpoints (cell_id, name, position, origin)
      values (cell_c, 'fixture name', 0, 'app') returning id into placement;
    perform public.set_placement_touchpoint(placement, entry, null);
    select frame into now_frame from public.cells where id = cell_c;
    if now_frame is distinct from logo then
      raise exception 'linking an empty cell to a logo left its frame as %', now_frame;
    end if;
    perform public.set_cell_featured_image(cell_c, shot);
    perform public.set_placement_touchpoint(placement, null, 'fixture name');
    perform public.set_placement_touchpoint(placement, entry, null);
    select frame into now_frame from public.cells where id = cell_c;
    if now_frame is distinct from shot then
      raise exception 'linking overwrote a set frame with %', now_frame;
    end if;

    perform set_config('request.jwt.claims', '', true);
    done := true;
    raise exception using errcode = 'P0001',
      message = 'featured-image fixture rollback';
  exception when others then
    perform set_config('request.jwt.claims', '', true);
    get stacked diagnostics msg = message_text;
    if msg <> 'featured-image fixture rollback' then raise; end if;
  end;

  if not done then
    raise exception 'the featured-image cases never ran';
  end if;
  if exists (select 1 from public.services where name = 'featured-image fixture') then
    raise exception 'the featured-image fixture survived the rollback';
  end if;
end
$featured_image$;

-- @recipe — the ACL the two rewrites had to preserve, and the new function's,
-- asserted where the roles exist.
do $posture$
declare
  fn text;
begin
  foreach fn in array array[
    'public.set_cell_featured_image(uuid, text)',
    'public.sync_cell_touchpoints(uuid, text[])',
    'public.set_placement_touchpoint(uuid, uuid, text)'
  ] loop
    if not has_function_privilege('authenticated', fn::regprocedure, 'execute') then
      raise exception 'authenticated cannot execute %', fn;
    end if;
    if has_function_privilege('anon', fn::regprocedure, 'execute') then
      raise exception 'anon can execute %', fn;
    end if;
  end loop;
end
$posture$;
-- @core
