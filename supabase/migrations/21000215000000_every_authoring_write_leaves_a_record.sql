-- Every authoring write leaves a record, not only the deletes.
-- Authored 2026-09-10. The version is an allocation counter in the reserved
-- band, not the date — see scripts/check-migration-band.mjs.
--
-- CLOSE THE TAB AND THE RECORD OF WHAT CHANGED IS GONE.
--
-- Two recorders exist today and each covers half the story.
--
--   * DELETES are durable. Six `security definer` functions — delete_scenario,
--     delete_path, remove_step, remove_lane, remove_lanes, delete_cell — write
--     every row they are about to destroy into `public.deleted_structure` in
--     the same transaction as the cascade, and return that row's id.
--   * EVERY OTHER AUTHORING WRITE — renames, reorders, cell text, lane specs,
--     evidence, slices, findings, stakeholders — is recorded only in
--     `src/lib/authoringSession.ts`, a module-level JavaScript array. A page
--     refresh empties it.
--
-- So an agent that makes thirty edits and a human who makes thirty edits both
-- leave exactly nothing behind once the tab closes, while a single deleted
-- cell is remembered forever. That asymmetry is not a policy anyone chose; it
-- is what happens when the durable recorder is written as delete-safety rather
-- than as a record of authorship.
--
-- ONE LOG. `public.authoring_changes` records every authoring write. A delete
-- carries the rows it destroyed as its `payload`, exactly as the archive did,
-- so restore still has everything it ever had. `public.trash` is a VIEW over
-- the rows that carry a `deleted_kind`, so the recovery list is a filter on
-- one table rather than a second table that has to be kept in step with it.
-- `deleted_structure` is folded in and dropped rather than renamed: renaming
-- it would leave a table whose name says "deletions" holding renames.
--
-- ---------------------------------------------------------------------------
-- WHO WRITES A ROW, AND WHY THERE ARE TWO WRITERS RATHER THAN ONE
-- ---------------------------------------------------------------------------
--
-- The app appends through `record_authoring_change`, a definer RPC that takes
-- the operation, its arguments, its captured inverse and the author. It takes
-- NO payload and no `deleted_kind` — a client cannot forge a trash entry, and
-- cannot claim to have archived rows it never had.
--
-- The six delete functions append their own row, because the payload has to be
-- captured inside the same transaction as the cascade that destroys it. A
-- client-side append could only ever run afterwards, by which time the rows it
-- was supposed to preserve are gone. So the sweep below rewrites those six
-- bodies to insert into `authoring_changes` instead, naming themselves in the
-- `fn` column, and the client skips its own append for exactly those six
-- operations (`ARCHIVED_BY_THE_DATABASE` in `src/lib/authoringLog.ts`). One
-- write, one row, from whichever side is holding the rows.
--
-- ---------------------------------------------------------------------------
-- WHAT THIS DELIBERATELY DOES NOT DO
-- ---------------------------------------------------------------------------
--
-- IT IS AUDIT-ONLY. The in-memory stack stays exactly as it is and remains the
-- fast undo affordance; `revert` is stored so a row can SAY what would undo it,
-- not so anything replays it. Replaying an inverse against a database that has
-- moved on is a different problem — the row it names may have been deleted,
-- renamed or reparented since — and it is out of scope on purpose.
--
-- IT DOES NOT RECORD A REVERT AS A CHANGE OF ITS OWN. `executeRevert` passes
-- `record: false` so that undoing "Added a lane" does not append "Deleted a
-- lane" to the very list the row was just removed from, and that argument is
-- unchanged here. The consequence is stated rather than hidden: a revert whose
-- inverse is a delete DOES leave a row, because the delete function writes it
-- server-side; a revert whose inverse is an update leaves none. Making the two
-- agree means separating "not in the undo list" from "not in the log" at every
-- one of the twelve mutation modules that thread `record: false`, which is a
-- change to the undo contract and not to this one.
--
-- IT MISATTRIBUTES ONE CASE, AND SAYS SO. A row written server-side carries
-- `author = 'human'`, because the delete functions have no way to see the
-- client's agent attribution. That is right for every delete the app can make
-- — the agent holds no delete tool at all (`WRITE_TOOL_NAMES` in
-- `src/lib/agent/tools/specs.ts` has none) — and wrong for exactly one path:
-- the agent's `undo_last_change` reverting its own `create_lane`, which fires
-- `remove_lanes` and archives it as a human's delete. Fixing it means passing
-- attribution into six function signatures, which is a wider change than the
-- one defect justifies. It is recorded here so the next reader finds it
-- written down rather than by disbelieving a row.
--
-- NO ROW COUNT IS ASSERTED ANYWHERE BELOW. Every assertion in this file is an
-- invariant that is vacuously true on an empty database and meaningful on a
-- populated one. A migration replays against empty databases — every fresh
-- deployment of this template is one — so a migration that asserts "36 rows
-- moved" fails every empty replay for the rest of time. The one count that IS
-- compared is compared to itself: every archived deletion found is an archived
-- deletion carried forward, which is 0 = 0 on an empty database and n = n on a
-- deployment that has been authored in.
--
-- ---------------------------------------------------------------------------
-- The log.
-- ---------------------------------------------------------------------------
create table if not exists public.authoring_changes (
  id uuid primary key default gen_random_uuid(),
  at timestamptz not null default now(),

  -- WHO. `author` is the tier, `author_id` is the account, `agent_session_id`
  -- is the agent conversation the write belongs to. Deliberately NOT a foreign
  -- key to `agent_sessions`: an audit row has to outlive the session it names,
  -- and the analysis tier already names cells softly for the same reason.
  author text not null default 'human'
    constraint authoring_changes_author_check check (author in ('human', 'agent')),
  author_id uuid,
  agent_session_id uuid,

  -- WHAT. `fn` is the operation — an authoring RPC name, or one of the
  -- direct-table mutation names the client logs under (`update_cell_content`,
  -- `update_cell_spec`, `update_cell_resources`). `args` is what was sent, ids
  -- and not names, because a name is a thing that changes. `revert` is the
  -- inverse captured at write time where one exists, in the shape
  -- `RevertSpec` — `{fn, args}`.
  fn text not null
    constraint authoring_changes_fn_check check (btrim(fn) <> ''),
  args jsonb not null default '{}'::jsonb
    constraint authoring_changes_args_check check (jsonb_typeof(args) = 'object'),
  revert jsonb
    constraint authoring_changes_revert_check
      check (revert is null or jsonb_typeof(revert) = 'object'),

  -- WHAT A DELETE DESTROYED. Null on every other operation. `payload` is every
  -- deleted row, natural-keyed and in dependency order, so a restore can replay
  -- it through the ordinary create path; `affected_slices` is
  -- [{slice_id, title, cell_keys:[…]}].
  deleted_kind text
    constraint authoring_changes_deleted_kind_check
      check (deleted_kind in ('scenario', 'path', 'lane', 'step', 'cell')),
  label text,
  payload jsonb,
  affected_slices jsonb not null default '[]'::jsonb
    constraint authoring_changes_affected_slices_check
      check (jsonb_typeof(affected_slices) = 'array'),

  -- An agent session names an agent's write and nothing else, in both
  -- directions. Stated as a biconditional rather than an implication because
  -- `author = 'agent'` with no session is the shape that loses the grouping
  -- the change sheet renders, and it would pass a one-way check silently.
  constraint authoring_changes_agent_session_check
    check ((author = 'agent') = (agent_session_id is not null)),

  -- A deletion carries its rows or it is not a deletion. This is the whole of
  -- "deleted rows are restorable from the log", stated where it cannot drift:
  -- a delete recorded without a payload would look identical to a delete
  -- recorded with one until someone tried to restore it.
  constraint authoring_changes_payload_check
    check ((deleted_kind is null) = (payload is null))
);

