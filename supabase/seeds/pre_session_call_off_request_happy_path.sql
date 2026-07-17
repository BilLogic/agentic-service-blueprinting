-- Pre-session → Call-off Request scenario — Happy Path
-- Stable keys map to fixed UUIDs in src/data/callOffRequestHappyPathFallback.ts

insert into public.paths (id, service_scenario_id, name, description, path_type)
values (
  'a0000000-0000-4000-8000-000000000808',
  'a0000000-0000-4000-8000-000000000128',
  'Happy Path',
  'Tutor calls off shift for upcoming session.',
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
  where path_id = 'a0000000-0000-4000-8000-000000000808'
);

delete from public.cells
where path_id = 'a0000000-0000-4000-8000-000000000808';

delete from public.layers
where path_id = 'a0000000-0000-4000-8000-000000000808';

insert into public.layers (id, path_id, name, row_position)
values
  (
    'a0000000-0000-4000-8000-000000000971',
    'a0000000-0000-4000-8000-000000000808',
    'Visual',
    0
  ),
  (
    'a0000000-0000-4000-8000-000000000972',
    'a0000000-0000-4000-8000-000000000808',
    'Regular Tutor',
    1
  ),
  (
    'a0000000-0000-4000-8000-000000000974',
    'a0000000-0000-4000-8000-000000000808',
    'Front Stage Tech',
    2
  ),
  (
    'a0000000-0000-4000-8000-000000000973',
    'a0000000-0000-4000-8000-000000000808',
    'Front Stage Actions',
    3
  ),
  (
    'a0000000-0000-4000-8000-000000000976',
    'a0000000-0000-4000-8000-000000000808',
    'Back Stage Tech',
    4
  ),
  (
    'a0000000-0000-4000-8000-000000000975',
    'a0000000-0000-4000-8000-000000000808',
    'Back Stage Actions',
    5
  ),
  (
    'a0000000-0000-4000-8000-000000000977',
    'a0000000-0000-4000-8000-000000000808',
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
    'a0000000-0000-4000-8000-000000000940',
    'a0000000-0000-4000-8000-000000000128',
    'Initial need'
  ),
  (
    'a0000000-0000-4000-8000-000000000941',
    'a0000000-0000-4000-8000-000000000128',
    'Early call-off'
  ),
  (
    'a0000000-0000-4000-8000-000000000942',
    'a0000000-0000-4000-8000-000000000128',
    'Late call-off'
  ),
  (
    'a0000000-0000-4000-8000-000000000943',
    'a0000000-0000-4000-8000-000000000128',
    'Peer support'
  ),
  (
    'a0000000-0000-4000-8000-000000000944',
    'a0000000-0000-4000-8000-000000000128',
    'Internal decision'
  ),
  (
    'a0000000-0000-4000-8000-000000000945',
    'a0000000-0000-4000-8000-000000000128',
    'Final notification'
  )
on conflict (id) do update set
  name = excluded.name,
  service_scenario_id = excluded.service_scenario_id;

delete from public.path_steps
where path_id = 'a0000000-0000-4000-8000-000000000808';

insert into public.path_steps (path_id, step_id, column_position)
values
  ('a0000000-0000-4000-8000-000000000808', 'a0000000-0000-4000-8000-000000000940', 1),
  ('a0000000-0000-4000-8000-000000000808', 'a0000000-0000-4000-8000-000000000941', 2),
  ('a0000000-0000-4000-8000-000000000808', 'a0000000-0000-4000-8000-000000000942', 3),
  ('a0000000-0000-4000-8000-000000000808', 'a0000000-0000-4000-8000-000000000943', 4),
  ('a0000000-0000-4000-8000-000000000808', 'a0000000-0000-4000-8000-000000000944', 5),
  ('a0000000-0000-4000-8000-000000000808', 'a0000000-0000-4000-8000-000000000945', 6)
on conflict (path_id, step_id) do update set
  column_position = excluded.column_position;

