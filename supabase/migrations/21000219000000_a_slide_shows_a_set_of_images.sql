-- A slide shows a SET of images, in an order somebody chose.
--
-- 21000218000000 gave a slide a pool and one choice out of it. One choice was
-- still an exception dressed as a feature: an author with three uploads could
-- show exactly one of them, and an author who wanted the second frame BESIDE
-- their own drawing could not say so at all. The pool made the images
-- first-class and then let the slide point at one.
--
-- So the choice becomes a set, and the shape follows from what a set needs
-- that a pair of columns cannot give it.
--
-- ── Why a table and not a jsonb array ────────────────────────────────────
--
-- The reason 21000218000000 used two columns rather than one jsonb reference
-- was integrity: a frame belongs to a cell, a cell can be deleted, and
-- `on delete set null` retires the choice where a dangling id inside a
-- document renders blank and explains nothing.
--
-- That reason does not weaken when the choice becomes a set; it is the same
-- reason, once per member. A jsonb array of references cannot carry a foreign
-- key, so every element would be an id nothing checks. `slide_strip` is one
-- row per member, and the cell reference is a real reference: deleting a cell
-- removes the members that named it and the slide falls back to the frames of
-- the cells it still cites.
--
-- Ordering is the second thing a set needs and a pair of columns never had.
-- `position` is it, unique per slide, the same shape `slides.position` uses
-- inside a slice.
--
-- ── The names ────────────────────────────────────────────────────────────
--
-- `illustrations` becomes `images`. An illustration is a drawn thing; half of
-- what an author uploads here is a screenshot, and a column that calls a
-- screenshot an illustration is the same defect as a lane that calls a slide
-- a frame. `images` says what they are and nothing they are not.
--
-- `slide_strip` names the row for what the glossary already calls it: a
-- slide's strip is the images it shows, in order. It stops being derived only
-- when an author says otherwise, which is what these rows are.
--
-- NO ROWS is the default and stays it: a slide with an empty strip shows the
-- frames of the cells it cites, exactly as every row does today.

alter table public.slides rename column illustrations to images;

comment on column public.slides.images is
  'Images an author uploaded for this slide, in author order. The slide''s '
  'pool, not what it shows: what it shows is `slide_strip`, and an upload '
  'nothing points at is a legitimate resting state.';

create table public.slide_strip (
  id        uuid primary key default gen_random_uuid(),
  slide_id  uuid not null references public.slides (id) on delete cascade,
  position  integer not null,
  -- Exactly one of these. A member is a cell's frame or one of the slide's
  -- own images, and `num_nonnulls` is what stops it being both or neither.
  cell_id   uuid references public.cells (id) on delete cascade,
  image_url text,
  constraint slide_strip_one_source
    check (num_nonnulls(cell_id, image_url) = 1),
  constraint slide_strip_position_unique unique (slide_id, position)
);

comment on table public.slide_strip is
  'What one slide shows, in order: a member per row, each either a cell''s '
  'frame or one of the slide''s own images. NO ROWS means the slide shows the '
  'frames of the cells it cites, which is the default and what most slides do.';

comment on column public.slide_strip.cell_id is
  'Show this cell''s frame. A real reference, so deleting the cell removes '
  'the member rather than leaving an id that renders blank.';

comment on column public.slide_strip.image_url is
  'Show this uploaded image. One of the slide''s `images`.';

create index slide_strip_slide_id_idx on public.slide_strip (slide_id);

-- Carry the single choice forward as a one-member strip, which is what it was.
insert into public.slide_strip (slide_id, position, cell_id, image_url)
select id, 1, active_frame_cell_id, active_illustration
  from public.slides
 where active_frame_cell_id is not null
    or active_illustration is not null;

alter table public.slides
  drop constraint slides_one_active_image,
  drop constraint slides_active_illustration_is_in_the_pool,
  drop column active_frame_cell_id,
  drop column active_illustration;

-- @recipe — a new table is unreachable until it is granted and its policies
-- exist. Everything above is plain Postgres; roles are Supabase's half.

alter table public.slide_strip enable row level security;

create policy slide_strip_select_anon on public.slide_strip
  for select to anon using (true);
create policy slide_strip_select_auth on public.slide_strip
  for select to authenticated using (true);
create policy slide_strip_write_auth on public.slide_strip
  for all to authenticated using (true) with check (true);

grant select on public.slide_strip to anon, authenticated;
grant insert, update, delete on public.slide_strip to authenticated;

-- @core

do $strip$
declare
  n integer;
begin
  -- Invariants, not censuses. Vacuously true on an empty database.
  select count(*) into n from public.slide_strip
   where num_nonnulls(cell_id, image_url) <> 1;
  if n <> 0 then
    raise exception '% strip member(s) name two sources or none', n;
  end if;

  select count(*) into n
    from public.slide_strip m
    join public.slides s on s.id = m.slide_id
   where m.image_url is not null
     and not (m.image_url = any (s.images));
  if n <> 0 then
    raise exception '% strip member(s) show an image the slide does not have', n;
  end if;
end
$strip$;
