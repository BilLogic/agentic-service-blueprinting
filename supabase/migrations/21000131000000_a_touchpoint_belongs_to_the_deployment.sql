-- A touchpoint belongs to the deployment, not to one of its services.
--
-- ADR 0003 decided this and landed only half of it. `stakeholders` was born
-- deployment-level in `21000125000000` — no `service_id`, `unique (name)`
-- across the whole deployment — while `touchpoints` kept the
-- `unique (service_id, name)` it was born with in `21000120000000`. That was
-- never a considered pair. The ADR's own consequences say so in as many
-- words: "`touchpoints` makes the same move in a later migration, dropping
-- its `service_id` and re-uniquing on `(name)`", and "that entry reverses in
-- the migration that drops the column, which is where the argument is
-- written". This is that migration, so the argument is written here.
--
-- ── Why the catalog is one pool ────────────────────────────────────────────
--
-- A deployment holds a journey per service and one catalog of the nouns those
-- journeys reference. The journey — phase, scenario, path, step, lane, cell —
-- is a hard per-service boundary; the catalog is soft, and both halves of it
-- are now the deployment's. Two rules give it its shape, and they are the same
-- two the cast list already runs on:
--
--   the NAME IS THE IDENTITY. One pool, unique by name across the deployment.
--   A second service reuses an entry by naming the same tool the same way. Two
--   services running different tools carry different names — "Gmail" and
--   "Outlook", never two rows both called "Email" — so an identical name means
--   the identical thing, and renaming that thing once moves it everywhere it
--   appears.
--
--   MEMBERSHIP IS IMPLICIT. A service "has" a touchpoint exactly when one of
--   its cells places it. There is no `service_touchpoints` table and no
--   palette to author, which is the only model coherent with how a touchpoint
--   is born: minted from a cell's text by the sync, with no "add a tool to
--   this service" gesture anywhere.
--
-- The incoherence the split leaves behind is worth naming, because it is what
-- makes this the straggler rather than a position. A touchpoint will carry a
-- `stakeholder_id` — its owner. With the tools per service and the actors the
-- deployment's, a shared tool's owner would have to be one service's actor,
-- and there is no answer to which. The link waits for both ends to be the
-- deployment's, and after this file they are.
--
-- ── The merge, and why the ADR's own rule makes it safe ─────────────────────
--
-- The deployment this template was generalised from could drop the column
-- outright: it holds one service, so `unique (service_id, name)` and
-- `unique (name)` were already the same constraint over its rows. A template
-- cannot assume that. An adopter may hold several services, each with its own
-- "Zoom" row, and re-uniquing on `(name)` would be refused.
--
-- So the drop is preceded by a fold, and the rule above is what licenses it:
-- an identical name means the identical thing, so two rows sharing a name are
-- one touchpoint recorded twice. Every placement is repointed at the survivor
-- — the oldest row of the name, by `created_at` then `id`, which is stable
-- across re-runs because neither value moves — the survivor takes whatever
-- description it was missing from the rows folding into it, and the rest are
-- deleted. Nothing a cell points at is lost, and nothing anybody wrote about
-- the tool is lost either. On the single-service database that is the common
-- case the fold matches zero rows and does nothing at all.
--
-- Two placements on one cell cannot be folded onto one survivor: a cell
-- belongs to one service, and within a service the names were already unique.
-- If that ever became untrue the repoint would be refused by
-- `cell_touchpoints_cell_id_touchpoint_id_key` rather than quietly dropping a
-- placement, which is the right way round for a fold nobody is watching.
--
-- ── The two functions that derived a service, and the three that never did ──
--
-- `sync_cell_touchpoints` read the cell's service to mint into and to join
-- back on; it stops reading it and mints by name alone. The cell must still
-- resolve all the way up to a phase — that is what attaches it to a service at
-- all — so the lookup stays and only its columns go.
-- `set_placement_touchpoint` checked a chosen registry id against the cell's
-- service; there is no service to scope by now, so it checks that the id is in
-- the registry.
--
-- Both are rewritten from `pg_get_functiondef` rather than restated, the way
-- `21000120000000` rewrote the two copy functions and `21000122000000`
-- rewrote this same sync. A restatement of a body that three migrations have
-- already edited is a chance to revert one of them by hand; a replacement of
-- the exact fragments that name `service_id` cannot. Each replacement is
-- asserted to have landed, and the finished body is swept for the word.
--
-- `restore_cell_touchpoints`, `remove_placement` and `restore_placement` never
-- named `service_id` and are left exactly as they are.
--
-- ── The grant surface does not move ────────────────────────────────────────
--
-- `create or replace function` preserves the ACL, so neither rewrite is
-- re-granted — the same stance `21000122000000` took when it rewrote this
-- sync. What replaces the re-statement is an assertion, in the recipe half
-- because that is where the roles exist: `authenticated` still executes both,
-- `anon` still does not.
--
-- On the table, `authenticated` held `update (name, kind, summary, url)` and
-- never held UPDATE on `service_id`, so the dropped column leaves no stale
-- column grant behind. The table-level SELECT and INSERT grants cover whatever
-- columns the table has, so they need no edit either.
--
-- ── Why the schema version does not move ───────────────────────────────────
--
-- The IR authors a touchpoint's name, kind, summary and home; which service
-- owns the row was never one of its fields, because an IR describes one
-- service. Nothing authored moves and no file needs carrying forward, so the
-- version stays where `21000122000000` left it — the same stance
-- `21000123000000`, `21000124000000` and `21000130000000` took.
--
-- What does move is the SQL the seed generator emits: it stops writing a
-- `service_id` column that is no longer there. A seed generated from this
-- checkout therefore needs a target that has applied this file, which is the
-- ordinary requirement that the migrations are applied before the artifacts
-- built from them.
--
-- ── Replaying against an empty database ────────────────────────────────────
--
-- A fold over zero rows, three catalogue changes, two function rewrites. The
-- proof is an INVARIANT: the column is gone, the deployment-wide unique is
-- there and no service-scoped one is, no placement points at a registry row
-- that is not there, neither function names `service_id`, and both are still
-- SECURITY DEFINER. Every clause reads the same on an empty replay as on a
-- populated target.

