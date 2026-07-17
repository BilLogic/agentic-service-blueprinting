-- Pre-session → Fill-in Request scenario — Happy Path
-- Stable keys map to fixed UUIDs in src/data/fillInRequestHappyPathFallback.ts

insert into public.paths (id, service_scenario_id, name, description, path_type)
values (
  'a0000000-0000-4000-8000-000000000807',
  'a0000000-0000-4000-8000-000000000127',
  'Happy Path',
  'Tutor is requested to fill in for a session.',
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
  where path_id = 'a0000000-0000-4000-8000-000000000807'
);

delete from public.cells
where path_id = 'a0000000-0000-4000-8000-000000000807';

delete from public.layers
where path_id = 'a0000000-0000-4000-8000-000000000807';

insert into public.layers (id, path_id, name, row_position)
values
  (
    'a0000000-0000-4000-8000-000000000903',
    'a0000000-0000-4000-8000-000000000807',
    'Visual',
    0
  ),
  (
    'a0000000-0000-4000-8000-000000000904',
    'a0000000-0000-4000-8000-000000000807',
    'Regular Tutor',
    1
  ),
  (
    'a0000000-0000-4000-8000-000000000906',
    'a0000000-0000-4000-8000-000000000807',
    'Front Stage Tech',
    2
  ),
  (
    'a0000000-0000-4000-8000-000000000905',
    'a0000000-0000-4000-8000-000000000807',
    'Front Stage Actions',
    3
  ),
  (
    'a0000000-0000-4000-8000-000000000908',
    'a0000000-0000-4000-8000-000000000807',
    'Back Stage Tech',
    4
  ),
  (
    'a0000000-0000-4000-8000-000000000907',
    'a0000000-0000-4000-8000-000000000807',
    'Back Stage Actions',
    5
  ),
  (
    'a0000000-0000-4000-8000-000000000909',
    'a0000000-0000-4000-8000-000000000807',
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
    'a0000000-0000-4000-8000-000000000897',
    'a0000000-0000-4000-8000-000000000127',
    'Initial request'
  ),
  (
    'a0000000-0000-4000-8000-000000000898',
    'a0000000-0000-4000-8000-000000000127',
    'Send request'
  ),
  (
    'a0000000-0000-4000-8000-000000000899',
    'a0000000-0000-4000-8000-000000000127',
    'Tutor response'
  ),
  (
    'a0000000-0000-4000-8000-000000000900',
    'a0000000-0000-4000-8000-000000000127',
    'Finalize assignment'
  )
on conflict (id) do update set
  name = excluded.name,
  service_scenario_id = excluded.service_scenario_id;

delete from public.path_steps
where path_id = 'a0000000-0000-4000-8000-000000000807';

insert into public.path_steps (path_id, step_id, column_position)
values
  ('a0000000-0000-4000-8000-000000000807', 'a0000000-0000-4000-8000-000000000897', 1),
  ('a0000000-0000-4000-8000-000000000807', 'a0000000-0000-4000-8000-000000000898', 2),
  ('a0000000-0000-4000-8000-000000000807', 'a0000000-0000-4000-8000-000000000899', 3),
  ('a0000000-0000-4000-8000-000000000807', 'a0000000-0000-4000-8000-000000000900', 4)
on conflict (path_id, step_id) do update set
  column_position = excluded.column_position;

