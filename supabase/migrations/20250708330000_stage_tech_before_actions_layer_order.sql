-- Standardize layer order after the interaction line:
-- Front Stage Tech -> Front Stage Actions -> Back Stage Tech -> Back Stage Actions -> Support Actions

with front_swapped as (
  select
    tech.id as tech_id,
    actions.id as actions_id,
    tech.row_position as tech_pos,
    actions.row_position as actions_pos
  from public.layers tech
  join public.layers actions on actions.path_id = tech.path_id
  where tech.name = 'Front Stage Tech'
    and actions.name = 'Front Stage Actions'
    and actions.row_position < tech.row_position
),
back_swapped as (
  select
    tech.id as tech_id,
    actions.id as actions_id,
    tech.row_position as tech_pos,
    actions.row_position as actions_pos
  from public.layers tech
  join public.layers actions on actions.path_id = tech.path_id
  where tech.name = 'Back Stage Tech'
    and actions.name = 'Back Stage Actions'
    and actions.row_position < tech.row_position
)
update public.layers l
set row_position = case
  when l.id in (select tech_id from front_swapped) then (
    select actions_pos from front_swapped s where s.tech_id = l.id
  )
  when l.id in (select actions_id from front_swapped) then (
    select tech_pos from front_swapped s where s.actions_id = l.id
  )
  when l.id in (select tech_id from back_swapped) then (
    select actions_pos from back_swapped s where s.tech_id = l.id
  )
  when l.id in (select actions_id from back_swapped) then (
    select tech_pos from back_swapped s where s.actions_id = l.id
  )
  else l.row_position
end
where l.id in (
  select tech_id from front_swapped
  union select actions_id from front_swapped
  union select tech_id from back_swapped
  union select actions_id from back_swapped
);

-- Warm-Up Alternate Path had legacy duplicate front stage row positions.
update public.layers
set row_position = 4
where id = 'a0000000-0000-4000-8000-000000000406';

update public.layers
set row_position = 5
where id = 'a0000000-0000-4000-8000-000000000404';

update public.layers
set row_position = 6
where id = 'a0000000-0000-4000-8000-000000000408';

update public.layers
set row_position = 7
where id = 'a0000000-0000-4000-8000-000000000407';
