-- An argument nobody sent is not an erasure.
--
-- `set_cell_dependency` upserts, and its `do update` took both prose columns
-- straight off the row it had tried to insert:
--
--     do update set name = excluded.name, note = excluded.note
--
-- Both arguments default to null, so an omitted argument and an argument sent
-- as null arrive identically. A call that says nothing about the words does not
-- leave them alone — it CLEARS them, on an edge that already exists, and
-- reports success by returning the id it did the damage under.
--
-- ── WHO REACHES IT ────────────────────────────────────────────────────────
--
-- The agent tool. `create_cell_dependency` needs a source, a target and a kind;
-- its prose argument is optional. Asked twice for the same edge — a retry, a
-- re-run of a plan, a model connecting two cells it has already connected — the
-- second call is a bare upsert onto the first, and whatever an author wrote on
-- that edge is gone. Two rows would be a duplicate anybody could see; this
-- leaves one row and a blank field.
--
-- The panel's connection editor cannot: `validateDraftDependency` refuses a
-- duplicate before any call is made. That is a validation standing between a
-- reader and a defect, which is not the same as the defect not being there.
--
-- Performed at the bottom of this file, and performed before it was written
-- against a database holding the previous body: author an edge carrying a name
-- and a note, call again with only the three arguments the tool always sends,
-- and both columns come back null.
--
-- ── THE FIX ───────────────────────────────────────────────────────────────
--
--     do update set name = coalesce(excluded.name, cell_dependencies.name),
--                   note = coalesce(excluded.note, cell_dependencies.note)
--
-- An omitted argument means "leave it as it was"; a supplied one still
-- replaces. Nothing else about the function moves.
--
-- BOTH COLUMNS, and the same reasoning twice. The question worth asking is
-- whether either of them wants the plain assignment — whether some caller
-- CLEARS a value by sending null through this function. None does:
--
--   name   nothing has written it since the editor and the agent tool were
--          pointed at `note`. The only calls that reach it send null because
--          they have nothing to say, never to empty it.
--
--   note   the editor writes it on the way IN, on a pair this function has
--          never seen. Clearing one means removing the connection and adding
--          it again, which is `clear_cell_dependency` and a fresh insert — a
--          different row, and no upsert involved.
--
-- Nor does an undo: the inverse recorded for this function is a delete, not a
-- re-set, so nothing replays an earlier null through it either.
--
-- The cost is stated rather than hidden. After this, a null cannot clear
-- through this function, and neither can an empty string — the body has always
-- turned `''` into null before the conflict clause, so the two have never been
-- distinguishable here. An edit that must be able to empty a field needs a
-- function whose arguments are REQUIRED, where an omission is a loud "function
-- does not exist" rather than a quiet erase; this one, whose job is to add an
-- edge, is not it. Between a caller unable to blank a field and a caller
-- blanking one it never mentioned, only the second loses an author's words.
--
-- ── WHAT THIS FILE DOES NOT ASSERT ────────────────────────────────────────
--
-- That the previous body cleared. It is provable — it is how the defect was
-- found — but it is a fact about what this repository shipped last, not an
-- invariant of the statement below, and a migration that asserts it refuses to
-- apply to a database that arrived at the fix any other way. The proof asserts
-- the post-condition: after this file, an omitted argument preserves and a
-- supplied one replaces. That is true of an empty database, of a loaded one,
-- and of every replay.
--
-- ── THE CLAIM WITHOUT THE ROLE ────────────────────────────────────────────
--
-- The proof holds a service-account claim and does NOT switch role, and the
-- two halves have different reasons.
--
-- It holds the claim because it has to: on a Supabase database the recipe has
-- replaced `is_service_account()` with a read of the JWT, and a migration
-- applies with no JWT at all — so an unclaimed proof would not get past the
-- first line of the function it is proving. In the core, where the tier seam
-- is `select true`, setting the GUC costs nothing and means nothing.
--
-- It does not switch role because it cannot. A deployment proves a write RPC
-- under `set local role authenticated`, since an owner run cannot see a
-- missing grant and the restrictive policies match zero rows in silence. This
-- file is the core, and the core replays onto a stock Postgres where
-- `authenticated` is not a role: a `set local role` in this band is a file
-- that cannot replay. The grants and the policies are the recipe's, and they
-- are untouched here — `create or replace` keeps the ACL, which a
-- drop-and-recreate would take with it.

