-- An uploaded image is a member of the same set as a cell's frame.

comment on column public.slide_images.image_url is
  'Show this uploaded image. It joins the slide''s set; it does not replace '
  'the cited cells'' frames.';

-- @core

do $upload$
begin
  if not exists (
    select 1
      from information_schema.columns
     where table_schema = 'public'
       and table_name = 'slide_images'
       and column_name = 'image_url'
  ) then
    raise exception 'slide_images.image_url is not there';
  end if;
end
$upload$;