insert into public.cells (id, path_id, layer_id, step_id, content)
values
  ('a0000000-0000-4000-8000-000000170110', 'a0000000-0000-4000-8000-000000000808', 'a0000000-0000-4000-8000-000000000971', 'a0000000-0000-4000-8000-000000000940', ''),
  ('a0000000-0000-4000-8000-000000170103', 'a0000000-0000-4000-8000-000000000808', 'a0000000-0000-4000-8000-000000000972', 'a0000000-0000-4000-8000-000000000940', 'Tutor needs to call off.'),

  ('a0000000-0000-4000-8000-000000170210', 'a0000000-0000-4000-8000-000000000808', 'a0000000-0000-4000-8000-000000000971', 'a0000000-0000-4000-8000-000000000941', ''),
  ('a0000000-0000-4000-8000-000000170203', 'a0000000-0000-4000-8000-000000000808', 'a0000000-0000-4000-8000-000000000972', 'a0000000-0000-4000-8000-000000000941', 'If it''s 12 or more hours before session, tutor complete shift swap form.'),
  ('a0000000-0000-4000-8000-000000170206', 'a0000000-0000-4000-8000-000000000808', 'a0000000-0000-4000-8000-000000000974', 'a0000000-0000-4000-8000-000000000941', 'Shift Swap Google Form'),
  ('a0000000-0000-4000-8000-000000170207', 'a0000000-0000-4000-8000-000000000808', 'a0000000-0000-4000-8000-000000000975', 'a0000000-0000-4000-8000-000000000941', 'Tutor supervisor team reviews Google Form request for shift swap.'),

  ('a0000000-0000-4000-8000-000000170310', 'a0000000-0000-4000-8000-000000000808', 'a0000000-0000-4000-8000-000000000971', 'a0000000-0000-4000-8000-000000000942', ''),
  ('a0000000-0000-4000-8000-000000170303', 'a0000000-0000-4000-8000-000000000808', 'a0000000-0000-4000-8000-000000000972', 'a0000000-0000-4000-8000-000000000942', 'If it is less than 12 hours before session, tutor emails supervisor.'),
  ('a0000000-0000-4000-8000-000000170304', 'a0000000-0000-4000-8000-000000000808', 'a0000000-0000-4000-8000-000000000973', 'a0000000-0000-4000-8000-000000000942', 'Tutor supervisor receives email request for shift swap.'),
  ('a0000000-0000-4000-8000-000000170306', 'a0000000-0000-4000-8000-000000000808', 'a0000000-0000-4000-8000-000000000974', 'a0000000-0000-4000-8000-000000000942', 'Email'),

  ('a0000000-0000-4000-8000-000000170410', 'a0000000-0000-4000-8000-000000000808', 'a0000000-0000-4000-8000-000000000971', 'a0000000-0000-4000-8000-000000000943', ''),
  ('a0000000-0000-4000-8000-000000170403', 'a0000000-0000-4000-8000-000000000808', 'a0000000-0000-4000-8000-000000000972', 'a0000000-0000-4000-8000-000000000943', 'Tutor send message in #shift-swap to see if anyone can cover.'),
  ('a0000000-0000-4000-8000-000000170404', 'a0000000-0000-4000-8000-000000000808', 'a0000000-0000-4000-8000-000000000973', 'a0000000-0000-4000-8000-000000000943', 'Other tutors in #shift-swap channel may or may not respond.'),
  ('a0000000-0000-4000-8000-000000170406', 'a0000000-0000-4000-8000-000000000808', 'a0000000-0000-4000-8000-000000000974', 'a0000000-0000-4000-8000-000000000943', 'Slack'),

  ('a0000000-0000-4000-8000-000000170510', 'a0000000-0000-4000-8000-000000000808', 'a0000000-0000-4000-8000-000000000971', 'a0000000-0000-4000-8000-000000000944', ''),
  ('a0000000-0000-4000-8000-000000170507', 'a0000000-0000-4000-8000-000000000808', 'a0000000-0000-4000-8000-000000000975', 'a0000000-0000-4000-8000-000000000944', 'Tutor supervisor team may or may not find replacement for tutor and determines if this counts as excused or unexcused decision.'),
  ('a0000000-0000-4000-8000-000000170508', 'a0000000-0000-4000-8000-000000000808', 'a0000000-0000-4000-8000-000000000976', 'a0000000-0000-4000-8000-000000000944', 'Google Spreadsheet'),
  ('a0000000-0000-4000-8000-000000170509', 'a0000000-0000-4000-8000-000000000808', 'a0000000-0000-4000-8000-000000000977', 'a0000000-0000-4000-8000-000000000944', 'Dev Team'),

  ('a0000000-0000-4000-8000-000000170610', 'a0000000-0000-4000-8000-000000000808', 'a0000000-0000-4000-8000-000000000971', 'a0000000-0000-4000-8000-000000000945', ''),
  ('a0000000-0000-4000-8000-000000170603', 'a0000000-0000-4000-8000-000000000808', 'a0000000-0000-4000-8000-000000000972', 'a0000000-0000-4000-8000-000000000945', 'Tutor receives excused or unexcused decision.'),
  ('a0000000-0000-4000-8000-000000170604', 'a0000000-0000-4000-8000-000000000808', 'a0000000-0000-4000-8000-000000000973', 'a0000000-0000-4000-8000-000000000945', 'Tutor supervisor team sends excuse decision.'),
  ('a0000000-0000-4000-8000-000000170606', 'a0000000-0000-4000-8000-000000000808', 'a0000000-0000-4000-8000-000000000974', 'a0000000-0000-4000-8000-000000000945', 'Email')
