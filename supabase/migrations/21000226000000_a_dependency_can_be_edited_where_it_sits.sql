-- A dependency can be edited where it sits.
--
-- Authored 2026-09-11.
--
-- `set_cell_dependency` upserts on `cell_dependencies_source_target_kind_unique`,
-- so the three things a connection row shows do not edit alike through it:
--
--     note    the upsert updates it                        — correct
--     kind    a different kind is a different conflict key  — INSERTS A SECOND ROW
--     target  a different target is a different key too     — INSERTS A SECOND ROW
--
-- The first row is neither updated nor removed. It is orphaned, and the board
-- keeps drawing it. That never showed while the panel could only add a
-- connection or remove one — an author who wanted a different connection
-- removed the old one and added another. The panel now edits a row where it
-- sits, and that needs a write that means "this row, differently".
--
-- Two calls — clear then set — are not that. They are two transactions, so a
-- failure between them destroys the edge, and they leave two ledger entries
-- whose undo only half works.
--
-- ── WHAT IT RETURNS, AND WHY IT IS NOT THE ID ─────────────────────────────
--
-- The row AS IT STOOD, captured and locked before the write, so the client
-- can record an inverse keyed on the dependency's own id: the undo restores
-- THIS row, not a look-alike that happens to join the same two cells by the
-- time it runs. The inverse is this same function pointed at the values it
-- returned. Every argument it takes is in that row, so nothing an edit can
-- change is left out of its undo.
--
-- One asymmetry, stated rather than hidden: the function trims the note on
-- the way in, so undoing an edit of an imported row whose note carried
-- leading or trailing space puts the words back without the space.
--
-- ── WHY `note` IS AN ARGUMENT AND `name` IS NOT ───────────────────────────
--
-- `note` is the connection's one prose field, the one the row reads back. It
-- has to travel with the kind and the target or a kind change would silently
-- discard it, and it has to come back in the returned row or the undo
-- restores an edge with its words missing. `name` is the badge spelling the
-- panel neither shows nor writes. This function neither reads nor writes it,
-- so an edit leaves it exactly as the row held it; `set_cell_dependency` and
-- `restore_cell_dependency` still carry it for the callers that do.
--
-- ── WHY EVERY ARGUMENT IS REQUIRED ────────────────────────────────────────
--
-- On the sibling every argument but the two cells has a default, and here a
-- default would make an omitted argument a silent erase: an update that was
-- told nothing about the note would clear it. Required, an omitted argument
-- is a PostgREST "function does not exist" — loud, at the first call, rather
-- than quiet at every one.
--
-- ── WHAT IT DOES NOT DO ───────────────────────────────────────────────────
--
-- It does not move an edge's SOURCE. A cell edits only the connections it is
-- the source of; a connection that should leave a different cell is a
-- different connection, and is removed and added.

-- @core

create or replace function public.update_cell_dependency(
  dependency_id uuid,
  kind text,
  target_cell_id uuid,
  note text
)
returns jsonb
language plpgsql
security definer
set search_path to 'public', 'pg_catalog', 'pg_temp'
as $function$
declare
  previous public.cell_dependencies;
  source_path uuid;
  target_path uuid;
begin
  if not public.is_service_account() then
    raise exception 'This account cannot edit the blueprint'
      using errcode = '42501';
  end if;

  -- Locked, because every check below is read-then-write: without the lock
  -- two concurrent edits of one row can both pass the uniqueness check, and
  -- the second meets the constraint instead of the sentence.
  select d.* into previous
    from public.cell_dependencies d
   where d.id = update_cell_dependency.dependency_id
   for update;
  if previous.id is null then
    raise exception 'That connection no longer exists';
  end if;

  -- The checks `set_cell_dependency` makes, asked of the row's own source
  -- rather than of an argument.
  if update_cell_dependency.kind not in ('leads_to', 'enables') then
    raise exception 'Unknown dependency kind %', update_cell_dependency.kind;
  end if;
  if previous.source_cell_id = update_cell_dependency.target_cell_id then
    raise exception 'A cell cannot depend on itself';
  end if;

  select c.path_id into source_path from public.cells c
    where c.id = previous.source_cell_id;
  select c.path_id into target_path from public.cells c
    where c.id = update_cell_dependency.target_cell_id;
  if source_path is null or target_path is null then
    raise exception 'Both cells must exist';
  end if;
  -- Arrows are drawn within one path's grid; a cross-path arrow has nowhere
  -- to render and is what validate_ir.py rejects on import.
  if source_path <> target_path then
    raise exception 'Both cells must be in the same path of the journey';
  end if;

  -- The one check the sibling does not need, because its upsert absorbs the
  -- collision and this update meets it. Said in the panel's words rather than
  -- as a constraint name.
  if exists (
    select 1 from public.cell_dependencies d
     where d.source_cell_id = previous.source_cell_id
       and d.target_cell_id = update_cell_dependency.target_cell_id
       and d.kind = update_cell_dependency.kind
       and d.id <> previous.id
  ) then
    raise exception 'That connection already exists';
  end if;

  update public.cell_dependencies d
     set target_cell_id = update_cell_dependency.target_cell_id,
         kind = update_cell_dependency.kind,
         note = nullif(btrim(update_cell_dependency.note), '')
   where d.id = previous.id;

  return jsonb_build_object(
    'id', previous.id,
    'source_cell_id', previous.source_cell_id,
    'target_cell_id', previous.target_cell_id,
    'kind', previous.kind,
    'note', previous.note
  );
