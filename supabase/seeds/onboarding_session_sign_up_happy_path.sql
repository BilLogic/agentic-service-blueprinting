-- Onboarding → Session Sign Up scenario — Happy Path
-- Stable keys map to fixed UUIDs in src/data/sessionSignUpHappyPathFallback.ts

insert into public.paths (id, service_scenario_id, name, description, path_type)
values (
  'a0000000-0000-4000-8000-000000000805',
  'a0000000-0000-4000-8000-000000000125',
  'Happy Path',
  'Tutor signs up for recurring sessions for the rest of the semester.',
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
  where path_id = 'a0000000-0000-4000-8000-000000000805'
);

delete from public.cells
where path_id = 'a0000000-0000-4000-8000-000000000805';

delete from public.layers
where path_id = 'a0000000-0000-4000-8000-000000000805';

insert into public.layers (id, path_id, name, row_position)
values
  (
    'a0000000-0000-4000-8000-000000000878',
    'a0000000-0000-4000-8000-000000000805',
    'Visual',
    0
  ),
  (
    'a0000000-0000-4000-8000-000000000879',
    'a0000000-0000-4000-8000-000000000805',
    'Regular Tutor',
    1
  ),
  (
    'a0000000-0000-4000-8000-000000000881',
    'a0000000-0000-4000-8000-000000000805',
    'Front Stage Tech',
    2
  ),
  (
    'a0000000-0000-4000-8000-000000000880',
    'a0000000-0000-4000-8000-000000000805',
    'Front Stage Actions',
    3
  ),
  (
    'a0000000-0000-4000-8000-000000000883',
    'a0000000-0000-4000-8000-000000000805',
    'Back Stage Tech',
    4
  ),
  (
    'a0000000-0000-4000-8000-000000000882',
    'a0000000-0000-4000-8000-000000000805',
    'Back Stage Actions',
    5
  ),
  (
    'a0000000-0000-4000-8000-000000000884',
    'a0000000-0000-4000-8000-000000000805',
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
    'a0000000-0000-4000-8000-000000000891',
    'a0000000-0000-4000-8000-000000000125',
    'Sign up'
  ),
  (
    'a0000000-0000-4000-8000-000000000892',
    'a0000000-0000-4000-8000-000000000125',
    'Review scheduling'
  )
on conflict (id) do update set
  name = excluded.name,
  service_scenario_id = excluded.service_scenario_id;

insert into public.path_steps (path_id, step_id, column_position)
values
  ('a0000000-0000-4000-8000-000000000805', 'a0000000-0000-4000-8000-000000000891', 1),
  ('a0000000-0000-4000-8000-000000000805', 'a0000000-0000-4000-8000-000000000892', 2)
on conflict (path_id, step_id) do update set
  column_position = excluded.column_position;

insert into public.cells (id, path_id, layer_id, step_id, content)
values
  ('a0000000-0000-4000-8000-000000130110', 'a0000000-0000-4000-8000-000000000805', 'a0000000-0000-4000-8000-000000000878', 'a0000000-0000-4000-8000-000000000891', ''),
  ('a0000000-0000-4000-8000-000000130210', 'a0000000-0000-4000-8000-000000000805', 'a0000000-0000-4000-8000-000000000878', 'a0000000-0000-4000-8000-000000000892', ''),

  ('a0000000-0000-4000-8000-000000130103', 'a0000000-0000-4000-8000-000000000805', 'a0000000-0000-4000-8000-000000000879', 'a0000000-0000-4000-8000-000000000891', 'Signs up for recurring sessions for rest of semester.'),
  ('a0000000-0000-4000-8000-000000130106', 'a0000000-0000-4000-8000-000000000805', 'a0000000-0000-4000-8000-000000000881', 'a0000000-0000-4000-8000-000000000891', 'PLUS app'),
  ('a0000000-0000-4000-8000-000000130107', 'a0000000-0000-4000-8000-000000000805', 'a0000000-0000-4000-8000-000000000882', 'a0000000-0000-4000-8000-000000000891', 'Dev Team takes that scheduling info and stores it in a Google Spreadsheet.'),
  ('a0000000-0000-4000-8000-000000130108', 'a0000000-0000-4000-8000-000000000805', 'a0000000-0000-4000-8000-000000000883', 'a0000000-0000-4000-8000-000000000891', 'Google Spreadsheet'),
  ('a0000000-0000-4000-8000-000000130109', 'a0000000-0000-4000-8000-000000000805', 'a0000000-0000-4000-8000-000000000884', 'a0000000-0000-4000-8000-000000000891', E'Dev Team\nDesign Team'),

  ('a0000000-0000-4000-8000-000000130207', 'a0000000-0000-4000-8000-000000000805', 'a0000000-0000-4000-8000-000000000882', 'a0000000-0000-4000-8000-000000000892', 'Tutor supervisor team receives and reviews Google Spreadsheet from Dev Team.'),
  ('a0000000-0000-4000-8000-000000130208', 'a0000000-0000-4000-8000-000000000805', 'a0000000-0000-4000-8000-000000000883', 'a0000000-0000-4000-8000-000000000892', '')
on conflict (id) do update set
  path_id = excluded.path_id,
  layer_id = excluded.layer_id,
  step_id = excluded.step_id,
  content = excluded.content;

update public.cells
set description =
  'The Dev Team builds the PLUS app features for session sign up, and the Design Team creates the screens and flows for that experience.'
where id = 'a0000000-0000-4000-8000-000000130109';

update public.cells
set
  description = 'The tutor signs up for recurring sessions for the rest of the semester in the PLUS app.',
  links = jsonb_build_array(
    jsonb_build_object(
      'type', 'tech_description',
      'label', 'PLUS app',
      'description', 'The tutor signs up for recurring sessions for the rest of the semester in the PLUS app.',
      'picture', '/blueprint-images/session-sign-up/happy-path/plus-app/step-01-sign-up-success.png',
      'url', 'https://www.figma.com/design/W0qzhXWxFsMwSJzkdV2yal/Design-System---Web-App-Specs?node-id=1751-119990&t=rLMzaNhqBUszclus-1'
    )
  )
where id = 'a0000000-0000-4000-8000-000000130106';

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
where id = 'a0000000-0000-4000-8000-000000130108';

delete from public.cell_triggers
where id in (
  select id from public.cell_triggers
  where source_cell_id in (
    select id from public.cells
    where path_id = 'a0000000-0000-4000-8000-000000000805'
  )
);

insert into public.cell_triggers (id, source_cell_id, target_cell_id)
values
  ('a0000000-0000-4000-8000-000000092003', 'a0000000-0000-4000-8000-000000130103', 'a0000000-0000-4000-8000-000000130106'),
  ('a0000000-0000-4000-8000-000000092001', 'a0000000-0000-4000-8000-000000130106', 'a0000000-0000-4000-8000-000000130107'),
  ('a0000000-0000-4000-8000-000000092004', 'a0000000-0000-4000-8000-000000130107', 'a0000000-0000-4000-8000-000000130108'),
  ('a0000000-0000-4000-8000-000000092005', 'a0000000-0000-4000-8000-000000130108', 'a0000000-0000-4000-8000-000000130207')
on conflict (id) do update set
  source_cell_id = excluded.source_cell_id,
  target_cell_id = excluded.target_cell_id;

update public.cells
set picture = '/blueprint-images/session-sign-up/happy-path/regular-tutor/step-01-signs-up.png'
where id = 'a0000000-0000-4000-8000-000000130103';