comment on table public.authoring_changes is
  'Append-only record of every authoring write. Audit-only: the in-memory stack in src/lib/authoringSession.ts is still the undo affordance, and nothing replays `revert` from here. A row with `deleted_kind` set is a deletion and carries the rows it destroyed; `public.trash` is the view over exactly those.';
comment on column public.authoring_changes.fn is
  'The operation: an authoring RPC name, or one of the direct-table mutation names the client logs under. Matches the WriteFn union in src/lib/authoringSession.ts.';
comment on column public.authoring_changes.args is
  'Exactly what was sent. Ids, not names — a name is resolved at render because a name is a thing that changes.';
comment on column public.authoring_changes.revert is
  'The captured inverse, {fn, args}, where one exists. Recorded so a row can say what would undo it. Nothing replays it — see the header.';
comment on column public.authoring_changes.agent_session_id is
  'The agent conversation this write belongs to. No foreign key on purpose: the record has to outlive the session it names.';

create index if not exists authoring_changes_at_idx
  on public.authoring_changes (at desc);
-- The trash view's only access path. Partial, because deletions are the small
-- minority of a log that records every rename and every cell edit.
create index if not exists authoring_changes_deleted_kind_idx
  on public.authoring_changes (deleted_kind, at desc)
  where deleted_kind is not null;
