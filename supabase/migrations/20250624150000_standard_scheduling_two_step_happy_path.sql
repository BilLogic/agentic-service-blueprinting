-- Standard Scheduling happy path: two-step layout (review → receive)
-- Matches src/data/standardSchedulingHappyPathFallback.ts

insert into public.paths (id, service_scenario_id, name, description, path_type)
values (
  'a0000000-0000-4000-8000-000000000806',
  'a0000000-0000-4000-8000-000000000126',
  'Happy Path',
  'The tutors receive semester schedule',
  'happy'
)
on conflict (id) do update set
  service_scenario_id = excluded.service_scenario_id,
  name = excluded.name,
  description = excluded.description,
  path_type = excluded.path_type;

delete from public.cell_triggers
where source_cell_id in (
  select id from public.cells
  where path_id = 'a0000000-0000-4000-8000-000000000806'
);

delete from public.cells
where path_id = 'a0000000-0000-4000-8000-000000000806';

delete from public.layers
where path_id = 'a0000000-0000-4000-8000-000000000806';

insert into public.layers (id, path_id, name, row_position)
values
  (
    'a0000000-0000-4000-8000-000000000885',
    'a0000000-0000-4000-8000-000000000806',
    'Visual',
    0
  ),
  (
    'a0000000-0000-4000-8000-000000000886',
    'a0000000-0000-4000-8000-000000000806',
    'Regular Tutor',
    1
  ),
  (
    'a0000000-0000-4000-8000-000000000887',
    'a0000000-0000-4000-8000-000000000806',
    'Front Stage Actions',
    2
  ),
  (
    'a0000000-0000-4000-8000-000000000888',
    'a0000000-0000-4000-8000-000000000806',
    'Front Stage Tech',
    3
  ),
  (
    'a0000000-0000-4000-8000-000000000889',
    'a0000000-0000-4000-8000-000000000806',
    'Back Stage Actions',
    4
  ),
  (
    'a0000000-0000-4000-8000-000000000890',
    'a0000000-0000-4000-8000-000000000806',
    'Back Stage Tech',
    5
  ),
  (
    'a0000000-0000-4000-8000-000000000895',
    'a0000000-0000-4000-8000-000000000806',
    'Support Actions',
    6
  )
on conflict (id) do update set
  name = excluded.name,
  row_position = excluded.row_position,
  path_id = excluded.path_id;

insert into public.steps (id, service_scenario_id, name)
values
  (
    'a0000000-0000-4000-8000-000000000894',
    'a0000000-0000-4000-8000-000000000126',
    'Review schedules'
  ),
  (
    'a0000000-0000-4000-8000-000000000896',
    'a0000000-0000-4000-8000-000000000126',
    'Receive schedule'
  )
on conflict (id) do update set
  name = excluded.name,
  service_scenario_id = excluded.service_scenario_id;

delete from public.path_steps
where path_id = 'a0000000-0000-4000-8000-000000000806';

insert into public.path_steps (path_id, step_id, column_position)
values
  ('a0000000-0000-4000-8000-000000000806', 'a0000000-0000-4000-8000-000000000894', 1),
  ('a0000000-0000-4000-8000-000000000806', 'a0000000-0000-4000-8000-000000000896', 2)
on conflict (path_id, step_id) do update set
  column_position = excluded.column_position;

insert into public.cells (id, path_id, layer_id, step_id, content)
values
  ('a0000000-0000-4000-8000-000000140110', 'a0000000-0000-4000-8000-000000000806', 'a0000000-0000-4000-8000-000000000885', 'a0000000-0000-4000-8000-000000000894', ''),

  ('a0000000-0000-4000-8000-000000140107', 'a0000000-0000-4000-8000-000000000806', 'a0000000-0000-4000-8000-000000000889', 'a0000000-0000-4000-8000-000000000894', 'Tutor Supervisor Team receives and reviews tutor schedules from the dev team'),
  ('a0000000-0000-4000-8000-000000140108', 'a0000000-0000-4000-8000-000000000806', 'a0000000-0000-4000-8000-000000000890', 'a0000000-0000-4000-8000-000000000894', 'Google Spreadsheet'),
  ('a0000000-0000-4000-8000-000000140109', 'a0000000-0000-4000-8000-000000000806', 'a0000000-0000-4000-8000-000000000895', 'a0000000-0000-4000-8000-000000000894', 'Dev Team'),

  ('a0000000-0000-4000-8000-000000140210', 'a0000000-0000-4000-8000-000000000806', 'a0000000-0000-4000-8000-000000000885', 'a0000000-0000-4000-8000-000000000896', ''),
  ('a0000000-0000-4000-8000-000000140203', 'a0000000-0000-4000-8000-000000000806', 'a0000000-0000-4000-8000-000000000886', 'a0000000-0000-4000-8000-000000000896', 'Receive Schedule for the semester'),
  ('a0000000-0000-4000-8000-000000140204', 'a0000000-0000-4000-8000-000000000806', 'a0000000-0000-4000-8000-000000000887', 'a0000000-0000-4000-8000-000000000896', 'Tutor Supervisor Team sends schedule'),
  ('a0000000-0000-4000-8000-000000140206', 'a0000000-0000-4000-8000-000000000806', 'a0000000-0000-4000-8000-000000000888', 'a0000000-0000-4000-8000-000000000896', 'PLUS App')
on conflict (id) do update set
  path_id = excluded.path_id,
  layer_id = excluded.layer_id,
  step_id = excluded.step_id,
  content = excluded.content;

delete from public.cell_triggers
where id in (
  'a0000000-0000-4000-8000-000000093001',
  'a0000000-0000-4000-8000-000000093002'
);
