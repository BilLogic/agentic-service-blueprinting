-- A resource keeps its id, knows its cell, and one of them is featured.
--
-- Three things `resources` could not say, and one it said wrong:
--
--   * A save churned every id. `sync_cell_resources` replaced a cell's list
--     by deleting the rows and inserting the list again, so a reorder — or
--     a save that changed nothing — gave every resource a fresh id. Nothing
--     minded while a resource was only a name and a url; the moment anything
--     hangs off a row (featuring it, below) a churned id is a lost reference.
--     Now the list is RECONCILED: a row that arrives with its id is updated
--     in place, a row without one is inserted, a row the list no longer
--     names is deleted. An id that is not one of this cell's rows is refused
--     rather than adopted.
--
--   * A placement's resource was invisible to the cell. `resources_one_owner`
--     said a row picks ONE of `cell_id` and `cell_touchpoint_id`, so every
--     reader that asks "what does this cell point at?" — the board embed, the
--     Resources tab — missed a placement's rows, which had no `cell_id`. A
--     placement is one touchpoint used at one cell, so what the placement
--     points at is what the cell points at, through that touchpoint. Every
--     resource carries its cell; a placement-owned one carries its placement
--     as well, and a COMPOSITE key `(cell_touchpoint_id, cell_id)` onto
--     `cell_touchpoints (id, cell_id)` holds the two to one row. MATCH
--     SIMPLE: a row with no placement is not checked against the placement
--     table at all.
--
--   * Nothing was featured. `featured` marks the resource its owner leads
--     with: one featured attachment per owner (the image a cell or a
--     placement shows), any number of featured links. A partial unique index
--     per owner shape is what makes "one" a rule rather than an intention.
--
--   * `kind` said `link | other`. `other` named nothing; an attachment is a
--     file the cell points at — a shipped image today, an object in Storage
--     once #113 lands — and it carries a url like a link does, so the
--     link-only url check becomes a check on every row.
--
-- The position rule moves with the ownership. `resources_cell_position_unique`
-- was `unique (cell_id, position)`, written when every row with a `cell_id`
-- was one of the cell's own list. Once a placement's rows carry the cell
-- too, a placement's position 0 collides with the cell's own position 0.
-- The rule was never about placement rows — their order is
-- `(cell_touchpoint_id, position)`, which stays — so the cell's rule is
-- re-issued as an EXCLUDE constraint over the same pair, restricted to the
-- cell's own rows, still DEFERRABLE: a unique index could carry the
-- predicate but not the deferral, and the deferral is what lets one
-- statement write a reorder without colliding with itself halfway through.
--
-- Four functions, all SECURITY DEFINER behind `is_service_account()`:
--
--   sync_cell_resources(p_cell_id, p_rows)       the cell's OWN list
--   sync_placement_resources(p_placement_id, p_rows)   one placement's list
--   set_featured_resource(p_resource_id, p_featured)
--   restore_featured_resources(p_rows)           the inverse of the last
--
-- The cell's list refuses a placement's ids — those are the touchpoint's to
-- write, and a cell list that quietly rewrote them would turn a featured
-- attachment into a link. Neither sync writes `kind` or `featured` on a kept
-- row: kind is decided when a row is made, and featuring is its own write.
-- Featuring an attachment clears the owner's previous featured attachment IN
-- THE SAME TRANSACTION, under the index that would otherwise refuse the
-- second, and returns the before-values of every row it touched — which is
-- the inverse, and what `restore_featured_resources` writes back with no
-- clearing rule.
--
-- A placement's `url` and `screenshots` columns are NOT read here. #111
-- copies them onto the placement as featured resources and drops them.
--
-- ── Replaying against an empty database ───────────────────────────────────
--
-- Every statement is a schema change or an UPDATE that touches zero rows on
-- an empty database. The proof asserts invariants — no row without a cell, a
-- placement's row in its cell, the constraints and indexes present, the
-- functions definer-guarded — vacuous on zero rows and real on a populated
-- instance.

-- @core

-- ---------------------------------------------------------------------------
-- The columns and the rules
-- ---------------------------------------------------------------------------

alter table public.resources
  add column featured boolean not null default false;

update public.resources r
   set cell_id = ct.cell_id
  from public.cell_touchpoints ct
 where r.cell_touchpoint_id = ct.id
   and r.cell_id is null;