end;
$function$;

-- Postgres grants EXECUTE to PUBLIC on every function it creates, on any
-- Postgres, so this revoke is the core's half.
revoke execute on function public.update_cell_dependency(uuid, text, uuid, text) from public;

-- @recipe — the grants name the Supabase roles. The function is core; who may
-- call it is this deployment's enforcement of the contract, on the same terms
-- as every other authoring write.

revoke execute on function public.update_cell_dependency(uuid, text, uuid, text) from anon;
grant execute on function public.update_cell_dependency(uuid, text, uuid, text) to authenticated;

-- @core

-- ── THE BEHAVIOUR, PERFORMED ──────────────────────────────────────────────
--
-- Five claims, none of them readable off the definition above:
--
--   1. a kind change leaves exactly ONE row, and so does a target change —
--      the defect this function exists to fix, and the one a future rewrite
--      back onto the upsert would silently reintroduce;
--   2. `leads_to` and `enables` stay distinguishable ACROSS such a change, so
--      an edge moved between them stops and starts being drawn. `leads_to` is
--      what the canvas's arrow layer filters on, so this is the data half of
--      the asymmetry the panel renders;
--   3. the returned row is the row AS IT STOOD — checked on the first call,
--      whose before-state has since been overwritten twice — and the edit
--      leaves the `name` column as it was;
--   4. the undo, performed, by feeding each returned row straight back in;
--   5. an edit onto a connection that already exists, and an edit of one that
--      is gone, each fail with the sentence the panel shows.
--
-- The fixture is built and given back inside a sentinel-exception block: a
-- migration may prove a thing, and may not leave the rows it proved it with.
do $edit_in_place$
declare
  svc uuid;
  phase uuid;
  scen uuid;
  pth uuid;
  stp uuid;
  lane_a uuid;
  lane_b uuid;
  lane_c uuid;
  cell_a uuid;
  cell_b uuid;
  cell_c uuid;
  dep uuid;
  before_kind_change jsonb;
  before_target_change jsonb;
  rows_now integer;
  drawn integer;
  final_kind text;
  final_target uuid;
  final_note text;
  final_name text;
  done boolean := false;
  msg text;