-- ---------------------------------------------------------------------------
-- 1. The fold: one row per name, and every placement pointing at it
-- ---------------------------------------------------------------------------

-- Every placement moves to the oldest row carrying its touchpoint's name.
update public.cell_touchpoints ct
   set touchpoint_id = keep.id,
       updated_at    = now()
  from public.touchpoints folding
  join (
    select distinct on (name) id, name
      from public.touchpoints
     order by name, created_at, id
  ) keep on keep.name = folding.name
 where ct.touchpoint_id = folding.id
   and folding.id <> keep.id;

-- The survivor takes what it was missing from the rows folding into it: the
-- first description written under that name, oldest first. `kind` is lifted
-- only out of the default, because 'other' is "nobody has judged this yet"
-- rather than a judgement to preserve.
update public.touchpoints keep
   set summary    = coalesce(keep.summary, folded.summary),
       url        = coalesce(keep.url, folded.url),
       icon_url   = coalesce(keep.icon_url, folded.icon_url),
       kind       = case when keep.kind = 'other'
                         then coalesce(folded.kind, keep.kind)
                         else keep.kind end,
       updated_at = now()
  from (
    select name,
           (array_agg(summary order by created_at, id)
              filter (where summary is not null))[1] as summary,
           (array_agg(url order by created_at, id)
              filter (where url is not null))[1] as url,
           (array_agg(icon_url order by created_at, id)
              filter (where icon_url is not null))[1] as icon_url,
           (array_agg(kind order by created_at, id)
              filter (where kind <> 'other'))[1] as kind
      from public.touchpoints
     group by name
  ) folded
 where folded.name = keep.name
   and exists (select 1 from public.touchpoints other
                where other.name = keep.name and other.id <> keep.id);

-- What is left is the duplicates, and nothing points at them any more.
delete from public.touchpoints folding
 using (
   select distinct on (name) id, name
     from public.touchpoints
    order by name, created_at, id
 ) keep
 where keep.name = folding.name
   and folding.id <> keep.id;

-- ---------------------------------------------------------------------------
-- 2. The column goes, and uniqueness becomes the deployment's
-- ---------------------------------------------------------------------------