alter table public.resources drop constraint resources_one_owner;
alter table public.resources alter column cell_id set not null;

alter table public.cell_touchpoints
  add constraint cell_touchpoints_id_cell_id_key unique (id, cell_id);

alter table public.resources drop constraint resources_cell_touchpoint_id_fkey;
alter table public.resources
  add constraint resources_placement_in_cell_fkey
  foreign key (cell_touchpoint_id, cell_id)
  references public.cell_touchpoints (id, cell_id)
  on delete cascade;

alter table public.resources drop constraint resources_cell_position_unique;
alter table public.resources
  add constraint resources_cell_position_unique
  exclude using btree (cell_id with =, position with =)
  where (cell_touchpoint_id is null)
  deferrable initially deferred;

update public.resources set kind = 'attachment' where kind = 'other';
alter table public.resources drop constraint resources_kind_check;
alter table public.resources
  add constraint resources_kind_check check (kind in ('link', 'attachment'));

alter table public.resources drop constraint resources_link_has_url;
alter table public.resources
  add constraint resources_has_url check (nullif(btrim(url), '') is not null);

create unique index resources_one_featured_attachment_per_placement
  on public.resources (cell_touchpoint_id)
  where featured and kind = 'attachment' and cell_touchpoint_id is not null;

create unique index resources_one_featured_attachment_per_cell
  on public.resources (cell_id)
  where featured and kind = 'attachment' and cell_touchpoint_id is null;

comment on table public.resources is
  'Things a cell points at. Every row carries its cell; a row a touchpoint '
  'placement owns carries the placement as well, and the composite key holds '
  'the two to one row. A link is one kind of resource and `kind` carries the '
  'subtype.';

comment on column public.resources.cell_id is
  'The cell this resource belongs to — always. A placement-owned resource '
  'carries its placement in cell_touchpoint_id as well.';

comment on column public.resources.cell_touchpoint_id is
  'The touchpoint placement this resource belongs to, when it is a '
  'placement''s: a link or the image a touchpoint shows at this cell. Still '
  'the cell''s row; edited from the touchpoint.';

comment on column public.resources.kind is
  'link = a place on the web; attachment = a file the cell points at, today '
  'a site-relative image path, after #113 an object in Storage. Both carry a '
  'url. Host and file type are read at render, never stored.';

comment on column public.resources.featured is
  'The resource its owner leads with. One featured attachment per placement '
  'or per cell (the image it shows); any number of featured links.';

-- ---------------------------------------------------------------------------
-- The cell's list writes the cell's own rows, and keeps their ids
-- ---------------------------------------------------------------------------

create or replace function public.sync_cell_resources(
  p_cell_id uuid,
  p_rows    jsonb
)
returns void
language plpgsql
security definer
set search_path = public, pg_catalog, pg_temp
as $function$
declare
  v_nameless  int;
  v_foreign   int;
  v_placement int;