create index if not exists authoring_changes_agent_session_idx
  on public.authoring_changes (agent_session_id)
  where agent_session_id is not null;

-- ---------------------------------------------------------------------------
-- Append-only, enforced rather than promised.
--
-- The grants below already withhold UPDATE and DELETE from every client role,
-- so this trigger is not what stops a browser. It is what stops the definer
-- functions, the service key and a future migration — every writer that is
-- inside the gate the grants describe. A log that the writers can rewrite is
-- a log that says whatever the last writer wanted it to say.
-- ---------------------------------------------------------------------------
create or replace function public.authoring_changes_are_append_only()
returns trigger
language plpgsql
set search_path = public, pg_catalog, pg_temp
as $$
begin
  raise exception 'public.authoring_changes is append-only; % is not permitted on it', tg_op
    using errcode = '42501';
end;
$$;

drop trigger if exists authoring_changes_no_rewrite on public.authoring_changes;
create trigger authoring_changes_no_rewrite
  before update or delete on public.authoring_changes
  for each row execute function public.authoring_changes_are_append_only();

drop trigger if exists authoring_changes_no_truncate on public.authoring_changes;
create trigger authoring_changes_no_truncate
  before truncate on public.authoring_changes
  for each statement execute function public.authoring_changes_are_append_only();

-- @recipe — the caller stamp, row-level security and the role grants. The log
-- itself is plain Postgres; who may read it is the host's enforcement.
alter table public.authoring_changes alter column author_id set default auth.uid();

alter table public.authoring_changes enable row level security;

-- Readable by anyone who can read the blueprint — the change list and the
-- recovery list are both part of the editor. Written only through the
-- functions below, all of which are definer.
drop policy if exists "authoring_changes_select" on public.authoring_changes;
create policy "authoring_changes_select" on public.authoring_changes
  for select using (true);

grant select on public.authoring_changes to anon, authenticated;
revoke insert, update, delete, truncate on public.authoring_changes
  from anon, authenticated;
-- @core

-- ---------------------------------------------------------------------------
-- The client's append.
--
-- Takes the operation, its arguments, its inverse and the author — and nothing
-- else. No payload parameter and no `deleted_kind` parameter, so the one thing
-- a caller here cannot do is claim to have deleted something: a trash entry
-- can only be written by the function that is holding the rows.
-- ---------------------------------------------------------------------------
create or replace function public.record_authoring_change(
  fn text,
  args jsonb default '{}'::jsonb,
  revert jsonb default null,
  author text default 'human',
  agent_session_id uuid default null
)
returns uuid
language plpgsql security definer
set search_path = public, pg_catalog, pg_temp
as $$
declare
  change_id uuid;