insert into public.cells (id, path_id, layer_id, step_id, content)
values
  ('a0000000-0000-4000-8000-000000150110', 'a0000000-0000-4000-8000-000000000807', 'a0000000-0000-4000-8000-000000000903', 'a0000000-0000-4000-8000-000000000897', ''),
  ('a0000000-0000-4000-8000-000000150107', 'a0000000-0000-4000-8000-000000000807', 'a0000000-0000-4000-8000-000000000907', 'a0000000-0000-4000-8000-000000000897', 'Tutor supervisor team receives call off request and reviews tutor availabilities.'),
  ('a0000000-0000-4000-8000-000000150108', 'a0000000-0000-4000-8000-000000000807', 'a0000000-0000-4000-8000-000000000908', 'a0000000-0000-4000-8000-000000000897', 'Google Spreadsheet'),
  ('a0000000-0000-4000-8000-000000150106', 'a0000000-0000-4000-8000-000000000807', 'a0000000-0000-4000-8000-000000000906', 'a0000000-0000-4000-8000-000000000897', 'Shift Swap Google Form'),
  ('a0000000-0000-4000-8000-000000150109', 'a0000000-0000-4000-8000-000000000807', 'a0000000-0000-4000-8000-000000000909', 'a0000000-0000-4000-8000-000000000897', 'Dev Team'),

  ('a0000000-0000-4000-8000-000000150210', 'a0000000-0000-4000-8000-000000000807', 'a0000000-0000-4000-8000-000000000903', 'a0000000-0000-4000-8000-000000000898', ''),
  ('a0000000-0000-4000-8000-000000150204', 'a0000000-0000-4000-8000-000000000807', 'a0000000-0000-4000-8000-000000000905', 'a0000000-0000-4000-8000-000000000898', 'Tutor supervisor team requests fill in and fellow tutor sends message in #shift-swap Slack channel.'),
  ('a0000000-0000-4000-8000-000000150203', 'a0000000-0000-4000-8000-000000000807', 'a0000000-0000-4000-8000-000000000904', 'a0000000-0000-4000-8000-000000000898', 'Tutor receives request.'),
  ('a0000000-0000-4000-8000-000000150206', 'a0000000-0000-4000-8000-000000000807', 'a0000000-0000-4000-8000-000000000906', 'a0000000-0000-4000-8000-000000000898', 'Slack, Email'),

  ('a0000000-0000-4000-8000-000000150310', 'a0000000-0000-4000-8000-000000000807', 'a0000000-0000-4000-8000-000000000903', 'a0000000-0000-4000-8000-000000000899', ''),
  ('a0000000-0000-4000-8000-000000150303', 'a0000000-0000-4000-8000-000000000807', 'a0000000-0000-4000-8000-000000000904', 'a0000000-0000-4000-8000-000000000899', 'Tutor confirms or denies fill in request.'),
  ('a0000000-0000-4000-8000-000000150304', 'a0000000-0000-4000-8000-000000000807', 'a0000000-0000-4000-8000-000000000905', 'a0000000-0000-4000-8000-000000000899', 'Tutor supervisor team is notified on if tutor can fill in.'),
  ('a0000000-0000-4000-8000-000000150306', 'a0000000-0000-4000-8000-000000000807', 'a0000000-0000-4000-8000-000000000906', 'a0000000-0000-4000-8000-000000000899', 'Slack, Email'),

  ('a0000000-0000-4000-8000-000000150410', 'a0000000-0000-4000-8000-000000000807', 'a0000000-0000-4000-8000-000000000903', 'a0000000-0000-4000-8000-000000000900', ''),
  ('a0000000-0000-4000-8000-000000150403', 'a0000000-0000-4000-8000-000000000807', 'a0000000-0000-4000-8000-000000000904', 'a0000000-0000-4000-8000-000000000900', 'Tutor accesses session if able to fill in.'),
  ('a0000000-0000-4000-8000-000000150406', 'a0000000-0000-4000-8000-000000000807', 'a0000000-0000-4000-8000-000000000906', 'a0000000-0000-4000-8000-000000000900', 'PLUS App'),
  ('a0000000-0000-4000-8000-000000150407', 'a0000000-0000-4000-8000-000000000807', 'a0000000-0000-4000-8000-000000000907', 'a0000000-0000-4000-8000-000000000900', 'Tutor supervisor team adds tutor to session if tutor confirms request.'),
  ('a0000000-0000-4000-8000-000000150409', 'a0000000-0000-4000-8000-000000000807', 'a0000000-0000-4000-8000-000000000909', 'a0000000-0000-4000-8000-000000000900', E'Dev Team\nDesign Team')
on conflict (id) do update set
  path_id = excluded.path_id,
  layer_id = excluded.layer_id,
  step_id = excluded.step_id,
  content = excluded.content;

insert into public.cell_triggers (id, source_cell_id, target_cell_id)
values
  ('a0000000-0000-4000-8000-000000094001', 'a0000000-0000-4000-8000-000000150107', 'a0000000-0000-4000-8000-000000150108'),
  ('a0000000-0000-4000-8000-000000094009', 'a0000000-0000-4000-8000-000000150106', 'a0000000-0000-4000-8000-000000150107'),
  ('a0000000-0000-4000-8000-000000094002', 'a0000000-0000-4000-8000-000000150107', 'a0000000-0000-4000-8000-000000150204'),
  ('a0000000-0000-4000-8000-000000094003', 'a0000000-0000-4000-8000-000000150204', 'a0000000-0000-4000-8000-000000150206'),
  ('a0000000-0000-4000-8000-000000094010', 'a0000000-0000-4000-8000-000000150206', 'a0000000-0000-4000-8000-000000150203'),
  ('a0000000-0000-4000-8000-000000094004', 'a0000000-0000-4000-8000-000000150203', 'a0000000-0000-4000-8000-000000150303'),
  ('a0000000-0000-4000-8000-000000094005', 'a0000000-0000-4000-8000-000000150303', 'a0000000-0000-4000-8000-000000150306'),
  ('a0000000-0000-4000-8000-000000094011', 'a0000000-0000-4000-8000-000000150306', 'a0000000-0000-4000-8000-000000150304'),
  ('a0000000-0000-4000-8000-000000094012', 'a0000000-0000-4000-8000-000000150303', 'a0000000-0000-4000-8000-000000150403'),
  ('a0000000-0000-4000-8000-000000094006', 'a0000000-0000-4000-8000-000000150304', 'a0000000-0000-4000-8000-000000150407'),
  ('a0000000-0000-4000-8000-000000094013', 'a0000000-0000-4000-8000-000000150407', 'a0000000-0000-4000-8000-000000150406'),
  ('a0000000-0000-4000-8000-000000094014', 'a0000000-0000-4000-8000-000000150406', 'a0000000-0000-4000-8000-000000150403')
