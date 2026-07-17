-- Tech Setup step 8 — obtain PLUS app login credentials.

insert into public.steps (id, service_scenario_id, name)
values (
  'a0000000-0000-4000-8000-000000000829',
  'a0000000-0000-4000-8000-000000000120',
  'PLUS app login'
)
on conflict (id) do update set
  name = excluded.name,
  service_scenario_id = excluded.service_scenario_id;

insert into public.path_steps (path_id, step_id, column_position)
values (
  'a0000000-0000-4000-8000-000000000800',
  'a0000000-0000-4000-8000-000000000829',
  8
)
on conflict (path_id, step_id) do update set
  column_position = excluded.column_position;

insert into public.cells (id, path_id, layer_id, step_id, content)
values
  (
    'a0000000-0000-4000-8000-000000100810',
    'a0000000-0000-4000-8000-000000000800',
    'a0000000-0000-4000-8000-000000000818',
    'a0000000-0000-4000-8000-000000000829',
    ''
  ),
  (
    'a0000000-0000-4000-8000-000000100803',
    'a0000000-0000-4000-8000-000000000800',
    'a0000000-0000-4000-8000-000000000831',
    'a0000000-0000-4000-8000-000000000829',
    'Obtains login credentials for PLUS app'
  ),
  (
    'a0000000-0000-4000-8000-000000100804',
    'a0000000-0000-4000-8000-000000000800',
    'a0000000-0000-4000-8000-000000000832',
    'a0000000-0000-4000-8000-000000000829',
    'PLUS Supervisor team provides login credentials to tutor'
  ),
  (
    'a0000000-0000-4000-8000-000000100806',
    'a0000000-0000-4000-8000-000000000800',
    'a0000000-0000-4000-8000-000000000833',
    'a0000000-0000-4000-8000-000000000829',
    E'Email\nPLUS App'
  )
on conflict (id) do update set
  content = excluded.content,
  layer_id = excluded.layer_id,
  step_id = excluded.step_id;

insert into public.cell_triggers (id, source_cell_id, target_cell_id)
values
  (
    'a0000000-0000-4000-8000-000000088017',
    'a0000000-0000-4000-8000-000000100703',
    'a0000000-0000-4000-8000-000000100803'
  ),
  (
    'a0000000-0000-4000-8000-000000088061',
    'a0000000-0000-4000-8000-000000100804',
    'a0000000-0000-4000-8000-000000100806'
  ),
  (
    'a0000000-0000-4000-8000-000000088062',
    'a0000000-0000-4000-8000-000000100806',
    'a0000000-0000-4000-8000-000000100803'
  )
on conflict (id) do update set
  source_cell_id = excluded.source_cell_id,
  target_cell_id = excluded.target_cell_id;