begin
  if not public.is_service_account() then
    raise exception 'This account cannot edit the blueprint' using errcode = '42501';
  end if;
  if not exists (select 1 from public.cells c where c.id = p_cell_id) then
    raise exception 'cell % does not exist', p_cell_id;
  end if;

  -- Refused rather than defaulted. The editor already falls back to the
  -- url's host, so a nameless row reaching here means a caller skipped that,
  -- and inventing a name on its behalf hides the bug.
  select count(*) into v_nameless
  from jsonb_to_recordset(coalesce(p_rows, '[]'::jsonb))
    as r(id uuid, kind text, name text, url text)
  where nullif(btrim(coalesce(r.name, '')), '') is null;
  if v_nameless <> 0 then
    raise exception '% resource(s) arrived with no name', v_nameless;
  end if;

  -- An id has to be one of this cell's own rows.
  select count(*) into v_foreign
  from jsonb_to_recordset(coalesce(p_rows, '[]'::jsonb)) as r(id uuid)
  where r.id is not null
    and not exists (
      select 1 from public.resources x
       where x.id = r.id and x.cell_id = p_cell_id
    );
  if v_foreign <> 0 then
    raise exception '% resource id(s) are not rows of cell %', v_foreign, p_cell_id;
  end if;

  -- And not one of a placement's. Those are the cell's to READ, and the
  -- touchpoint's list to write; a cell list rewriting them would turn a
  -- featured attachment into a link.
  select count(*) into v_placement
  from jsonb_to_recordset(coalesce(p_rows, '[]'::jsonb)) as r(id uuid)
  join public.resources x on x.id = r.id
  where x.cell_touchpoint_id is not null;
  if v_placement <> 0 then
    raise exception '% resource(s) belong to a touchpoint placement and are edited from it', v_placement;
  end if;

  -- Rows the list no longer names — the cell's own only.
  delete from public.resources x
   where x.cell_id = p_cell_id
     and x.cell_touchpoint_id is null
     and x.id not in (
       select r.id
         from jsonb_to_recordset(coalesce(p_rows, '[]'::jsonb)) as r(id uuid)
        where r.id is not null
     );

  -- Kept rows, updated in place — position included, kind left alone.
  update public.resources x
     set name       = btrim(r.name),
         url        = nullif(btrim(coalesce(r.url, '')), ''),
         position   = r.ord::int,
         updated_at = now()
    from rows from (
           jsonb_to_recordset(coalesce(p_rows, '[]'::jsonb))
             as (id uuid, kind text, name text, url text)
         ) with ordinality as r(id, kind, name, url, ord)
   where x.id = r.id
     and x.cell_id = p_cell_id;

  -- New rows.
  insert into public.resources (cell_id, kind, name, url, position, origin)
  select p_cell_id,
         coalesce(nullif(btrim(coalesce(r.kind, '')), ''), 'link'),
         btrim(r.name),
         nullif(btrim(coalesce(r.url, '')), ''),
         r.ord::int,
         'app'
    from rows from (
           jsonb_to_recordset(coalesce(p_rows, '[]'::jsonb))
             as (id uuid, kind text, name text, url text)
         ) with ordinality as r(id, kind, name, url, ord)
   where r.id is null;
end
$function$;

comment on function public.sync_cell_resources(uuid, jsonb) is
  'The cell''s own list, reconciled in order: delete the rows not named, '
  'update the named ones in place (name, url, position — never kind or '
  'featured), insert the rest. Refuses another cell''s id and a placement''s.';

-- ---------------------------------------------------------------------------
-- One list edits everything a placement points at
-- ---------------------------------------------------------------------------

create or replace function public.sync_placement_resources(
  p_placement_id uuid,
  p_rows         jsonb
)
returns void
language plpgsql
security definer
set search_path = public, pg_catalog, pg_temp
as $function$
declare
  v_cell_id  uuid;
  v_nameless int;
  v_foreign  int;
begin
  if not public.is_service_account() then
    raise exception 'This account cannot edit the blueprint' using errcode = '42501';
  end if;

  select ct.cell_id into v_cell_id
    from public.cell_touchpoints ct
   where ct.id = p_placement_id;
  if v_cell_id is null then
    raise exception 'touchpoint placement % does not exist', p_placement_id;
  end if;

  select count(*) into v_nameless
  from jsonb_to_recordset(coalesce(p_rows, '[]'::jsonb))
    as r(id uuid, kind text, name text, url text)
  where nullif(btrim(coalesce(r.name, '')), '') is null
     or nullif(btrim(coalesce(r.url, '')), '') is null;
  if v_nameless <> 0 then
    raise exception '% resource(s) arrived with no name or no url', v_nameless;
  end if;

  -- An id has to be one of THIS placement's rows.
  select count(*) into v_foreign
  from jsonb_to_recordset(coalesce(p_rows, '[]'::jsonb)) as r(id uuid)
  where r.id is not null
    and not exists (
      select 1 from public.resources x
       where x.id = r.id and x.cell_touchpoint_id = p_placement_id
    );
  if v_foreign <> 0 then
    raise exception '% resource id(s) are not rows of placement %', v_foreign, p_placement_id;
  end if;

  delete from public.resources x
   where x.cell_touchpoint_id = p_placement_id
     and x.id not in (
       select r.id
         from jsonb_to_recordset(coalesce(p_rows, '[]'::jsonb)) as r(id uuid)
        where r.id is not null
     );

  -- Kept rows: name, url, position. Not kind, not featured.
  update public.resources x
     set name       = btrim(r.name),
         url        = btrim(r.url),
         position   = r.ord::int,
         updated_at = now()
    from rows from (
           jsonb_to_recordset(coalesce(p_rows, '[]'::jsonb))
             as (id uuid, kind text, name text, url text)
         ) with ordinality as r(id, kind, name, url, ord)
   where x.id = r.id
     and x.cell_touchpoint_id = p_placement_id;

  insert into public.resources
    (cell_id, cell_touchpoint_id, kind, name, url, position, origin)
  select v_cell_id, p_placement_id,
         coalesce(nullif(btrim(coalesce(r.kind, '')), ''), 'link'),
         btrim(r.name),
         btrim(r.url),
         r.ord::int,
         'app'
    from rows from (
           jsonb_to_recordset(coalesce(p_rows, '[]'::jsonb))
             as (id uuid, kind text, name text, url text)
         ) with ordinality as r(id, kind, name, url, ord)
   where r.id is null;
