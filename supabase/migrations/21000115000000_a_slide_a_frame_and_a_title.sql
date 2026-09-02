-- "Frame" meant two things and "storyboard" meant two more.
--
-- The vocabulary the instance settled, and this template did not:
--
--   storyboard  the LANE. A row of the board like any other, a role rather
--               than a medium.
--   frame       ONE image on ONE cell.
--   strip       a step's frames across the lanes — the script for that moment.
--   slide       one screen of a slice.
--
-- Against that, this schema said `slice_items` for a slide and commented the
-- table "Frames: consecutive slice cells grouped… Empty cell_ids = title-only
-- divider frame" — the word `frame` used for a slide, in the schema's own
-- prose, which is where the collision was hiding. And `cells.picture` named
-- the thing that IS a frame.
--
-- So, three renames:
--
--   slice_items          → slides
--   slice_items.caption  → slides.title
--   cells.picture        → cells.frame
--
-- `caption` becomes `title` under the rule the summary/name renames settled:
-- `name` is for structure a reader navigates, `title` is for authored content
-- a reader reads. A slide is something somebody wrote, like the slice above it.
--
-- ── What this does NOT do ─────────────────────────────────────────────────
--
-- `slides.illustration` stays. The instance dropped its equivalent because no
-- row had ever set it and it REPLACED the strip rather than joining it. Here
-- `SliceStoryboardField` writes it, so dropping it would delete a working
-- feature to match a decision taken where the feature did not exist. If it
-- should later become an append to the strip rather than a substitute, that
-- is a change with its own reasoning and its own migration.
--
-- ── The dependent names, longhand ────────────────────────────────────────
--
-- `alter table … rename` does not move the names of constraints, indexes,
-- policies or triggers. `__rename_schema_objects` did that in one call, and
-- 21000109000000 dropped it along with the other two vocabulary helpers once
-- the lane renames were finished.
--
-- Longhand rather than a `do` block over the catalog, for the reason the
-- helper's own successor documented: a name moved inside dynamic SQL is a name
-- the static readers cannot see, and a retired word nothing can see is a
-- retired word nothing forbids. Every name below was minted by
-- 20260729120000 and is verified present by applying the generated core to a
-- stock Postgres, so there is no guesswork in writing them out.

alter table public.cells rename column picture to frame;

comment on column public.cells.frame is
  'The frame: one image on this cell. A step''s frames across the lanes are its strip.';

-- `duplicate_path` and `duplicate_scenario` copy the column by name. A body is
-- text, so the rename above does not reach inside one: the function keeps
-- being created successfully and raises 42703 the first time it is called.
--
-- Scoped to those two functions BY NAME. A bare sweep would also reach
-- `sync_cell_resources`, where `picture` is a JSONB KEY from the retired
-- `links` shape — a value on the wire, not this column, and renaming it would
-- break the migration of data that still carries it.
do $rewrite$
declare
  target record;
  after text;
  rewritten int := 0;
begin
  for target in
    select p.oid, p.proname, pg_get_functiondef(p.oid) as def
      from pg_proc p
      join pg_namespace n on n.oid = p.pronamespace
     where n.nspname = 'public'
       and p.proname in ('duplicate_path', 'duplicate_scenario')
  loop
    after := regexp_replace(target.def, '\mpicture\M', 'frame', 'g');
    if after <> target.def then
      execute after;
      rewritten := rewritten + 1;
    end if;
  end loop;

  if rewritten = 0 then
    raise exception
      'neither duplicate_path nor duplicate_scenario names the column this '
      'migration renamed, so either it has already run or these functions are '
      'not the ones it was written against';
  end if;
end
$rewrite$;

alter table public.slice_items rename column caption to title;
alter table public.slice_items rename to slides;

alter table public.slides rename constraint slice_items_pkey            to slides_pkey;
alter table public.slides rename constraint slice_items_slice_id_fkey   to slides_slice_id_fkey;
alter table public.slides rename constraint slice_items_position_unique to slides_position_unique;
alter table public.slides rename constraint slice_items_keys_match_ids  to slides_keys_match_ids;

-- The primary-key and unique constraints carry an index of the same name, and
-- renaming the constraint renamed it with them. These two are the plain
-- indexes, which nothing renames for.
alter index public.slice_items_slice_id_idx rename to slides_slice_id_idx;
alter index public.slice_items_cell_ids_idx rename to slides_cell_ids_idx;

alter trigger set_slice_items_updated_at on public.slides
  rename to set_slides_updated_at;

comment on table public.slides is
  'One slide of a slice. It shows the frames of the cells it references — that strip is what the slide shows, so the two cannot disagree — and carries the words written over them. Empty cell_ids = a title-only divider slide.';

comment on column public.slides.title is
  'The words over this slide. A title rather than a name: it is authored content a reader reads, not structure a reader navigates.';

comment on column public.slides.cell_ids is
  'SOFT refs to cells (no FK — must survive scenario re-import). Same order as cell_keys.';

comment on column public.slides.cell_keys is
  'IR key-paths paired with cell_ids for orphan recovery after key renames.';

-- `cells.cell_key`'s comment names the table its keys are matched against, and
-- that name moved.
comment on column public.cells.cell_key is
  'Authored key: service/scenario/path/lane/step. Written by the import pipeline for origin=import, minted by upsert_cell for origin=app. Survives re-import; slides.cell_keys matches against it.';

-- @recipe — policies exist only where the Supabase recipe was applied, and
-- their names are the one dependent kind the core cannot carry.

alter policy "slice_items_select"      on public.slides rename to "slides_select";
alter policy "slice_items_insert_auth" on public.slides rename to "slides_insert_auth";
alter policy "slice_items_update_auth" on public.slides rename to "slides_update_auth";
alter policy "slice_items_delete_auth" on public.slides rename to "slides_delete_auth";

-- @core

do $$
declare
  v_left text;
begin
  -- Invariants, never censuses: each is vacuously true on an empty database
  -- and says something real on a populated one.
  if to_regclass('public.slice_items') is not null then
    raise exception 'slice_items survived the rename';
  end if;

  if exists (
    select 1 from information_schema.columns
     where table_schema = 'public' and table_name = 'cells' and column_name = 'picture'
  ) then
    raise exception 'cells.picture survived the rename';
  end if;

  select string_agg(name, ', ' order by name) into v_left
    from (
      select conname as name from pg_constraint
       where conrelid = 'public.slides'::regclass and conname like 'slice_item%'
      union all
      select indexname from pg_indexes
       where schemaname = 'public' and tablename = 'slides' and indexname like 'slice_item%'
      union all
      select tgname from pg_trigger
       where tgrelid = 'public.slides'::regclass and not tgisinternal
         and tgname like '%slice_item%'
    ) left_behind;

  if v_left is not null then
    raise exception 'dependent objects still carry the retired name: %', v_left;
  end if;

  select string_agg(p.proname, ', ' order by p.proname) into v_left
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
   where n.nspname = 'public'
     and p.proname in ('duplicate_path', 'duplicate_scenario')
     and p.prosrc ~ '\mpicture\M';

  if v_left is not null then
    raise exception 'a copy function still names the retired column: %', v_left;
  end if;
end
$$;