-- @core

CREATE OR REPLACE FUNCTION public.set_cell_dependency(source_cell_id uuid, target_cell_id uuid, kind text DEFAULT 'leads_to'::text, name text DEFAULT NULL::text, note text DEFAULT NULL::text)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_catalog', 'pg_temp'
AS $function$
declare
  dependency_id uuid;
  source_path uuid;
  target_path uuid;
begin
  if not public.is_service_account() then
    raise exception 'This account cannot edit the blueprint'
      using errcode = '42501';
  end if;

  if set_cell_dependency.source_cell_id = set_cell_dependency.target_cell_id then
    raise exception 'A cell cannot depend on itself';
  end if;
  if set_cell_dependency.kind not in ('leads_to', 'enables') then
    raise exception 'Unknown dependency kind %', set_cell_dependency.kind;
  end if;

  select c.path_id into source_path from public.cells c
    where c.id = set_cell_dependency.source_cell_id;
  select c.path_id into target_path from public.cells c
    where c.id = set_cell_dependency.target_cell_id;
  if source_path is null or target_path is null then
    raise exception 'Both cells must exist';
  end if;
  -- Arrows are drawn within one path's grid; a cross-path arrow has nowhere
  -- to render and is what validate_ir.py rejects on import.
  if source_path <> target_path then
    raise exception 'Both cells must be in the same path of the journey';
  end if;

  insert into public.cell_dependencies (source_cell_id, target_cell_id, kind, name, note)
  values (set_cell_dependency.source_cell_id, set_cell_dependency.target_cell_id,
          set_cell_dependency.kind,
          nullif(trim(set_cell_dependency.name), ''),
          nullif(trim(set_cell_dependency.note), ''))
  on conflict on constraint cell_dependencies_source_target_kind_unique
    -- An omitted argument leaves the column as it was. Both arguments default
    -- to null, so `excluded.<col>` cannot tell "the caller said nothing" from
    -- "the caller said nothing is there" — and on an edge that already exists,
    -- the first is what every caller means.
    do update set name = coalesce(excluded.name, public.cell_dependencies.name),
                  note = coalesce(excluded.note, public.cell_dependencies.note)
  returning id into dependency_id;

  return dependency_id;
end;
$function$;

-- ── THE BEHAVIOUR, PERFORMED ──────────────────────────────────────────────
--
-- Two claims, neither readable off the definition above without believing a
-- reading of `coalesce`:
--
--   1. a call that omits the words leaves them where they were, on the row
--      that was already there — the defect this file exists to close;
--   2. a call that carries them still replaces them, so the fix did not make
--      the function unable to edit the field it upserts.
--
-- The fixture is built and given back inside a sentinel-exception block: a
-- migration may prove a thing, and may not leave the rows it proved it with.
do $an_omitted_argument$
declare
  svc uuid;
  phase uuid;
  scen uuid;
  pth uuid;
  stp uuid;
  lane_a uuid;
  lane_b uuid;
  cell_a uuid;
  cell_b uuid;
  dep uuid;
  again uuid;
  rows_now integer;
  v_name text;
  v_note text;
  done boolean := false;
  msg text;