end
$function$;

create or replace function public.set_featured_resource(
  p_resource_id uuid,
  p_featured    boolean
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_catalog, pg_temp
as $function$
declare
  v_row      public.resources;
  v_previous jsonb;
begin
  if not public.is_service_account() then
    raise exception 'This account cannot edit the blueprint' using errcode = '42501';
  end if;

  select * into v_row from public.resources where id = p_resource_id for update;
  if v_row.id is null then
    raise exception 'resource % does not exist', p_resource_id;
  end if;

  -- What this call changes, as it was. The row itself, and — when a
  -- preview is being set — the previous preview of the same owner.
  select coalesce(jsonb_agg(jsonb_build_object('id', x.id, 'featured', x.featured)), '[]'::jsonb)
    into v_previous
    from public.resources x
   where x.id = p_resource_id
      or (p_featured and v_row.kind = 'attachment'
          and x.featured and x.kind = 'attachment' and x.id <> p_resource_id
          and x.cell_touchpoint_id is not distinct from v_row.cell_touchpoint_id
          and x.cell_id = v_row.cell_id);

  if p_featured and v_row.kind = 'attachment' then
    update public.resources x
       set featured = false, updated_at = now()
     where x.featured and x.kind = 'attachment' and x.id <> p_resource_id
       and x.cell_touchpoint_id is not distinct from v_row.cell_touchpoint_id
       and x.cell_id = v_row.cell_id;
  end if;

  update public.resources
     set featured = p_featured, updated_at = now()
   where id = p_resource_id;

  return jsonb_build_object('previous', v_previous);
end
$function$;

create or replace function public.restore_featured_resources(p_rows jsonb)
returns void
language plpgsql
security definer
set search_path = public, pg_catalog, pg_temp
as $function$
declare
  v_expected int;
begin
  if not public.is_service_account() then
    raise exception 'This account cannot edit the blueprint' using errcode = '42501';
  end if;

  select count(*) into v_expected
    from jsonb_to_recordset(coalesce(p_rows, '[]'::jsonb)) as r(id uuid, featured boolean);
  if v_expected = 0 then
    raise exception 'nothing to restore';
  end if;

  if (select count(*) from public.resources x
        join jsonb_to_recordset(p_rows) as r(id uuid, featured boolean) on r.id = x.id)
     <> v_expected then
    raise exception 'some of the % resources to restore no longer exist', v_expected;
  end if;

  -- Clears first, then sets. The partial unique index behind "one preview
  -- per owner" is checked row by row, not at commit, so restoring
  -- {old: true, new: false} in one statement can meet a moment where both
  -- are true and be refused — the capture, run backwards.
  update public.resources x
     set featured = false, updated_at = now()
    from jsonb_to_recordset(p_rows) as r(id uuid, featured boolean)
   where x.id = r.id and not r.featured;
  update public.resources x
     set featured = true, updated_at = now()
    from jsonb_to_recordset(p_rows) as r(id uuid, featured boolean)
   where x.id = r.id and r.featured;
end
$function$;

comment on function public.sync_placement_resources(uuid, jsonb) is
  'The touchpoint''s list at one cell, replaced in order: delete the rows not '
  'named, update the named ones (name, url, position — never kind or '
  'featured), insert the rest. Refuses another placement''s id and a '
  'placement that is gone.';
comment on function public.set_featured_resource(uuid, boolean) is
  'One row''s featured flag. Featuring an attachment clears the owner''s '
  'previous featured attachment in the same transaction and returns both '
  'before-states, which is the inverse.';
comment on function public.restore_featured_resources(jsonb) is
  'The inverse of set_featured_resource: each {id, featured} written back '
  'as captured, no clearing rule.';

-- @recipe — the Supabase roles. A fresh function is executable by PUBLIC,
-- and the cell's list was an invoker function until now.
revoke execute on function public.sync_cell_resources(uuid, jsonb) from public, anon;
grant execute on function public.sync_cell_resources(uuid, jsonb) to authenticated;
revoke execute on function public.sync_placement_resources(uuid, jsonb) from public, anon;
grant execute on function public.sync_placement_resources(uuid, jsonb) to authenticated;
revoke execute on function public.set_featured_resource(uuid, boolean) from public, anon;
grant execute on function public.set_featured_resource(uuid, boolean) to authenticated;
revoke execute on function public.restore_featured_resources(jsonb) from public, anon;
grant execute on function public.restore_featured_resources(jsonb) to authenticated;
-- @core

-- ---------------------------------------------------------------------------
-- The IR revision this shape is
-- ---------------------------------------------------------------------------

update public.schema_version
set version = '2026.09.05',
    applied_at = now();

do $version$
begin
  if not exists (select 1 from public.schema_version where version = '2026.09.05') then
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
  -- 1. NO RESOURCE IS WITHOUT A CELL, AND A PLACEMENT'S SITS IN ITS CELL.
  select count(*) into bad from public.resources where cell_id is null;
  if bad <> 0 then raise exception '% resources have no cell', bad; end if;
  select count(*) into bad
    from public.resources r
    join public.cell_touchpoints ct on ct.id = r.cell_touchpoint_id
   where ct.cell_id <> r.cell_id;
  if bad <> 0 then
    raise exception '% resources name a placement in another cell', bad;
  end if;
  if exists (select 1 from public.resources where kind not in ('link', 'attachment')) then
    raise exception 'a resource kept a retired kind';
  end if;

  -- 2. THE CONSTRAINTS AND INDEXES ARE THERE.
  if not exists (select 1 from pg_constraint
                  where conname = 'resources_placement_in_cell_fkey') then
    raise exception 'resources_placement_in_cell_fkey is missing';
  end if;
  if exists (select 1 from pg_constraint where conname = 'resources_one_owner') then
    raise exception 'resources_one_owner survived';
  end if;
  if (select count(*) from pg_indexes
       where tablename = 'resources'
         and indexname in ('resources_one_featured_attachment_per_placement',
                           'resources_one_featured_attachment_per_cell')) <> 2 then
    raise exception 'the featured-attachment indexes are missing';
  end if;
  if not exists (select 1 from pg_constraint
                  where conname = 'resources_cell_position_unique'
                    and contype = 'x' and condeferrable) then
    raise exception 'the cell position rule is not a deferrable exclusion over the cell''s own rows';
  end if;

  -- 3. THE FOUR WRITES ARE DEFINER-GUARDED. Which roles may call them is
  --    the recipe's business, proved under its own mark below.
  foreach fn in array array[
    'public.sync_cell_resources(uuid, jsonb)',
    'public.sync_placement_resources(uuid, jsonb)',
    'public.set_featured_resource(uuid, boolean)',
    'public.restore_featured_resources(jsonb)'
  ] loop
    if not (select prosecdef from pg_proc where oid = fn::regprocedure) then
      raise exception '% is not SECURITY DEFINER', fn;
    end if;
  end loop;
end
$proof$;

-- @recipe — the four writes are closed to the public role and open to the
-- signed-in one.
do $recipe_proof$
declare
  fn text;
begin
  foreach fn in array array[
    'public.sync_cell_resources(uuid, jsonb)',
    'public.sync_placement_resources(uuid, jsonb)',
    'public.set_featured_resource(uuid, boolean)',
    'public.restore_featured_resources(jsonb)'
  ] loop
    if has_function_privilege('anon', fn, 'execute') then
      raise exception 'anon can execute %', fn;
    end if;
    if not has_function_privilege('authenticated', fn, 'execute') then
      raise exception 'authenticated cannot execute %', fn;
    end if;
  end loop;
end
$recipe_proof$;
-- @core
