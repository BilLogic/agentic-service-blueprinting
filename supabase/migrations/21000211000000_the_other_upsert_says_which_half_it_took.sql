-- The other upsert says which half it took, and its undo stops guessing.
--
-- `upsert_cell` upserts. Landing on a square of the grid that already holds a
-- cell it UPDATES that row and hands back its id — the same id, in the same
-- shape, as the one it returns when it inserts. Nothing downstream can tell
-- the two apart, and one thing downstream has to: the ledger derives this
-- write's inverse from the operation's NAME, and the name says "cell", so the
-- inverse it records is `delete_cell`.
--
-- On the insert half that is exact. On the update half it is destruction
-- dressed as an undo: the cell was there before the write, the write only
-- changed its text, and taking the write back removes the cell entirely —
-- with its summary, its Function, its Form, its Value props, its owner pair
-- and its status, none of which this write touched.
--
-- ── WHY THIS IS NOT A LIVE DEFECT, AND WHY THAT IS THE ARGUMENT ───────────
--
-- Both callers establish the slot was empty before they call. The panel calls
-- `upsert_cell` only on a draft, when there is no cell id to update; the agent
-- tool reads the slot first and refuses with "A cell already exists at that
-- slot … `upsert_cell` only creates."
--
-- So nothing reaches the update half today, and this file is not a repair of
-- a symptom anybody has seen. It is a repair of the reason nobody has seen
-- one, which is two callers remembering.
--
-- The agent tool's occupancy check is a read followed by a write. Between the
-- read and the upsert nothing holds the slot: two agent turns on the same
-- board, or an agent and a person, and both reads see an empty square and the
-- second write lands on the first write's cell. The window is small and the
-- consequence is not — the loser's undo deletes the winner's cell.
--
-- And the guard is per-caller. It defends the two callers that carry it and
-- must be carried again by the third, which is a rule living in prose in two
-- files rather than in the operation. `set_cell_dependency` made this exact
-- argument in `21000210000000` and pointed at this function's guard as the
-- cheaper fix it declined to copy. This file finishes that sentence.
--
-- The guards STAY. Once the write reports for itself they are belt-and-braces
-- rather than the safety, and the agent tool's refusal is a better answer to
-- "create a cell where one already is" than a silent update would be. What
-- changes is that the ledger no longer depends on them being remembered.
--
-- ── WHAT THE FUNCTION NOW RETURNS ─────────────────────────────────────────
--
--     { "id": uuid, "inserted": boolean, "previous": {…} | null }
--
--   id         the row written, either half. What every existing caller read
--              off the old `uuid` return, now under a name.
--   inserted   which half the upsert took, read from the written row's `xmax`
--              — zero exactly when this statement inserted it. No caller can
--              establish this afterwards, which is why the write says it.
--   previous   the row AS IT STOOD, captured before the write under a lock,
--              or null when there was nothing there. Keyed on the row's own
--              id, so the undo restores THIS cell and not whatever occupies
--              the square by the time it runs.
--
-- `previous` is null whenever `inserted` is true, and it can ALSO be null when
-- `inserted` is false: another session inserting the cell between the capture
-- and the upsert leaves this call updating a row it never saw. That is a state
-- the caller must be able to see, because the honest answer to it is to offer
-- no undo at all rather than an approximate one — which is what the ledger
-- does with the deletes, and is the same sentence said about a different
-- operation.
--
-- ── WHAT `previous` CARRIES, AND WHY IT IS ONE COLUMN ─────────────────────
--
-- A cell has eighteen columns and this carries one of them, which wants
-- saying out loud rather than discovering.
--
-- The update half writes exactly one: `do update set content =
-- excluded.content`. Everything else in the `values` list is either part of
-- the conflict key (path, lane, step, slot) or set only on the insert —
-- `origin`, and `cell_key`, which is deliberately minted on insert and never
-- on update because a cell's key is its identity for slice recovery.
--
-- So `previous` carries `id` and `content`, and the restore writes `content`.
-- That is everything `upsert_cell` can change, which is the whole of what its
-- undo may change.
--
-- The temptation is the other seven columns a person actually types into a
-- cell — summary, status, Function, Form, Value props, owner, perceived
-- owner. An undo that put those back too would look more thorough and would
-- be wrong: `upsert_cell` never wrote them, so restoring them would reach
-- past this write and revert somebody's separate edit, which has its own
-- ledger row and its own inverse through `update_cell_content` and
-- `update_cell_spec`. An inverse that undoes more than its operation did is
-- the same class of error as one that undoes less.
--
-- ── WHY THE RETURN TYPE MOVES, AND WHAT THAT COSTS ────────────────────────
--
-- A `uuid` cannot carry two more facts, and Postgres will not let `create or
-- replace` change a return type. So the function is dropped and recreated,
-- which takes its ACL with it. A freshly created function picks up the
-- platform's default privileges, and a `revoke … from public` does not take
-- away a role's own grant — so the ACL is restated in both bands rather than
-- assumed. The core revokes the PUBLIC execute the recreate lands on; the
-- recipe half re-states the anon revoke and the authenticated grant, because
-- those name roles only a Supabase deployment has. `20260818001000`,
-- `21000207000000` and `21000210000000` are the files that did this before,
-- in that order and for that reason.
--
-- The signature is byte-identical, so every caller's ARGUMENTS are unaffected
-- — over PostgREST too, which resolves by argument name. What changes is what
-- comes back, and the two readers of that are the panel's editor, which takes
-- the id, and the agent tool, which quotes it.
--
-- ── THE OTHER HALF: A CELL'S TEXT CAN BE PUT BACK ─────────────────────────
--
-- Knowing the upsert updated is only half an undo; the other half needs an
-- operation that restores what the update overwrote. `restore_cell_content`
-- is that operation and nothing else — one prose column, on one row, by id.
-- It exists for the same reason `restore_cell_dependency`, `restore_placement`
-- and `restore_featured_resources` do: an inverse a caller cannot express with
-- the forward operation needs a function of its own.
--
-- It ASSIGNS rather than coalescing. `cells.content` is `not null default ''`,
-- so the state a coalescing inverse could not express is not null but EMPTY:
-- the panel creates a cell from a draft with `form.content.trim()`, which is
-- routinely the empty string, and an agent writing text onto that blank square
-- is exactly the collision this file is about. An inverse that treated `''` as
-- "the caller said nothing" would leave the agent's sentence standing and
-- report success. A revert control that silently cannot clear a field is worse
-- than no revert control, because it lies.
--
-- And it does not trim. `upsert_cell` does not trim either — it coalesces and
-- writes what it is given — so a value that reaches this function has already
-- been trimmed by whatever wrote it, except an imported row, which the
-- pipeline writes directly. A restore that trimmed would quietly rewrite such
-- a row on the way back rather than putting it back.
--
-- A zero-row update is a failure and says so. There is no state in which the
-- undo of an edit to a row that still exists matches nothing, so matching
-- nothing means the cell is gone and the caller is owed the sentence.
--
-- One thing the restore does NOT undo, said plainly: `upsert_cell` links the
-- step to the path first when the link is missing, and neither the delete this
-- replaces nor the restore that succeeds it removes that link. That is
-- unchanged by this file, and on the update half it is unreachable anyway — a
-- cell cannot exist in a column the path does not carry.

