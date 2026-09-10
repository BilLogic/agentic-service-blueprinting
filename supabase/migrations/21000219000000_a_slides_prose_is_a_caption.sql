-- A slide's prose is a caption.
--
-- `slides.narrative` named the sentence a reader meets under the images as if
-- it were a story the slide told. It is the words under the pictures: a
-- caption. The column moves and nothing else does — no behaviour change, no
-- drop, no add.

alter table public.slides rename column narrative to caption;

comment on column public.slides.caption is
  'The sentence a reader meets under this slide''s images. Authored content, '
  'not a story the slide tells.';

-- @recipe — `slides` is granted whole-table UPDATE, so a renamed column keeps
-- the grant under its new name. Naming it again is belt and braces on a host
-- that replayed the grant rather than the rename.

grant update on public.slides to authenticated;

-- @core

do $caption$
begin
  if exists (
    select 1
      from information_schema.columns
     where table_schema = 'public'
       and table_name = 'slides'
       and column_name = 'narrative'
  ) then
    raise exception 'slides.narrative is still there';
  end if;

  if not exists (
    select 1
      from information_schema.columns
     where table_schema = 'public'
       and table_name = 'slides'
       and column_name = 'caption'
  ) then
    raise exception 'slides.caption is not there';
  end if;
end
$caption$;