begin
  begin
    -- The claim the function's first line asks for. A GUC, not a role: this
    -- has to be true on a stock Postgres replay as well as on Supabase, and
    -- `set local` gives it back at the end of this block's transaction.
    --
    -- `app_metadata.role` and nothing else, because that is all
    -- `is_service_account()` reads. A fuller claim would carry the name of a
    -- Supabase role into a dollar-quoted body, where the core's own purity
    -- check reads it — correctly — as the core reaching for something only
    -- Supabase provides.
    perform set_config(
      'request.jwt.claims', '{"app_metadata":{"role":"service"}}', true);

    insert into public.services (name)
      values ('omitted-argument fixture') returning id into svc;
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
    -- Two lanes rather than two cells in one: `cells_lane_step_slot_unique` is
    -- the grid saying one cell per square.
    insert into public.lanes (path_id, name, position)
      values (pth, 'fixture lane A', 0) returning id into lane_a;
    insert into public.lanes (path_id, name, position)
      values (pth, 'fixture lane B', 1) returning id into lane_b;
    insert into public.cells (path_id, lane_id, step_id, content)
      values (pth, lane_a, stp, 'fixture source') returning id into cell_a;
    insert into public.cells (path_id, lane_id, step_id, content)
      values (pth, lane_b, stp, 'fixture target') returning id into cell_b;

    -- The edge as an author leaves it.
    dep := public.set_cell_dependency(
      cell_a, cell_b, 'leads_to', 'Email', 'the sentence the author wrote');

    -- 1. THE BARE RE-RUN. Exactly what the agent tool sends when it is asked
    -- for an edge that already exists and given nothing to say about it.
    again := public.set_cell_dependency(cell_a, cell_b, 'leads_to');
    if again <> dep then
      raise exception 'the re-run wrote a different row (% then %)', dep, again;
    end if;
    select count(*) into rows_now
      from public.cell_dependencies where source_cell_id = cell_a;
    if rows_now <> 1 then
      raise exception 'the re-run left % rows, expected 1', rows_now;
    end if;

    select d.name, d.note into v_name, v_note
      from public.cell_dependencies d where d.id = dep;
    if v_name is distinct from 'Email' then
      raise exception 'an omitted name erased the badge (now %)', coalesce(v_name, '<null>');
    end if;
    if v_note is distinct from 'the sentence the author wrote' then
      raise exception 'an omitted note erased the sentence (now %)', coalesce(v_note, '<null>');
    end if;

    -- 2. AND A SUPPLIED ARGUMENT STILL REPLACES. A function that preserved
    -- everything would pass the assertions above and be useless.
    perform public.set_cell_dependency(
      cell_a, cell_b, 'leads_to', 'Post', 'a second sentence');
    select d.name, d.note into v_name, v_note
      from public.cell_dependencies d where d.id = dep;
    if v_name is distinct from 'Post' or v_note is distinct from 'a second sentence' then
      raise exception 'a supplied argument no longer replaces (%, %)',
        coalesce(v_name, '<null>'), coalesce(v_note, '<null>');
    end if;

    -- One of them at a time, which is the case the two-argument reading of
    -- `coalesce` gets wrong: the note moves and the name stays put.
    perform public.set_cell_dependency(
      cell_a, cell_b, 'leads_to', null, 'a third sentence');
    select d.name, d.note into v_name, v_note
      from public.cell_dependencies d where d.id = dep;
    if v_name is distinct from 'Post' or v_note is distinct from 'a third sentence' then
      raise exception 'one column moved and took the other with it (%, %)',
        coalesce(v_name, '<null>'), coalesce(v_note, '<null>');
    end if;

    perform set_config('request.jwt.claims', '', true);
    done := true;
    raise exception using errcode = 'P0001',
      message = 'omitted-argument fixture rollback';
  exception when others then
    perform set_config('request.jwt.claims', '', true);
    get stacked diagnostics msg = message_text;
    if msg <> 'omitted-argument fixture rollback' then raise; end if;
  end;

  if not done then
    raise exception 'the omitted-argument cases never ran';
  end if;
  if exists (select 1 from public.services where name = 'omitted-argument fixture') then
    raise exception 'the omitted-argument fixture survived the rollback';
  end if;
end
$an_omitted_argument$;