begin
  -- The same service-account gate every other write function carries. The
  -- append runs after the write it records, so anyone who got here already
  -- passed it once; carrying it means the log's write surface cannot be
  -- wider than the surface it describes.
  if not public.is_service_account() then
    raise exception 'This account cannot edit the blueprint'
      using errcode = '42501';
  end if;

  if record_authoring_change.fn is null
     or btrim(record_authoring_change.fn) = '' then
    raise exception 'A recorded change has to name the operation that made it';
  end if;

  insert into public.authoring_changes (fn, args, revert, author, agent_session_id)
  values (
    record_authoring_change.fn,
    coalesce(record_authoring_change.args, '{}'::jsonb),
    record_authoring_change.revert,
    coalesce(record_authoring_change.author, 'human'),
    record_authoring_change.agent_session_id
  )
  returning id into change_id;

  return change_id;
end;
$$;

comment on function public.record_authoring_change(text, jsonb, jsonb, text, uuid) is
  'Append one authoring write to public.authoring_changes. Called by src/lib/authoringLog.ts after the write it records has already succeeded, so the log can never claim a change the database does not have.';

-- @recipe — Postgres grants EXECUTE to PUBLIC at CREATE time, so the revoke is
-- the operative statement of the pair and the grant names the one role meant
-- to hold it. A deployment that serves the board to readers stays read-only.
revoke execute on function
  public.record_authoring_change(text, jsonb, jsonb, text, uuid) from public, anon;
grant execute on function
  public.record_authoring_change(text, jsonb, jsonb, text, uuid) to authenticated;
-- @core

-- ---------------------------------------------------------------------------
-- The six delete functions, redirected.
--
-- A `pg_get_functiondef` sweep rather than six rewritten bodies. The file is
-- not the apply path: a deployment's installed body is whatever the last
-- migration to touch it left there, and several of those were themselves
-- sweeps over renamed relations. Reproducing the bodies here would pick one
-- schema and break every deployment that is on the other. Rewriting the text
-- that is actually installed picks neither.
--
-- The insert is textually identical in all six, which is what makes this
-- safe to do by replacement:
--
--   insert into public.deleted_structure (kind, label, payload, affected_slices)
--   values ('<kind>', …)
--
-- becomes
--
--   insert into public.authoring_changes (fn, deleted_kind, label, payload, affected_slices)
--   values ('<function name>', '<kind>', …)
--
-- so each function names itself in the `fn` column. `create or replace` with
-- the definition Postgres itself printed keeps the argument types, and
-- therefore keeps the ACL — a replace that changed the signature would create
-- a second overload with default privileges instead.
--
-- The set is discovered, not listed. A seventh function that archives the
-- same way is swept too, and — because the sweep raises on a shape it does
-- not recognise — a function that references the archive some other way stops
-- the migration instead of being quietly left pointing at a dropped table.
-- ---------------------------------------------------------------------------
do $sweep$
declare
  targets oid[];
  target oid;
  fn_name text;
  fn_def text;
  fn_rewritten text;
begin
  select coalesce(array_agg(p.oid order by p.proname), array[]::oid[])
  into targets
  from pg_proc p
  join pg_namespace n on n.oid = p.pronamespace
  where n.nspname = 'public'
    and p.prosrc like '%public.deleted_structure%';

  foreach target in array targets loop
    select p.proname, pg_get_functiondef(p.oid) into fn_name, fn_def
    from pg_proc p where p.oid = target;

    fn_rewritten := replace(
      fn_def,
      'insert into public.deleted_structure (kind, label, payload, affected_slices)',
      'insert into public.authoring_changes (fn, deleted_kind, label, payload, affected_slices)'
    );
    if fn_rewritten = fn_def then
      raise exception
        'public.% reaches the deletion archive in a shape this sweep does not know', fn_name;
    end if;

    fn_rewritten := regexp_replace(
      fn_rewritten,
      '(insert into public\.authoring_changes \(fn, deleted_kind, label, payload, affected_slices\)\s*values \()',
      '\1' || quote_literal(fn_name) || ', ',
      'g'
    );

    execute fn_rewritten;
  end loop;