alter table public.touchpoints drop constraint if exists touchpoints_service_id_name_key;
alter table public.touchpoints drop constraint if exists touchpoints_service_id_fkey;
alter table public.touchpoints drop column if exists service_id;
alter table public.touchpoints drop constraint if exists touchpoints_name_key;
alter table public.touchpoints add constraint touchpoints_name_key unique (name);

comment on table public.touchpoints is
  'The deployment''s registry of touchpoints — the apps, documents, channels '
  'and things a moment happens through. One row per name across the whole '
  'deployment; a service references an entry, no service owns one (ADR 0003). '
  'A placement in cell_touchpoints is one use of one at one cell.';
comment on column public.touchpoints.name is
  'The identity: unique across the deployment, so a second service reuses an '
  'entry by naming the same tool the same way rather than minting its own, and '
  'a rename moves the tool everywhere it appears.';
comment on column public.touchpoints.summary is
  'What this touchpoint IS, for the deployment — not what it does at any one cell.';
comment on constraint touchpoints_name_key on public.touchpoints is
  'One row per touchpoint name, deployment-wide. Distinct tools take distinct names; an identical name means the identical thing.';

-- ---------------------------------------------------------------------------
-- 3. The sync stops deriving a service, and mints by name
-- ---------------------------------------------------------------------------

do $rewrite$
declare
  before text;
  after  text;
begin
  before := pg_get_functiondef('public.sync_cell_touchpoints(uuid, text[])'::regprocedure);
  after  := before;

  -- The local the service was read into.
  after := replace(after,
    $r$  v_service_id uuid;
  v_lane_role  text;$r$,
    $r$  v_lane_role  text;$r$);

  -- The lookup keeps its joins — a cell that does not reach a phase is not
  -- attached to a service — and loses the column it selected.
  after := replace(after,
    $r$  select ph.service_id, ln.lane_role
    into v_service_id, v_lane_role$r$,
    $r$  select ln.lane_role
    into v_lane_role$r$);

  after := replace(after,
    $r$  if v_service_id is null then$r$,
    $r$  if not found then$r$);

  -- Minting is by name alone.
  after := replace(after,
    $r$  insert into public.touchpoints (service_id, name, origin)
  select v_service_id, w.name, 'app'$r$,
    $r$  insert into public.touchpoints (name, origin)
  select w.name, 'app'$r$);

  after := replace(after,
    $r$  on conflict (service_id, name) do nothing;$r$,
    $r$  on conflict (name) do nothing;$r$);

  -- Both joins back to the registry, which match on the name and nothing else.
  after := replace(after,
    $r$      on tp.service_id = v_service_id and tp.name = w.name$r$,
    $r$      on tp.name = w.name$r$);

  if after = before then
    raise exception 'sync_cell_touchpoints was not rewritten at all';
  end if;
  if after ~ 'service_id' then
    raise exception 'sync_cell_touchpoints still names service_id';
  end if;
  if after !~ 'on conflict \(name\) do nothing' then
    raise exception 'sync_cell_touchpoints does not mint by name';
  end if;
  if after !~ 'if not found then' then
    raise exception 'sync_cell_touchpoints lost its not-attached-to-a-service guard';
  end if;
  if after !~ 'frontstage_touchpoints' then
    raise exception 'sync_cell_touchpoints lost the lane roles 21000122000000 gave it';
  end if;

  execute after;
end
$rewrite$;

comment on function public.sync_cell_touchpoints(uuid, text[]) is
  'Brings a cell''s placements into line with its text. A new name mints a '
  'registry row for the deployment; a name typed back links the name-only row; '
  'a removed placement with anything on it becomes name-only, one with nothing '
  'is deleted. Returns what it removed, for restore_cell_touchpoints.';

-- ---------------------------------------------------------------------------
-- 4. Choosing a registry entry is no longer scoped by service
-- ---------------------------------------------------------------------------

do $rewrite$
declare
  before text;
  after  text;