on conflict (id) do update set
  path_id = excluded.path_id,
  layer_id = excluded.layer_id,
  step_id = excluded.step_id,
  content = excluded.content;

insert into public.cell_triggers (id, source_cell_id, target_cell_id)
values
  ('a0000000-0000-4000-8000-000000095001', 'a0000000-0000-4000-8000-000000170103', 'a0000000-0000-4000-8000-000000170203'),
  ('a0000000-0000-4000-8000-000000095003', 'a0000000-0000-4000-8000-000000170103', 'a0000000-0000-4000-8000-000000170303'),
  ('a0000000-0000-4000-8000-000000095002', 'a0000000-0000-4000-8000-000000170203', 'a0000000-0000-4000-8000-000000170206'),
  ('a0000000-0000-4000-8000-000000095004', 'a0000000-0000-4000-8000-000000170206', 'a0000000-0000-4000-8000-000000170207'),
  ('a0000000-0000-4000-8000-000000095011', 'a0000000-0000-4000-8000-000000170207', 'a0000000-0000-4000-8000-000000170507'),
  ('a0000000-0000-4000-8000-000000095005', 'a0000000-0000-4000-8000-000000170303', 'a0000000-0000-4000-8000-000000170306'),
  ('a0000000-0000-4000-8000-000000095010', 'a0000000-0000-4000-8000-000000170306', 'a0000000-0000-4000-8000-000000170304'),
  ('a0000000-0000-4000-8000-000000095012', 'a0000000-0000-4000-8000-000000170304', 'a0000000-0000-4000-8000-000000170507'),
  ('a0000000-0000-4000-8000-000000095006', 'a0000000-0000-4000-8000-000000170303', 'a0000000-0000-4000-8000-000000170403'),
  ('a0000000-0000-4000-8000-000000095007', 'a0000000-0000-4000-8000-000000170403', 'a0000000-0000-4000-8000-000000170406'),
  ('a0000000-0000-4000-8000-000000095013', 'a0000000-0000-4000-8000-000000170404', 'a0000000-0000-4000-8000-000000170406'),
  ('a0000000-0000-4000-8000-000000095014', 'a0000000-0000-4000-8000-000000170507', 'a0000000-0000-4000-8000-000000170508'),
  ('a0000000-0000-4000-8000-000000095008', 'a0000000-0000-4000-8000-000000170507', 'a0000000-0000-4000-8000-000000170604'),
  ('a0000000-0000-4000-8000-000000095015', 'a0000000-0000-4000-8000-000000170604', 'a0000000-0000-4000-8000-000000170606'),
  ('a0000000-0000-4000-8000-000000095016', 'a0000000-0000-4000-8000-000000170603', 'a0000000-0000-4000-8000-000000170606')