-- @core

drop function if exists public.upsert_cell(uuid, uuid, uuid, text);

create or replace function public.upsert_cell(
  path_id uuid,
  lane_id uuid,
  step_id uuid,
  content text
)
returns jsonb
language plpgsql
security definer
set search_path to 'public', 'pg_catalog', 'pg_temp'
as $function$
declare
  previous public.cells;
  cell_id uuid;
  was_inserted boolean;
  next_column int;
begin
  if not public.is_service_account() then
    raise exception 'This account cannot edit the blueprint'
      using errcode = '42501';
  end if;

  if not exists (
    select 1 from public.path_steps ps
    where ps.path_id = upsert_cell.path_id and ps.step_id = upsert_cell.step_id
  ) then
    select coalesce(max(position) + 1, 0) into next_column
    from public.path_steps where path_steps.path_id = upsert_cell.path_id;
    insert into public.path_steps (path_id, step_id, position)
    values (upsert_cell.path_id, upsert_cell.step_id, next_column);
  end if;

  -- BEFORE the write, and locked. The lock is what stops a concurrent edit of
  -- the same square from landing between this read and the upsert and leaving
  -- the caller holding a `previous` that was never true.
  select c.* into previous
    from public.cells c
   where c.lane_id = upsert_cell.lane_id
     and c.step_id = upsert_cell.step_id
     and c.position = 0
   for update;

  -- Minted on insert, never on update: a cell's key is its identity for slice
  -- recovery, so renaming a lane must not silently repoint every slice that
  -- referenced the cells in it.
  insert into public.cells (path_id, lane_id, step_id, position, content, origin, cell_key)
  values (upsert_cell.path_id, upsert_cell.lane_id, upsert_cell.step_id, 0,
          coalesce(content, ''), 'app',
          public.mint_cell_key(upsert_cell.path_id, upsert_cell.lane_id,
                               upsert_cell.step_id))
  on conflict on constraint cells_lane_step_slot_unique
    do update set content = excluded.content
  -- `xmax` is zero on a row this statement inserted and the updating
  -- transaction's id on a row it updated. It is the write's own account of
  -- which half it took, which is the one account nothing else can second-guess
  -- after the fact.
  returning id, (xmax = 0) into cell_id, was_inserted;

  return jsonb_build_object(
    'id', cell_id,
    'inserted', was_inserted,
    'previous',
    case
      when was_inserted or previous.id is null then null
      -- One column, because one column is what the update half wrote. See the
      -- header: an inverse that undoes more than its operation did reverts
      -- somebody else's edit.
      else jsonb_build_object('id', previous.id, 'content', previous.content)
    end);
