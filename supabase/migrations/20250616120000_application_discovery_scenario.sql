-- Application phase: Discovery scenario (blueprint in seeds/application_discovery_happy_path.sql)

insert into public.service_scenarios (id, phase_id, name, description, order_position, view_type)
values (
  'a0000000-0000-4000-8000-000000000121',
  'a0000000-0000-4000-8000-000000000101',
  'Discovery',
  'Potential tutors discover plus',
  1,
  'side-by-side'
)
on conflict (id) do update set
  phase_id = excluded.phase_id,
  name = excluded.name,
  description = excluded.description,
  order_position = excluded.order_position,
  view_type = excluded.view_type;
