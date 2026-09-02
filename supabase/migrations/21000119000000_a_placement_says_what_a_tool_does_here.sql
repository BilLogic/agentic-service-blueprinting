-- A placement says what a tool does here, and nothing else.
--
-- `cell_touchpoints` carried three things about one touchpoint at one cell:
-- its words (`summary`) and two URL columns — `screenshots[]` and `url` —
-- that say what the placement POINTS AT. 21000118000000 gave `resources`
-- everything a pointer needs: a placement owner, a kind (`attachment` for an
-- image, `link` for a place on the web) and a `featured` flag for the one
-- the owner leads with. Two homes for one fact is one too many: the panel
-- read the column, the Resources tab read the row, and a screenshot added
-- one way was invisible the other.
--
-- So a placement becomes summary + role, and everything it points at is a
-- resource on it:
--
--   * `role` — `core | peripheral | null`. Whether the moment happens
--     THROUGH this touchpoint or the touchpoint is merely present at it. It
--     sits on the placement and not on the touchpoint: a poster is core at
--     recruitment and incidental three phases later. Null is the common
--     state — nobody has judged this placement — and renders nothing.
--   * `url` — copied onto the placement as a featured link, idempotently:
--     a url the placement already has as a resource is not copied twice.
--   * `screenshots[i]` — each copied as an attachment on the placement in
--     author order; the first becomes the featured one unless the placement
--     already leads with an attachment.
--   * then the two columns go. Postgres drops their column grants with them.
--
-- The two copy functions (`duplicate_path`, `duplicate_scenario`) named the
-- columns in their placement INSERT, and their placement-resource INSERT
-- predates 21000118000000's `cell_id NOT NULL`, so it would have failed the
-- first time a copied placement carried a resource. Both are rewritten
-- from their current definitions — the column lists and one reference — so
-- a copy carries role, featured and the placement's cell.
--
-- The one reference: `duplicate_path` has raised "column reference
-- scenario_id is ambiguous" on every call since 21000107000000 renamed
-- `paths.service_scenario_id` to `scenario_id`, the name of the function's
-- own local. Found by calling it on the replayed core while proving this
-- file; the local is renamed `v_scenario_id`, out of the column's way.
--
-- ── Replaying against an empty database ───────────────────────────────────
--
-- Every statement is a schema change, an idempotent copy over whatever rows
-- exist, or a function rewrite. The proof before the drop is an INVARIANT —
-- every url and screenshot a placement still holds is carried by a resource
-- on it — vacuous on zero placements; the proof at the foot asserts the
-- columns are gone and no function in `public` still reads them.

-- @core

-- ---------------------------------------------------------------------------
-- 1. The role
-- ---------------------------------------------------------------------------

alter table public.cell_touchpoints
  add column role text
  constraint cell_touchpoints_role_check check (role in ('core', 'peripheral'));

comment on column public.cell_touchpoints.role is
  'core = the moment happens through this touchpoint; peripheral = present '
  'at it but not what it turns on. Null = nobody has judged this placement, '
  'which is the common state and renders nothing.';

-- ---------------------------------------------------------------------------
-- 2. Copy what the two columns hold onto the placement, as resources
-- ---------------------------------------------------------------------------

insert into public.resources
  (cell_id, cell_touchpoint_id, kind, name, url, position, featured, origin)
select ct.cell_id, ct.id, 'link', ct.name, btrim(ct.url),
       coalesce((select max(r.position) + 1 from public.resources r
                  where r.cell_touchpoint_id = ct.id), 0),
       not exists (
         select 1 from public.resources f
          where f.cell_touchpoint_id = ct.id and f.kind = 'link' and f.featured
       ),
       'import'
  from public.cell_touchpoints ct
 where nullif(btrim(ct.url), '') is not null
   and not exists (
     select 1 from public.resources r
      where r.cell_touchpoint_id = ct.id and r.url = btrim(ct.url)
   );

insert into public.resources
  (cell_id, cell_touchpoint_id, kind, name, url, position, featured, origin)
select ct.cell_id, ct.id, 'attachment', ct.name, btrim(shot.url),
       coalesce((select max(r.position) + 1 from public.resources r
                  where r.cell_touchpoint_id = ct.id), 0) + shot.ord - 1,
       shot.ord = 1 and not exists (
         select 1 from public.resources f
          where f.cell_touchpoint_id = ct.id and f.kind = 'attachment' and f.featured
       ),
       'import'
  from public.cell_touchpoints ct
  cross join lateral unnest(ct.screenshots) with ordinality as shot(url, ord)
 where nullif(btrim(shot.url), '') is not null
   and not exists (
     select 1 from public.resources r
      where r.cell_touchpoint_id = ct.id and r.url = btrim(shot.url)
   );

do $proof$
declare
  missing int;
begin
  select count(*) into missing
    from public.cell_touchpoints ct
   where (nullif(btrim(ct.url), '') is not null
          and not exists (select 1 from public.resources r
                           where r.cell_touchpoint_id = ct.id and r.url = btrim(ct.url)))
      or exists (select 1 from unnest(ct.screenshots) as shot(url)
                  where nullif(btrim(shot.url), '') is not null
                    and not exists (select 1 from public.resources r
                                     where r.cell_touchpoint_id = ct.id and r.url = btrim(shot.url)));
  if missing <> 0 then
    raise exception '% placements still hold a url or screenshot no resource carries', missing;
  end if;