on conflict (id) do update set
  source_cell_id = excluded.source_cell_id,
  target_cell_id = excluded.target_cell_id;

update public.cells
set links = jsonb_build_array(
  jsonb_build_object(
    'type', 'tech_description',
    'label', 'Shift Swap Google Form',
    'description', 'The tutor initiates a call off request via the Shift Swap Google Form when there is more than 12 hours before the session.',
    'picture', '/blueprint-images/shared/front-stage-tech/google-form-logo.png'
  )
)
where id = 'a0000000-0000-4000-8000-000000170206';

update public.cells
set links = jsonb_build_array(
  jsonb_build_object(
    'type', 'tech_description',
    'label', 'Email',
    'description', 'The tutor requests off via email when there is less than 12 hours before the session.',
    'picture', '/blueprint-images/shared/front-stage-tech/email-logo.png'
  )
)
where id = 'a0000000-0000-4000-8000-000000170306';

update public.cells
set links = jsonb_build_array(
  jsonb_build_object(
    'type', 'tech_description',
    'label', 'Slack',
    'description', 'The tutor posts in the #shift-swap Slack channel to ask if another tutor can cover their session.',
    'picture', '/blueprint-images/shared/front-stage-tech/slack-logo.png'
  )
)
where id = 'a0000000-0000-4000-8000-000000170406';

update public.cells
set links = jsonb_build_array(
  jsonb_build_object(
    'type', 'tech_description',
    'label', 'Google Spreadsheet',
    'description', 'The tutor supervisor team reviews tutor availabilities in a Google Spreadsheet to identify who can fill in.',
    'picture', '/blueprint-images/shared/back-stage-tech/google-sheets-logo.png'
  )
)
where id = 'a0000000-0000-4000-8000-000000170508';

update public.cells
set description =
  'The Dev Team stores tutor schedules in a Google Spreadsheet for the tutor supervisor team to review.'
where id = 'a0000000-0000-4000-8000-000000170509';

update public.cells
set links = jsonb_build_array(
  jsonb_build_object(
    'type', 'tech_description',
    'label', 'Email',
    'description', 'The tutor supervisor team sends official excused/unexcused decision via Email to the tutor.',
    'picture', '/blueprint-images/shared/front-stage-tech/email-logo.png'
  )
)
where id = 'a0000000-0000-4000-8000-000000170606';

update public.cells
set picture = '/blueprint-images/call-off-request/happy-path/regular-tutor/step-01-needs-to-call-off.png'
where id = 'a0000000-0000-4000-8000-000000170103';

update public.cells
set picture = '/blueprint-images/call-off-request/happy-path/regular-tutor/step-02-shift-swap-form.png'
where id = 'a0000000-0000-4000-8000-000000170203';

update public.cells
set picture = '/blueprint-images/call-off-request/happy-path/regular-tutor/step-03-emails-supervisor.png'
where id = 'a0000000-0000-4000-8000-000000170303';

update public.cells
set picture = '/blueprint-images/call-off-request/happy-path/regular-tutor/step-04-shift-swap-message.png'
where id = 'a0000000-0000-4000-8000-000000170403';

update public.cells
set picture = '/blueprint-images/call-off-request/happy-path/regular-tutor/step-06-receives-decision.png'
where id = 'a0000000-0000-4000-8000-000000170603';