begin
  before := pg_get_functiondef('public.set_placement_touchpoint(uuid, uuid, text)'::regprocedure);
  after  := before;

  after := replace(after,
    $r$  v_row public.cell_touchpoints;
  v_service_id uuid;$r$,
    $r$  v_row public.cell_touchpoints;$r$);

  after := replace(after,
    $r$    select ph.service_id into v_service_id
      from public.cells c
      join public.paths p on p.id = c.path_id
      join public.scenarios s on s.id = p.scenario_id
      join public.phases ph on ph.id = s.phase_id
     where c.id = v_row.cell_id;
    if not exists (select 1 from public.touchpoints tp
                    where tp.id = p_touchpoint_id and tp.service_id = v_service_id) then
      raise exception 'that touchpoint is not in this service''s registry';
    end if;$r$,
    $r$    -- The registry is the deployment's (ADR 0003), so an entry is in it
    -- or it is not; there is no service to scope the lookup by.
    if not exists (select 1 from public.touchpoints tp
                    where tp.id = p_touchpoint_id) then
      raise exception 'that touchpoint is not in the registry';
    end if;$r$);

  if after = before then
    raise exception 'set_placement_touchpoint was not rewritten at all';
  end if;
  if after ~ 'service_id' then
    raise exception 'set_placement_touchpoint still names service_id';
  end if;
  if after !~ 'that touchpoint is not in the registry' then
    raise exception 'set_placement_touchpoint lost its registry-membership check';
  end if;
  if after !~ 'that cell already shows that touchpoint' then
    raise exception 'set_placement_touchpoint lost its one-per-cell check';
  end if;

  execute after;
end
$rewrite$;

comment on function public.set_placement_touchpoint(uuid, uuid, text) is
  'Names a placement''s touchpoint one way — an entry in the deployment''s '
  'registry, or a name the registry lacks — and returns the previous pair, '
  'which is the inverse.';

-- ---------------------------------------------------------------------------
-- 5. Prove it — invariants, never censuses
-- ---------------------------------------------------------------------------

do $proof$
declare
  bad int;
  fn  text;
begin
  if exists (select 1 from information_schema.columns
              where table_schema = 'public'
                and table_name = 'touchpoints'
                and column_name = 'service_id') then
    raise exception 'touchpoints still carries service_id';
  end if;

  if not exists (select 1 from pg_constraint
                  where conrelid = 'public.touchpoints'::regclass
                    and contype = 'u'
                    and pg_get_constraintdef(oid) = 'UNIQUE (name)') then
    raise exception 'touchpoints has no deployment-wide unique (name)';
  end if;

  if exists (select 1 from pg_constraint
              where conrelid = 'public.touchpoints'::regclass
                and contype = 'u'
                and pg_get_constraintdef(oid) ~ 'service_id') then
    raise exception 'a service-scoped unique survives on the registry';
  end if;

  -- The fold repointed every placement before it deleted anything.
  select count(*) into bad
    from public.cell_touchpoints ct
   where ct.touchpoint_id is not null
     and not exists (select 1 from public.touchpoints tp where tp.id = ct.touchpoint_id);
  if bad <> 0 then
    raise exception '% placements point at a registry row that is not there', bad;
  end if;

  -- Still exactly one identity per placement, which the fold could have
  -- broken by repointing a row onto one its cell already showed.
  select count(*) into bad from public.cell_touchpoints
   where (touchpoint_id is null) = (name is null);
  if bad <> 0 then
    raise exception '% placements name their touchpoint both ways or neither', bad;
  end if;

  foreach fn in array array[
    'public.sync_cell_touchpoints(uuid, text[])',
    'public.set_placement_touchpoint(uuid, uuid, text)'
  ] loop
    if not (select prosecdef from pg_proc where oid = fn::regprocedure) then
      raise exception '% is not SECURITY DEFINER', fn;
    end if;
    if pg_get_functiondef(fn::regprocedure) ~ 'service_id' then
      raise exception '% still names service_id', fn;
    end if;
  end loop;
end
$proof$;

-- @recipe — the ACL the two rewrites had to preserve, asserted where the
-- roles exist. `create or replace` keeps a function's ACL, so nothing is
-- re-granted here; this is the check that the sentence is true.
do $posture$
declare
  fn text;
begin
  foreach fn in array array[
    'public.sync_cell_touchpoints(uuid, text[])',
    'public.set_placement_touchpoint(uuid, uuid, text)'
  ] loop
    if not has_function_privilege('authenticated', fn::regprocedure, 'execute') then
      raise exception 'authenticated lost execute on %', fn;
    end if;
    if has_function_privilege('anon', fn::regprocedure, 'execute') then
      raise exception 'anon gained execute on %', fn;
    end if;
  end loop;
end
$posture$;
-- @core
