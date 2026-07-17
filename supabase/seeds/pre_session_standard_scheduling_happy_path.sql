-- Pre-session → Standard Scheduling scenario — Happy Path
-- Stable keys map to fixed UUIDs in src/data/standardSchedulingHappyPathFallback.ts

insert into public.paths (id, service_scenario_id, name, description, path_type)
values (
  'a0000000-0000-4000-8000-000000000806',
  'a0000000-0000-4000-8000-000000000126',
  'Happy Path',
  'Tutors receive semester schedule.',
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
    'a0000000-0000-4000-8000-000000000888',
    'a0000000-0000-4000-8000-000000000806',
    'Front Stage Tech',
    2
  ),
  (
    'a0000000-0000-4000-8000-000000000887',
    'a0000000-0000-4000-8000-000000000806',
    'Front Stage Actions',
    3
  ),
  (
    'a0000000-0000-4000-8000-000000000890',
    'a0000000-0000-4000-8000-000000000806',
    'Back Stage Tech',
    4
  ),
  (
    'a0000000-0000-4000-8000-000000000889',
    'a0000000-0000-4000-8000-000000000806',
    'Back Stage Actions',
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

  ('a0000000-0000-4000-8000-000000140107', 'a0000000-0000-4000-8000-000000000806', 'a0000000-0000-4000-8000-000000000889', 'a0000000-0000-4000-8000-000000000894', 'Tutor supervisor team receives and reviews tutor schedules from the Dev Team.'),
  ('a0000000-0000-4000-8000-000000140108', 'a0000000-0000-4000-8000-000000000806', 'a0000000-0000-4000-8000-000000000890', 'a0000000-0000-4000-8000-000000000894', 'Google Spreadsheet'),
  ('a0000000-0000-4000-8000-000000140109', 'a0000000-0000-4000-8000-000000000806', 'a0000000-0000-4000-8000-000000000895', 'a0000000-0000-4000-8000-000000000894', 'Dev Team'),

  ('a0000000-0000-4000-8000-000000140210', 'a0000000-0000-4000-8000-000000000806', 'a0000000-0000-4000-8000-000000000885', 'a0000000-0000-4000-8000-000000000896', ''),
  ('a0000000-0000-4000-8000-000000140203', 'a0000000-0000-4000-8000-000000000806', 'a0000000-0000-4000-8000-000000000886', 'a0000000-0000-4000-8000-000000000896', 'Receive schedule for the semester.'),
  ('a0000000-0000-4000-8000-000000140204', 'a0000000-0000-4000-8000-000000000806', 'a0000000-0000-4000-8000-000000000887', 'a0000000-0000-4000-8000-000000000896', 'Tutor supervisor team sends schedule.'),
  ('a0000000-0000-4000-8000-000000140206', 'a0000000-0000-4000-8000-000000000806', 'a0000000-0000-4000-8000-000000000888', 'a0000000-0000-4000-8000-000000000896', 'PLUS App'),
  ('a0000000-0000-4000-8000-000000140209', 'a0000000-0000-4000-8000-000000000806', 'a0000000-0000-4000-8000-000000000895', 'a0000000-0000-4000-8000-000000000896', E'Dev Team\nDesign Team')
on conflict (id) do update set
  path_id = excluded.path_id,
  layer_id = excluded.layer_id,
  step_id = excluded.step_id,
  content = excluded.content;

delete from public.cell_triggers
where id in (
  'a0000000-0000-4000-8000-000000093001',
  'a0000000-0000-4000-8000-000000093002',
  'a0000000-0000-4000-8000-000000093003',
  'a0000000-0000-4000-8000-000000093004'
);

insert into public.cell_triggers (id, source_cell_id, target_cell_id)
values
  (
    'a0000000-0000-4000-8000-000000093003',
    'a0000000-0000-4000-8000-000000140108',
    'a0000000-0000-4000-8000-000000140107'
  ),
  (
    'a0000000-0000-4000-8000-000000093001',
    'a0000000-0000-4000-8000-000000140107',
    'a0000000-0000-4000-8000-000000140204'
  ),
  (
    'a0000000-0000-4000-8000-000000093002',
    'a0000000-0000-4000-8000-000000140204',
    'a0000000-0000-4000-8000-000000140206'
  ),
  (
    'a0000000-0000-4000-8000-000000093004',
    'a0000000-0000-4000-8000-000000140206',
    'a0000000-0000-4000-8000-000000140203'
  )
on conflict (id) do update set
  source_cell_id = excluded.source_cell_id,
  target_cell_id = excluded.target_cell_id;

update public.cells
set
  description = 'The tutor''s session scheduling information is stored in a Google Spreadsheet.',
  links = jsonb_build_array(
    jsonb_build_object(
      'type', 'tech_description',
      'label', 'Google Spreadsheet',
      'description', 'The tutor''s session scheduling information is stored in a Google Spreadsheet.',
      'picture', '/blueprint-images/shared/back-stage-tech/google-sheets-logo.png'
    )
  )
where id = 'a0000000-0000-4000-8000-000000140108';

update public.cells
set
  description = 'The tutor supervisor team sends the semester schedule to tutors through the PLUS app.',
  links = jsonb_build_array(
    jsonb_build_object(
      'type', 'tech_description',
      'label', 'PLUS App',
      'description', 'The tutor supervisor team sends the semester schedule to tutors through the PLUS app.'
    )
  )
where id = 'a0000000-0000-4000-8000-000000140206';

update public.cells
set description =
  'The Dev Team stores tutor schedules in a Google Spreadsheet for the tutor supervisor team to review.'
where id = 'a0000000-0000-4000-8000-000000140109';

update public.cells
set description =
  'The Dev Team builds the PLUS app features for sending semester schedules, and the Design Team creates the screens and flows for that experience.'
where id = 'a0000000-0000-4000-8000-000000140209';

update public.cells
set picture = '/blueprint-images/standard-scheduling/happy-path/regular-tutor/step-02-receives-schedule.png'
where id = 'a0000000-0000-4000-8000-000000140203';