on conflict (id) do update set
  source_cell_id = excluded.source_cell_id,
  target_cell_id = excluded.target_cell_id;

delete from public.steps
where id = 'a0000000-0000-4000-8000-000000000901'
  and not exists (
    select 1 from public.path_steps ps
    where ps.step_id = 'a0000000-0000-4000-8000-000000000901'
  );

update public.cells
set links = jsonb_build_array(
  jsonb_build_object(
    'type', 'tech_description',
    'label', 'Shift Swap Google Form',
    'description', 'The call-off request is initiated through the Shift Swap Google Form, which lets the tutor supervisor team know they need to find coverage for that session.',
    'picture', '/blueprint-images/shared/front-stage-tech/google-form-logo.png'
  )
)
where id = 'a0000000-0000-4000-8000-000000150106';

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
where id = 'a0000000-0000-4000-8000-000000150108';

update public.cells
set description =
  'The Dev Team stores tutor schedules in a Google Spreadsheet for the tutor supervisor team to review.'
where id = 'a0000000-0000-4000-8000-000000150109';

update public.cells
set links = jsonb_build_array(
  jsonb_build_object(
    'type', 'tech_description',
    'label', 'Slack',
    'description', 'The fill-in request is shared in the #shift-swap Slack channel so available tutors can see it.',
    'picture', '/blueprint-images/shared/front-stage-tech/slack-logo.png'
  ),
  jsonb_build_object(
    'type', 'tech_description',
    'label', 'Email',
    'description', 'The tutor supervisor team can also send the fill-in request to tutors by email.',
    'picture', '/blueprint-images/shared/front-stage-tech/email-logo.png'
  )
)
where id = 'a0000000-0000-4000-8000-000000150206';

update public.cells
set links = jsonb_build_array(
  jsonb_build_object(
    'type', 'tech_description',
    'label', 'Slack',
    'description', 'The tutor confirms or denies the fill-in request through Slack.',
    'picture', '/blueprint-images/shared/front-stage-tech/slack-logo.png'
  ),
  jsonb_build_object(
    'type', 'tech_description',
    'label', 'Email',
    'description', 'The tutor can also confirm or deny the fill-in request by email.',
    'picture', '/blueprint-images/shared/front-stage-tech/email-logo.png'
  )
)
where id = 'a0000000-0000-4000-8000-000000150306';

update public.cells
set links = jsonb_build_array(
  jsonb_build_object(
    'type', 'tech_description',
    'label', 'PLUS App',
    'description', 'The tutor supervisor team adds that tutor to the session in the PLUS app. Once added, the tutor accesses the session details in the PLUS app.',
    'picture', '/blueprint-images/fill-in-request/happy-path/plus-app/step-04-confirm-fill-in.png',
    'url', 'https://www.figma.com/design/W0qzhXWxFsMwSJzkdV2yal/Design-System---Web-App-Specs?node-id=2942-401328&t=NRQGuswXJmExM6wI-1'
  )
)
where id = 'a0000000-0000-4000-8000-000000150406';

update public.cells
set description =
  'The Dev Team builds the PLUS app features for assigning tutors to sessions and accessing session details, and the Design Team creates the screens and flows for that experience.'
where id = 'a0000000-0000-4000-8000-000000150409';

update public.cells
set picture = '/blueprint-images/fill-in-request/happy-path/regular-tutor/step-02-receives-request.png'
where id = 'a0000000-0000-4000-8000-000000150203';

update public.cells
set picture = '/blueprint-images/fill-in-request/happy-path/regular-tutor/step-03-confirms-or-denies.png'
where id = 'a0000000-0000-4000-8000-000000150303';

update public.cells
set picture = '/blueprint-images/fill-in-request/happy-path/regular-tutor/step-04-accesses-session.png'
where id = 'a0000000-0000-4000-8000-000000150403';