begin
  -- Can this environment hold a service claim at all?
  --
  -- Everything below goes through `update_cell_dependency`, which refuses an
  -- account that is not the service account. On Supabase, on the shim, and on
  -- a stock replay where the core's `is_service_account()` is `select true`,
  -- the claim set inside the fixture is enough. Where it is not, the proof is
  -- skipped rather than faked: reaching past the guard to prove the statements
  -- underneath would prove a copy of the function instead of the function.
  perform set_config(
    'request.jwt.claims', '{"app_metadata":{"role":"service"}}', true);
  if not public.is_service_account() then
    perform set_config('request.jwt.claims', '', true);
    raise notice
      'edit-in-place proof skipped: this environment cannot hold a service claim, so the guarded write cannot run here';
    return;
  end if;
  perform set_config('request.jwt.claims', '', true);

  begin
    -- The claim the function's first line asks for. A GUC, not a role: the
    -- core replays onto a stock Postgres where `authenticated` is not a role,
    -- and on the seed-load path the core runs before the recipe has granted
    -- it anything. The grants above are the recipe's, and a deployment proves
    -- them by calling the function as the role it signs in as.
    perform set_config(
      'request.jwt.claims', '{"app_metadata":{"role":"service"}}', true);

    insert into public.services (name)
      values ('edit-in-place fixture') returning id into svc;
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
    -- Three lanes rather than three cells in one: the grid holds one cell per
    -- square.
    insert into public.lanes (path_id, name, position)
      values (pth, 'fixture lane A', 0) returning id into lane_a;
    insert into public.lanes (path_id, name, position)
      values (pth, 'fixture lane B', 1) returning id into lane_b;
    insert into public.lanes (path_id, name, position)
      values (pth, 'fixture lane C', 2) returning id into lane_c;
    insert into public.cells (path_id, lane_id, step_id, content)
      values (pth, lane_a, stp, 'fixture source') returning id into cell_a;
    insert into public.cells (path_id, lane_id, step_id, content)
      values (pth, lane_b, stp, 'fixture target') returning id into cell_b;
    insert into public.cells (path_id, lane_id, step_id, content)
      values (pth, lane_c, stp, 'fixture other target') returning id into cell_c;

    insert into public.cell_dependencies (source_cell_id, target_cell_id, kind, name, note)
      values (cell_a, cell_b, 'leads_to', 'a badge nobody draws', 'the note it arrived with')
      returning id into dep;

    -- 1. A KIND CHANGE. One row before, one row after, the same row.
    before_kind_change :=
      public.update_cell_dependency(dep, 'enables', cell_b, 'the note it arrived with');
    select count(*) into rows_now
      from public.cell_dependencies where source_cell_id = cell_a;
    if rows_now <> 1 then
      raise exception 'a kind change left % rows, expected 1', rows_now;
    end if;

    -- 2. AND THE ASYMMETRY MOVED WITH IT. `leads_to` draws, `enables` does
    -- not; the edge is now the kind that does not draw.
    select count(*) into drawn
      from public.cell_dependencies
     where source_cell_id = cell_a and kind = 'leads_to';
    if drawn <> 0 then
      raise exception 'an edge changed to enables still counts as drawn (% rows)', drawn;
    end if;

    -- A TARGET CHANGE. Still one row, and still the same one.
    before_target_change :=
      public.update_cell_dependency(dep, 'enables', cell_c, 'a different note');
    select count(*) into rows_now
      from public.cell_dependencies where source_cell_id = cell_a;
    if rows_now <> 1 then
      raise exception 'a target change left % rows, expected 1', rows_now;
    end if;
    if not exists (select 1 from public.cell_dependencies where id = dep) then
      raise exception 'the edited row is gone; the edit replaced it rather than changing it';
    end if;

    -- 3. WHAT CAME BACK IS THE ROW AS IT STOOD, checked on the FIRST call: a
    -- function returning the row as it now stands would agree with the row on
    -- the second call and only disagree here.
    if before_kind_change ->> 'kind' <> 'leads_to'
       or (before_kind_change ->> 'note') <> 'the note it arrived with'
       or (before_kind_change ->> 'id')::uuid <> dep
       or (before_kind_change ->> 'target_cell_id')::uuid <> cell_b then
      raise exception 'the returned row is not the row as it stood: %', before_kind_change;
    end if;
    select d.name into final_name from public.cell_dependencies d where d.id = dep;
    if final_name is distinct from 'a badge nobody draws' then
      raise exception 'the name did not survive the edit (now %)', coalesce(final_name, '<null>');
    end if;

    -- 4. THE UNDO, PERFORMED — as the ledger performs it, newest first, each
    -- inverse the function pointed at the row it returned.
    perform public.update_cell_dependency(
      (before_target_change ->> 'id')::uuid,
      before_target_change ->> 'kind',
      (before_target_change ->> 'target_cell_id')::uuid,
      before_target_change ->> 'note');
    perform public.update_cell_dependency(
      (before_kind_change ->> 'id')::uuid,
      before_kind_change ->> 'kind',
      (before_kind_change ->> 'target_cell_id')::uuid,
      before_kind_change ->> 'note');

    select d.kind, d.target_cell_id, d.note
      into final_kind, final_target, final_note
      from public.cell_dependencies d where d.id = dep;
    if final_kind <> 'leads_to' or final_target <> cell_b
       or final_note is distinct from 'the note it arrived with' then
      raise exception
        'undo left the edge as (%, %, %), not where it started', final_kind, final_target, final_note;
    end if;

    select count(*) into drawn
      from public.cell_dependencies
     where source_cell_id = cell_a and kind = 'leads_to';
    if drawn <> 1 then
      raise exception 'after the undo % edges are drawn, expected 1', drawn;
    end if;

    -- 5. A COLLISION IS REFUSED IN THE PANEL'S WORDS. A second edge from the
    -- same source, then an edit that would turn the first into a copy of it.
    insert into public.cell_dependencies (source_cell_id, target_cell_id, kind)
      values (cell_a, cell_c, 'leads_to');
    begin
      perform public.update_cell_dependency(dep, 'leads_to', cell_c, null);
      raise exception 'an edit onto an existing connection was accepted';
    exception when others then
      get stacked diagnostics msg = message_text;
      if msg <> 'That connection already exists' then raise; end if;
    end;

    -- AND AN EDIT OF A ROW THAT IS GONE SAYS SO. Matching nothing is a
    -- failure here, not a quiet success.
    begin
      perform public.update_cell_dependency(gen_random_uuid(), 'leads_to', cell_b, null);
      raise exception 'editing a connection that does not exist was accepted';
    exception when others then
      get stacked diagnostics msg = message_text;
      if msg <> 'That connection no longer exists' then raise; end if;
    end;

    perform set_config('request.jwt.claims', '', true);
    done := true;
    raise exception using errcode = 'P0001',
      message = 'edit-in-place fixture rollback';
  exception when others then
    perform set_config('request.jwt.claims', '', true);
    get stacked diagnostics msg = message_text;
    if msg <> 'edit-in-place fixture rollback' then raise; end if;
  end;

  if not done then
    raise exception 'the edit-in-place cases never ran';
  end if;
  if exists (select 1 from public.services where name = 'edit-in-place fixture') then
    raise exception 'the edit-in-place fixture survived the rollback';
  end if;
end
$edit_in_place$;