end;
$function$;

create or replace function public.restore_cell_content(
  cell_id uuid,
  content text
)
returns void
language plpgsql
security definer
set search_path to 'public', 'pg_catalog', 'pg_temp'
as $function$
begin
  if not public.is_service_account() then
    raise exception 'This account cannot edit the blueprint'
      using errcode = '42501';
  end if;

  update public.cells c
     set content = restore_cell_content.content
   where c.id = restore_cell_content.cell_id;

  if not found then
    raise exception 'That cell no longer exists';
  end if;
end;
$function$;

-- The recreate above landed on the default EXECUTE TO PUBLIC. This is the
-- revoke the previous body carried, restated because the drop took it.
revoke execute on function public.upsert_cell(uuid, uuid, uuid, text) from public;
revoke execute on function public.restore_cell_content(uuid, text) from public;

-- @recipe — the grants name the Supabase roles. The functions themselves are
-- core; who may call them is this deployment's enforcement of the contract.
-- `upsert_cell` was dropped above and took its grants with it, so this restores
-- them on the recreated signature; `restore_cell_content` is new and gets the
-- same terms as every other authoring write.

revoke execute on function public.upsert_cell(uuid, uuid, uuid, text) from anon;
grant execute on function public.upsert_cell(uuid, uuid, uuid, text) to authenticated;
revoke execute on function public.restore_cell_content(uuid, text) from anon;
grant execute on function public.restore_cell_content(uuid, text) to authenticated;

-- @core

