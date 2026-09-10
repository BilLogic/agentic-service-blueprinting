-- Un-citing a cell drops that cell from the slide's image set.
--
-- `slide_images.cell_id` members are a choice about cells THIS slide cites.
-- When `cell_ids` loses a cell, that member has nothing to show and is
-- deleted. Other members keep their positions. `shows_all_images` is not
-- touched: an authored empty set stays an authored empty set, not the
-- untouched default. Citing the cell again does not put the member back.

create function public.slide_images_drop_uncited_cells()
returns trigger
language plpgsql
as $$
begin
  if new.cell_ids is not distinct from old.cell_ids then
    return new;
  end if;
  delete from public.slide_images
   where slide_id = new.id
     and cell_id is not null
     and not (cell_id = any (coalesce(new.cell_ids, '{}'::uuid[])));
  return new;
end;
$$;

comment on function public.slide_images_drop_uncited_cells() is
  'When a slide''s cell_ids change, drop slide_images rows whose cell is no '
  'longer cited. Positions of remaining members are left as they are.';

create trigger slides_drop_uncited_slide_images
  after update of cell_ids on public.slides
  for each row execute function public.slide_images_drop_uncited_cells();

-- @core

do $uncite$
declare
  svc uuid;
  ph uuid;
  sc uuid;
  pa uuid;
  ln uuid;
  st uuid;
  c1 uuid;
  c2 uuid;
  c3 uuid;
  slc uuid;
  sld uuid;
  n integer;
  p integer;
begin
  insert into public.services (name) values ('slide-uncite-rehearsal') returning id into svc;
  insert into public.phases (service_id, name, position) values (svc, 'p', 0) returning id into ph;
  insert into public.scenarios (phase_id, name, position) values (ph, 's', 0) returning id into sc;
  insert into public.paths (scenario_id, name, kind) values (sc, 'happy', 'happy') returning id into pa;
  insert into public.lanes (path_id, name, position) values (pa, 'lane', 0) returning id into ln;
  insert into public.steps (scenario_id, name) values (sc, 'step') returning id into st;
  insert into public.path_steps (path_id, step_id, position) values (pa, st, 0);
  insert into public.cells (path_id, lane_id, step_id, content, position)
  values (pa, ln, st, 'one', 0) returning id into c1;
  insert into public.cells (path_id, lane_id, step_id, content, position)
  values (pa, ln, st, 'two', 1) returning id into c2;
  insert into public.cells (path_id, lane_id, step_id, content, position)
  values (pa, ln, st, 'three', 2) returning id into c3;
  insert into public.slices (service_id, kind, title)
  values (svc, 'custom', 'rehearsal') returning id into slc;
  insert into public.slides (slice_id, position, cell_ids, cell_keys, shows_all_images)
  values (slc, 0, array[c1, c2, c3], array['k1','k2','k3'], false)
  returning id into sld;

  insert into public.slide_images (slide_id, position, cell_id, image_url)
  values (sld, 0, c1, null),
         (sld, 1, null, 'https://example.com/a.png'),
         (sld, 2, c2, null),
         (sld, 3, c3, null);

  -- Un-cite c2; c1, the upload, and c3 remain, at their original positions.
  update public.slides
     set cell_ids = array[c1, c3],
         cell_keys = array['k1','k3']
   where id = sld;

  select count(*) into n from public.slide_images where slide_id = sld;
  if n <> 3 then
    raise exception 'unciting one cell left % members, expected 3', n;
  end if;
  if exists (select 1 from public.slide_images where slide_id = sld and cell_id = c2) then
    raise exception 'the uncited cell''s member is still there';
  end if;
  select position into p from public.slide_images where slide_id = sld and cell_id = c3;
  if p <> 3 then
    raise exception 'remaining member was reindexed to %, expected 3', p;
  end if;
  select position into p from public.slide_images
   where slide_id = sld and image_url = 'https://example.com/a.png';
  if p <> 1 then
    raise exception 'upload member was reindexed to %, expected 1', p;
  end if;

  -- Re-citing c2 does not put the member back.
  update public.slides
     set cell_ids = array[c1, c2, c3],
         cell_keys = array['k1','k2','k3']
   where id = sld;
  if exists (select 1 from public.slide_images where slide_id = sld and cell_id = c2) then
    raise exception 're-citing a cell resurrected its image member';
  end if;

  -- Un-cite every remaining cell member; the flag stays false (chose nothing).
  update public.slides
     set cell_ids = '{}'::uuid[],
         cell_keys = '{}'::text[]
   where id = sld;
  select count(*) into n from public.slide_images
   where slide_id = sld and cell_id is not null;
  if n <> 0 then
    raise exception 'unciting every cell left % cell members', n;
  end if;
  if exists (
    select 1 from public.slides where id = sld and shows_all_images
  ) then
    raise exception 'emptying the set flipped the slide back to untouched';
  end if;
  select count(*) into n from public.slide_images where slide_id = sld;
  if n <> 1 then
    raise exception 'the upload member was dropped with the cells';
  end if;

  delete from public.services where id = svc;
end
$uncite$;
