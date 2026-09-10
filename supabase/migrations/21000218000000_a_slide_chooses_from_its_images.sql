-- A slide chooses from its images; it does not swap one for the other.
--
-- `slides.illustration` held ONE image and, when set, replaced the slide's
-- strip entirely. Two things were wrong with that, and only the second was
-- ever written down.
--
-- The written one: the substitution was silent. `21000115000000` kept the
-- column and said what would settle it — "if it should later become an append
-- to the strip rather than a substitute, that is a change with its own
-- reasoning and its own migration". This is that migration, and append turns
-- out to be the wrong answer too.
--
-- The unwritten one: an author who wants ONE drawn image instead of three
-- fragments is not asking to append, and an author who wants the second frame
-- alone could not ask at all. A slide had exactly two states — all its frames,
-- or one uploaded image — and the useful middle was unreachable.
--
-- So the slide keeps a POOL and chooses from it. The pool is its uploaded
-- illustrations plus the frames of the cells it cites, and the choice names
-- one member of it, or nothing:
--
--   both null            the strip, exactly as today. Still the default, and
--                        still what every existing row does.
--   active_frame_cell_id one cell's frame. Unreachable before this migration.
--   active_illustration  one uploaded image, which is what the old column did.
--
-- ── Why an array of text, not jsonb ──────────────────────────────────────
--
-- `cell_touchpoints.screenshots text[]` is the same thing at a different
-- grain, and 21000119000000 argued it out already: one array column is what
-- the singular and plural fields were always describing, and a single-valued
-- column "would silently drop every entry after the first the day an author
-- used the plural field".
--
-- The old column carried `{src, updated_at}` because the upload path was
-- derived from the slide id and UPSERTED, so a replacement overwrote its
-- predecessor and needed a cache-buster to be seen. A pool does not overwrite:
-- every upload is its own object under its own name, so a new image is a new
-- URL and there is nothing to bust. `updated_at` was solving a problem this
-- shape does not have.
--
-- ── Why the choice is two columns and not one jsonb ──────────────────────
--
-- A frame belongs to a cell, and a cell can be deleted. As a column with a
-- reference, `on delete set null` retires the choice the moment its cell goes
-- and the slide falls back to its strip. The same fact inside a jsonb
-- document is a dangling id that nothing can see, on a slide that renders
-- blank and explains nothing. `num_nonnulls` keeps them mutually exclusive.

alter table public.slides
  add column illustrations text[] not null default '{}'::text[],
  add column active_frame_cell_id uuid references public.cells (id) on delete set null,
  add column active_illustration text;

comment on column public.slides.illustrations is
  'Images an author uploaded for this slide, in author order. The slide''s '
  'pool, not what it shows: what it shows is chosen by the two active_ '
  'columns, and an unused upload is a legitimate resting state.';

comment on column public.slides.active_frame_cell_id is
  'Show this cell''s frame alone. Null with active_illustration null means '
  'show the whole strip.';

comment on column public.slides.active_illustration is
  'Show this uploaded image alone. Must be one of illustrations.';

-- Carry the old column forward: its image becomes the pool's only member, and
-- the choice that reproduces what the slide showed yesterday.
update public.slides
   set illustrations = array[illustration->>'src'],
       active_illustration = illustration->>'src'
 where illustration is not null
   and illustration->>'src' is not null;

alter table public.slides
  add constraint slides_one_active_image
    check (num_nonnulls(active_frame_cell_id, active_illustration) <= 1),
  add constraint slides_active_illustration_is_in_the_pool
    check (active_illustration is null or active_illustration = any (illustrations));

alter table public.slides drop column illustration;

-- @recipe — the pool and the choice are authored, so the role that authors
-- needs them. `slides` is granted whole-table UPDATE rather than column by
-- column, so this is a no-op restatement wherever that grant is already in
-- place; it is here so a host that reads only this file still arrives at the
-- same permissions.

grant update on public.slides to authenticated;

-- @core

do $chosen$
declare
  n integer;
begin
  -- Invariants, not censuses. Vacuously true on an empty database.
  select count(*) into n from public.slides
   where active_illustration is not null
     and not (active_illustration = any (illustrations));
  if n <> 0 then
    raise exception '% slide(s) show an image that is not in their pool', n;
  end if;

  select count(*) into n from public.slides
   where active_frame_cell_id is not null and active_illustration is not null;
  if n <> 0 then
    raise exception '% slide(s) claim to show two images at once', n;
  end if;
end
$chosen$;