-- ── THE BEHAVIOUR, PERFORMED ──────────────────────────────────────────────
--
-- Six claims, none of them readable off the definitions above:
--
--   1. the first call INSERTS and says so, and offers no previous — the half
--      whose inverse has always been a delete, and still is;
--   2. the second call on the same square UPDATES and says so, on the same
--      row — the half whose inverse was a delete and is now a restore;
--   3. the previous it hands back is the row BEFORE this write, not after:
--      checked on a call that overwrites the text, where a function returning
--      the row as it now stands would agree with the row and only disagree
--      here;
--   4. the undo, performed. Feeding that previous back through
--      `restore_cell_content` puts the text back, INCLUDING back to the empty
--      string — the case an inverse that coalesced could not express, and the
--      case a blank cell an agent writes onto actually is;
--   5. the undo carries one column and no more: a summary typed between the
--      two writes is still there afterwards. That is the deliberate scope of
--      `previous`, and the assertion is what keeps it deliberate;
--   6. a restore of a row that is gone says so rather than passing quietly.
--
-- And the cell is counted throughout, because the defect this file closes is
-- a cell that stops existing: one row before the undo, one row after.
--
-- The fixture is built and given back inside a sentinel-exception block: a
-- migration may prove a thing, and may not leave the rows it proved it with.
do $which_half$
declare
  svc uuid;
  phase uuid;
  scen uuid;
  pth uuid;
  stp uuid;
  lane_a uuid;
  first_write jsonb;
  second_write jsonb;
  cell uuid;
  rows_now integer;
  v_content text;
  v_summary text;
  done boolean := false;
  msg text;
