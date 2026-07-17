-- Standardize layer order: Front Stage Actions above Front Stage Tech on all paths.

with swapped as (
  select
    tech.id as tech_id,
    actions.id as actions_id,
    tech.row_position as tech_pos,
    actions.row_position as actions_pos
  from public.layers tech
  join public.layers actions on actions.path_id = tech.path_id
  where tech.name = 'Front Stage Tech'
    and actions.name = 'Front Stage Actions'
    and tech.row_position < actions.row_position
)
update public.layers l
set row_position = case
  when l.id in (select tech_id from swapped) then (
    select actions_pos from swapped s where s.tech_id = l.id
  )
  when l.id in (select actions_id from swapped) then (
    select tech_pos from swapped s where s.actions_id = l.id
  )
  else l.row_position
end
where l.id in (
  select tech_id from swapped
  union
  select actions_id from swapped
);

-- Warm-Up Alternate Path had legacy duplicate row positions for front stage layers.
update public.layers
set row_position = 4
where id = 'a0000000-0000-4000-8000-000000000404';

update public.layers
set row_position = 5
where id = 'a0000000-0000-4000-8000-000000000406';