end
$sweep$;

-- ---------------------------------------------------------------------------
-- Carry the archived deletions forward, then drop the table they were in.
--
-- `author = 'human'` on every one of them: no attribution was ever recorded
-- for a delete, and the agent has never held a delete tool, so "a person did
-- this" is the true answer rather than the convenient one.
--
-- `args` is `{}` and not a reconstruction. The archive stored the payload and
-- the label and never the call, and inventing plausible arguments for historic
-- deletes would put rows in the log that read exactly like recorded ones and
-- are not.
-- ---------------------------------------------------------------------------
do $carry$
declare
  found int;
  moved int;
begin
  if to_regclass('public.deleted_structure') is null then
    raise notice 'public.deleted_structure is absent — there is nothing to carry forward.';
    return;
  end if;

  select count(*) into found from public.deleted_structure;

  insert into public.authoring_changes
    (at, author, author_id, fn, args, deleted_kind, label, payload, affected_slices)
  select
    d.deleted_at,
    'human',
    d.deleted_by,
    case d.kind
      when 'scenario' then 'delete_scenario'
      when 'path' then 'delete_path'
      when 'step' then 'remove_step'
      when 'lane' then 'remove_lane'
      when 'cell' then 'delete_cell'
    end,
    '{}'::jsonb,
    d.kind,
    d.label,
    d.payload,
    coalesce(d.affected_slices, '[]'::jsonb)
  from public.deleted_structure d;

  get diagnostics moved = row_count;

  -- Compared to itself, so it holds at 0 = 0 on an empty database and at
  -- whatever a deployment carries on that deployment. A literal here would be
  -- a census, and a census fails every empty replay forever.
  if moved <> found then
    raise exception 'carried % of % archived deletions forward', moved, found;
  end if;
end
$carry$;

drop table if exists public.deleted_structure;

-- ---------------------------------------------------------------------------
-- Trash: a filter, not a table.
--
-- The column names are the ones `deleted_structure` used, so every reader of
-- the recovery list is unchanged by this migration except for the relation it
-- names. `security_invoker` because a view created without it reads its base
-- table as the view's OWNER and bypasses that table's row-level security.
-- ---------------------------------------------------------------------------
create or replace view public.trash
  with (security_invoker = true)
as
select
  c.id,
  c.at as deleted_at,
  c.author_id as deleted_by,
  c.deleted_kind as kind,
  c.label,
  c.payload,
  c.affected_slices
from public.authoring_changes c
where c.deleted_kind is not null;

comment on view public.trash is
  'The deletions in public.authoring_changes, in the shape the retired deleted_structure table had. A filter over the one log, so the recovery list cannot drift from the record of what happened.';

-- @recipe — who may read the recovery list.
grant select on public.trash to anon, authenticated;
-- @core

-- ---------------------------------------------------------------------------
-- Post-conditions. Every one of them holds on an empty database.
-- ---------------------------------------------------------------------------
do $assert$
declare
  stale text;
  unnamed text;
  bad int;
