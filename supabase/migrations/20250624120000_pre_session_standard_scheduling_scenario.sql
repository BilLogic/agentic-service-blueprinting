-- Pre-session phase: Standard Scheduling scenario

insert into public.service_scenarios (id, phase_id, name, description, order_position, view_type)
values (
  'a0000000-0000-4000-8000-000000000126',
  'a0000000-0000-4000-8000-000000000103',
  'Standard Scheduling',
  null,
  1,
  'side-by-side'
)
on conflict (id) do update set
  phase_id = excluded.phase_id,
  name = excluded.name,
  description = excluded.description,
  order_position = excluded.order_position,
  view_type = excluded.view_type;