begin
  -- Can this environment hold a service claim at all?
  --
  -- Everything below goes through `upsert_cell`, which refuses an account that
  -- is not the service account. On Supabase, and on a stock replay where the
  -- core's `is_service_account()` is `select true`, the claim set inside the
  -- fixture is enough. Behind a portable shim it may not be: a stand-in whose
  -- `auth.jwt()` returns an empty object unconditionally leaves no session
  -- able to be a service account, and the guarded RPC cannot be exercised.
  --
  -- Asked rather than assumed, and skipped rather than faked. A proof that
  -- reached past the guard to prove the statements underneath would be proving
  -- a copy of the function bodies instead of the functions.
  perform set_config(
    'request.jwt.claims', '{"app_metadata":{"role":"service"}}', true);
  if not public.is_service_account() then
    perform set_config('request.jwt.claims', '', true);
    raise notice
      'which-half proof skipped: this environment cannot hold a service claim, so the guarded write cannot run here';
    return;
  end if;
  perform set_config('request.jwt.claims', '', true);

  begin
    -- The claim the functions' first lines ask for. A GUC, not a role: this
    -- has to be true on a stock Postgres replay as well as on Supabase, and
    -- `set local` gives it back at the end of this block's transaction. There
    -- is no `set local role` here, because the core replays onto a stock
    -- Postgres where `authenticated` is not a role — the grants above are the
    -- recipe's, and the recipe is where a deployment proves them.
    perform set_config(
      'request.jwt.claims', '{"app_metadata":{"role":"service"}}', true);

    insert into public.services (name)
      values ('which-half cell fixture') returning id into svc;
    insert into public.phases (service_id, name, position)
      values (svc, 'fixture phase', 0) returning id into phase;
    insert into public.scenarios (phase_id, name, position)
      values (phase, 'fixture scenario', 0) returning id into scen;
    insert into public.paths (scenario_id, name, kind)
      values (scen, 'fixture path', 'happy') returning id into pth;
    insert into public.steps (scenario_id, name)
      values (scen, 'fixture step') returning id into stp;
    insert into public.lanes (path_id, name, position)
      values (pth, 'fixture lane', 0) returning id into lane_a;
    -- No `path_steps` row on purpose: linking the column to the path is the
    -- function's own first job, and the insert below is what exercises it.

    -- 1. THE INSERT HALF, on a blank draft — `form.content.trim()` on a cell
    -- the author has not typed into yet, which is the square the agent then
    -- lands on.
    first_write := public.upsert_cell(pth, lane_a, stp, '');
    if (first_write ->> 'inserted') is distinct from 'true' then
      raise exception 'the first call did not report an insert: %', first_write;
    end if;
    if first_write -> 'previous' <> 'null'::jsonb then
      raise exception 'the insert half reported a previous row: %', first_write;
    end if;
    cell := (first_write ->> 'id')::uuid;

    -- The author's separate edit, through the operation that owns that column
    -- and captures its own inverse. Nothing below may touch it.
    update public.cells set summary = 'what the author typed' where id = cell;

    -- 2. THE UPDATE HALF. The agent's `create_cell` on a square that is
    -- already occupied — which its occupancy read refuses today, and which
    -- two agent turns racing that read do not.
    second_write := public.upsert_cell(pth, lane_a, stp, 'what the agent wrote');
    if (second_write ->> 'inserted') is distinct from 'false' then
      raise exception 'the second call did not report an update: %', second_write;
    end if;
    if (second_write ->> 'id')::uuid <> cell then
      raise exception 'the second call wrote a different row (% then %)',
        cell, second_write ->> 'id';
    end if;
    select count(*) into rows_now from public.cells where lane_id = lane_a;
    if rows_now <> 1 then
      raise exception 'the second call left % cells, expected 1', rows_now;
    end if;

    -- 3. AND WHAT IT HANDED BACK IS THE ROW AS IT STOOD. The content is empty
    -- there and is not empty on the row now, which is the disagreement a
    -- function returning the row as it NOW stands could not produce.
    if (second_write -> 'previous' ->> 'id')::uuid <> cell then
      raise exception 'the previous row is not the row that was written: %', second_write;
    end if;
    if second_write -> 'previous' ->> 'content' is distinct from '' then
      raise exception 'the previous row carries text it never had: %', second_write;
    end if;
    select c.content into v_content from public.cells c where c.id = cell;
    if v_content is distinct from 'what the agent wrote' then
      raise exception 'the write did not land (content is now %)', coalesce(v_content, '<null>');
    end if;

    -- 4. THE UNDO, PERFORMED — as the ledger performs it, by feeding the
    -- previous row straight into the restore. Back to the empty string, which
    -- is the assignment a coalescing inverse cannot express.
    perform public.restore_cell_content(
      (second_write -> 'previous' ->> 'id')::uuid,
      second_write -> 'previous' ->> 'content');
    select c.content, c.summary into v_content, v_summary
      from public.cells c where c.id = cell;
    if v_content is distinct from '' then
      raise exception 'the undo left text behind (%)', coalesce(v_content, '<null>');
    end if;

    -- 5. AND IT CARRIED ONE COLUMN. The summary was typed between the two
    -- writes, by a different operation with a different inverse; an undo of
    -- the upsert that reached it would be reverting somebody else's edit.
    if v_summary is distinct from 'what the author typed' then
      raise exception 'the undo reached a column the write never touched (summary is now %)',
        coalesce(v_summary, '<null>');
    end if;

    -- THE WHOLE POINT. The cell the agent found is the cell the author still
    -- has. Under the derivation this file replaces, the undo above was a
    -- delete and this count was zero.
    select count(*) into rows_now from public.cells where lane_id = lane_a;
    if rows_now <> 1 then
      raise exception 'after the undo % cells remain, expected 1', rows_now;
    end if;

    -- 6. AND A RESTORE OF A ROW THAT IS GONE SAYS SO. A zero-row write is a
    -- failure here, not a quiet success, which is what lets the caller tell an
    -- undo that worked from one that matched nothing.
    begin
      perform public.restore_cell_content(gen_random_uuid(), 'never written');
      raise exception 'restoring a row that does not exist was accepted';
    exception when others then
      get stacked diagnostics msg = message_text;
      if msg <> 'That cell no longer exists' then raise; end if;
    end;

    perform set_config('request.jwt.claims', '', true);
    done := true;
    raise exception using errcode = 'P0001',
      message = 'which-half cell fixture rollback';
  exception when others then
    perform set_config('request.jwt.claims', '', true);
    get stacked diagnostics msg = message_text;
    if msg <> 'which-half cell fixture rollback' then raise; end if;
  end;

  if not done then
    raise exception 'the which-half cell cases never ran';
  end if;
  if exists (select 1 from public.services where name = 'which-half cell fixture') then
    raise exception 'the which-half cell fixture survived the rollback';
  end if;
end
$which_half$;