end
$proof$;

-- ---------------------------------------------------------------------------
-- 3. The copy functions carry role, featured and the placement's cell
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

    -- The local that shares a column's name since 21000107000000.
    if target.proname = 'duplicate_path' then
      after := replace(after, '  scenario_id uuid;', '  v_scenario_id uuid;');
      after := replace(after, 'into scenario_id', 'into v_scenario_id');
      after := replace(after, 'if scenario_id is null', 'if v_scenario_id is null');
      after := replace(after,
        'select scenario_id, duplicate_path.name, duplicate_path.kind,',
        'select v_scenario_id, duplicate_path.name, duplicate_path.kind,');
      if after !~ 'v_scenario_id uuid;' or after ~ '\mselect scenario_id,' then
        raise exception 'duplicate_path still names its local ambiguously';
      end if;
    end if;

    -- The placement copy: role in place of the two URL columns.
    after := replace(after,
      '(cell_id, name, position, summary, screenshots, url, origin)',
      '(cell_id, name, position, summary, role, origin)');
    after := replace(after,
      'ct.summary, ct.screenshots, ct.url, ''app''',
      'ct.summary, ct.role, ''app''');

    -- The cell's own resources: its own only, featured carried.
    after := regexp_replace(after,
      '\(cell_id, kind, name, url, position, origin\)(\s+)select nc\.id, r\.kind, r\.name, r\.url, r\.position, ''app''(\s+)from public\.resources r(\s+)join public\.cells c on c\.id = r\.cell_id',
      '(cell_id, kind, name, url, position, featured, origin)\1select nc.id, r.kind, r.name, r.url, r.position, r.featured, ''app''\2from public.resources r\3join public.cells c on c.id = r.cell_id and r.cell_touchpoint_id is null');

    -- The placement's resources: the copied cell, the copied placement, featured.
    after := regexp_replace(after,
      '\(cell_touchpoint_id, kind, name, url, position, origin\)(\s+)select nct\.id, r\.kind, r\.name, r\.url, r\.position, ''app''',
      '(cell_id, cell_touchpoint_id, kind, name, url, position, featured, origin)\1select nc.id, nct.id, r.kind, r.name, r.url, r.position, r.featured, ''app''');

    if after ~ 'screenshots' or after !~ 'ct\.role' then
      raise exception '% still copies the two URL columns', target.proname;
    end if;
    if (select count(*) from regexp_matches(after, 'r\.featured', 'g')) <> 2 then
      raise exception '% does not carry featured on both resource copies', target.proname;
    end if;
    if after !~ 'r\.cell_touchpoint_id is null' or after !~ 'select nc\.id, nct\.id' then
      raise exception '% does not separate the cell''s own resources from a placement''s', target.proname;
    end if;

    execute after;
    rewritten := rewritten + 1;
  end loop;

  if rewritten <> 2 then
    raise exception 'expected to rewrite duplicate_path and duplicate_scenario, rewrote %', rewritten;
  end if;
end
$rewrite$;

-- ---------------------------------------------------------------------------
-- 4. The columns
-- ---------------------------------------------------------------------------

alter table public.cell_touchpoints
  drop column screenshots,
  drop column url;

comment on table public.cell_touchpoints is
  'One touchpoint used at one cell: its own summary and role at this moment. '
  'What it points at is in resources (cell_touchpoint_id).';

-- @recipe — the panel's column-scoped edit gains the new column; the two
-- dropped ones took their grants with them.
grant update (role) on public.cell_touchpoints to authenticated;
-- @core

-- ---------------------------------------------------------------------------
-- The IR revision this shape is
-- ---------------------------------------------------------------------------

update public.schema_version
set version = '2026.09.06',
    applied_at = now();

do $version$
begin
  if not exists (select 1 from public.schema_version where version = '2026.09.06') then
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
  def text;
begin
  if exists (
    select 1 from information_schema.columns
     where table_schema = 'public' and table_name = 'cell_touchpoints'
       and column_name in ('screenshots', 'url')
  ) then
    raise exception 'cell_touchpoints still carries screenshots or url';
  end if;

  select pg_get_constraintdef(c.oid) into def
    from pg_constraint c
   where c.conrelid = 'public.cell_touchpoints'::regclass
     and c.conname = 'cell_touchpoints_role_check';
  if def is null or def !~ '''core''' or def !~ '''peripheral''' then
    raise exception 'cell_touchpoints_role_check is not core | peripheral: %', def;
  end if;

  if exists (select 1 from pg_proc p join pg_namespace n on n.oid = p.pronamespace
              where n.nspname = 'public' and p.proname = 'duplicate_path'
                and (p.prosrc ~ 'select scenario_id, duplicate_path\.name'
                     or p.prosrc !~ 'v_scenario_id uuid;')) then
    raise exception 'duplicate_path still names its local ambiguously';
  end if;

  select count(*) into bad
    from pg_proc p join pg_namespace n on n.oid = p.pronamespace
   where n.nspname = 'public'
     and p.prokind in ('f', 'p')
     and p.prosrc ~ 'ct\.(screenshots|url)\M';
  if bad <> 0 then
    raise exception '% functions still read cell_touchpoints.screenshots or .url', bad;
  end if;

  if exists (select 1 from public.cell_touchpoints where role not in ('core', 'peripheral')) then
    raise exception 'a placement carries a role outside the vocabulary';
  end if;
end
$proof$;