begin
  -- 1. THE LOG EXISTS AND IS A TABLE.
  if to_regclass('public.authoring_changes') is null then
    raise exception 'public.authoring_changes was not created';
  end if;

  -- 2. THE ARCHIVE IS GONE. Stated separately from the carry-forward above: a
  -- schema holding both would satisfy every other assertion here while leaving
  -- the next author to guess which of the two a deletion is in.
  if to_regclass('public.deleted_structure') is not null then
    raise exception 'public.deleted_structure still exists beside the log that replaced it';
  end if;

  -- 3. TRASH IS A VIEW OVER THE LOG, not a table someone recreated.
  if not exists (
    select 1 from information_schema.views
    where table_schema = 'public' and table_name = 'trash'
  ) then
    raise exception 'public.trash is not a view';
  end if;

  -- 4. NOTHING STILL POINTS AT THE DROPPED TABLE. A plpgsql body is text
  -- resolved at call time, so a function left naming `deleted_structure` is
  -- deployable and broken until someone deletes a cell.
  select string_agg(p.proname, ', ' order by p.proname) into stale
  from pg_proc p
  join pg_namespace n on n.oid = p.pronamespace
  where n.nspname = 'public' and p.prosrc like '%deleted_structure%';
  if stale is not null then
    raise exception 'these functions still name deleted_structure: %', stale;
  end if;

  -- 5. EVERY ARCHIVING FUNCTION NAMES ITSELF IN `fn`. The sweep injects the
  -- function's own name as the first value; this is what proves it landed,
  -- rather than that the relation name changed and the column list did not.
  -- Vacuously true where no function archives.
  select string_agg(p.proname, ', ' order by p.proname) into unnamed
  from pg_proc p
  join pg_namespace n on n.oid = p.pronamespace
  where n.nspname = 'public'
    and p.prosrc like '%insert into public.authoring_changes (fn, deleted_kind,%'
    and p.prosrc not like '%values (' || quote_literal(p.proname::text) || ',%';
  if unnamed is not null then
    raise exception 'these functions archive without naming themselves: %', unnamed;
  end if;

  -- 6. THE APPEND-ONLY TRIGGERS ARE INSTALLED. Two of them: rewriting a row
  -- and truncating the table are different statements and one trigger cannot
  -- refuse both.
  select count(*) into bad
  from pg_trigger t
  where t.tgrelid = 'public.authoring_changes'::regclass
    and not t.tgisinternal;
  if bad <> 2 then
    raise exception 'public.authoring_changes carries % append-only triggers, expected 2', bad;
  end if;

  -- 7. THE CLIENT'S APPEND IS SECURITY DEFINER. Without it the insert fails
  -- behind the revoked grant, on the one path that has to work. The other
  -- half of this — that anon cannot reach it — is the host's to enforce and
  -- is asserted in the recipe below.
  if not exists (
    select 1 from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.proname = 'record_authoring_change'
      and p.prosecdef
  ) then
    raise exception 'public.record_authoring_change is missing or is not security definer';
  end if;

  -- 8. NO ROW CONTRADICTS THE TWO INVARIANTS THE CHECKS ENCODE. The
  -- constraints already refuse these, so this asserts the constraints are
  -- present and armed rather than trusting that they are. Zero rows pass it;
  -- so does a populated table.
  select count(*) into bad
  from public.authoring_changes
  where (deleted_kind is null) <> (payload is null)
     or (author = 'agent') <> (agent_session_id is not null);
  if bad <> 0 then
    raise exception '% rows break the payload or attribution invariant', bad;
  end if;
end
$assert$;

-- @recipe — the two post-conditions that are about roles, and therefore about
-- the host rather than about the log.
do $posture$
declare
  bad int;
begin
  -- THE CLIENT'S APPEND IS NOT REACHABLE BY anon. Reachable by anon it is a
  -- write surface on a read-only deployment.
  if has_function_privilege(
       'anon',
       'public.record_authoring_change(text, jsonb, jsonb, text, uuid)',
       'execute') then
    raise exception 'anon can execute record_authoring_change';
  end if;

  -- anon AND authenticated HOLD NO DIRECT WRITE ON THE LOG. Asserting it here
  -- means the migration that introduces the table cannot be the one that
  -- breaks the posture.
  select count(*) into bad
  from information_schema.role_table_grants
  where table_schema = 'public'
    and table_name = 'authoring_changes'
    and grantee in ('anon', 'authenticated')
    and privilege_type in ('INSERT', 'UPDATE', 'DELETE', 'TRUNCATE');
  if bad <> 0 then
    raise exception '% direct write grants survive on public.authoring_changes', bad;
  end if;
end
$posture$;
-- @core
