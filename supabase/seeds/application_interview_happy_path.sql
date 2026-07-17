-- Application → Interview scenario — Happy Path
-- Stable keys map to fixed UUIDs in src/data/applicationInterviewHappyPathFallback.ts

insert into public.paths (id, service_scenario_id, name, description, path_type)
values (
  'a0000000-0000-4000-8000-000000000702',
  'a0000000-0000-4000-8000-000000000122',
  'Happy Path',
  'Tutor applies, interviews with the team, and receives an offer decision.',
  'happy'
)
on conflict (id) do update set
  service_scenario_id = excluded.service_scenario_id,
  name = excluded.name,
  description = excluded.description,
  path_type = excluded.path_type;

insert into public.layers (id, path_id, name, row_position)
values
  (
    'a0000000-0000-4000-8000-000000000810',
    'a0000000-0000-4000-8000-000000000702',
    'Visual',
    0
  ),
  (
    'a0000000-0000-4000-8000-000000000803',
    'a0000000-0000-4000-8000-000000000702',
    'Regular Tutor',
    1
  ),
  (
    'a0000000-0000-4000-8000-000000000806',
    'a0000000-0000-4000-8000-000000000702',
    'Front Stage Tech',
    2
  ),
  (
    'a0000000-0000-4000-8000-000000000804',
    'a0000000-0000-4000-8000-000000000702',
    'Front Stage Actions',
    3
  ),
  (
    'a0000000-0000-4000-8000-000000000808',
    'a0000000-0000-4000-8000-000000000702',
    'Back Stage Tech',
    4
  ),
  (
    'a0000000-0000-4000-8000-000000000807',
    'a0000000-0000-4000-8000-000000000702',
    'Back Stage Actions',
    5
  ),
  (
    'a0000000-0000-4000-8000-000000000809',
    'a0000000-0000-4000-8000-000000000702',
    'Support Actions',
    6
  )
on conflict (id) do update set
  name = excluded.name,
  row_position = excluded.row_position;

insert into public.steps (id, service_scenario_id, name)
values
  (
    'a0000000-0000-4000-8000-000000000731',
    'a0000000-0000-4000-8000-000000000122',
    'Applies'
  ),
  (
    'a0000000-0000-4000-8000-000000000732',
    'a0000000-0000-4000-8000-000000000122',
    'Receives email invitation for group interview'
  ),
  (
    'a0000000-0000-4000-8000-000000000733',
    'a0000000-0000-4000-8000-000000000122',
    'Group interviews'
  ),
  (
    'a0000000-0000-4000-8000-000000000734',
    'a0000000-0000-4000-8000-000000000122',
    'Waits for offer decision'
  ),
  (
    'a0000000-0000-4000-8000-000000000735',
    'a0000000-0000-4000-8000-000000000122',
    'Receives offer decision'
  )
on conflict (id) do update set
  name = excluded.name,
  service_scenario_id = excluded.service_scenario_id;

insert into public.path_steps (path_id, step_id, column_position)
values
  ('a0000000-0000-4000-8000-000000000702', 'a0000000-0000-4000-8000-000000000731', 1),
  ('a0000000-0000-4000-8000-000000000702', 'a0000000-0000-4000-8000-000000000732', 2),
  ('a0000000-0000-4000-8000-000000000702', 'a0000000-0000-4000-8000-000000000733', 3),
  ('a0000000-0000-4000-8000-000000000702', 'a0000000-0000-4000-8000-000000000734', 4),
  ('a0000000-0000-4000-8000-000000000702', 'a0000000-0000-4000-8000-000000000735', 5)
on conflict (path_id, step_id) do update set
  column_position = excluded.column_position;

insert into public.cells (id, path_id, layer_id, step_id, content)
values
  -- Visual row
  ('a0000000-0000-4000-8000-000000090110', 'a0000000-0000-4000-8000-000000000702', 'a0000000-0000-4000-8000-000000000810', 'a0000000-0000-4000-8000-000000000731', ''),
  ('a0000000-0000-4000-8000-000000090210', 'a0000000-0000-4000-8000-000000000702', 'a0000000-0000-4000-8000-000000000810', 'a0000000-0000-4000-8000-000000000732', ''),
  ('a0000000-0000-4000-8000-000000090310', 'a0000000-0000-4000-8000-000000000702', 'a0000000-0000-4000-8000-000000000810', 'a0000000-0000-4000-8000-000000000733', ''),
  ('a0000000-0000-4000-8000-000000090410', 'a0000000-0000-4000-8000-000000000702', 'a0000000-0000-4000-8000-000000000810', 'a0000000-0000-4000-8000-000000000734', ''),
  ('a0000000-0000-4000-8000-000000090510', 'a0000000-0000-4000-8000-000000000702', 'a0000000-0000-4000-8000-000000000810', 'a0000000-0000-4000-8000-000000000735', ''),
  -- Step 1 — Applies
  ('a0000000-0000-4000-8000-000000090103', 'a0000000-0000-4000-8000-000000000702', 'a0000000-0000-4000-8000-000000000803', 'a0000000-0000-4000-8000-000000000731', 'Applies.'),
  ('a0000000-0000-4000-8000-000000090106', 'a0000000-0000-4000-8000-000000000702', 'a0000000-0000-4000-8000-000000000806', 'a0000000-0000-4000-8000-000000000731', 'Google Form Application'),
  ('a0000000-0000-4000-8000-000000090107', 'a0000000-0000-4000-8000-000000000702', 'a0000000-0000-4000-8000-000000000807', 'a0000000-0000-4000-8000-000000000731', 'Tutor supervisor team creates and manages application form.'),
  -- Step 2 — Review & invitation
  ('a0000000-0000-4000-8000-000000090203', 'a0000000-0000-4000-8000-000000000702', 'a0000000-0000-4000-8000-000000000803', 'a0000000-0000-4000-8000-000000000732', 'Receives email invitation for group interview.'),
  ('a0000000-0000-4000-8000-000000090204', 'a0000000-0000-4000-8000-000000000702', 'a0000000-0000-4000-8000-000000000804', 'a0000000-0000-4000-8000-000000000732', 'Tutor supervisor team invites applicant for group interview.'),
  ('a0000000-0000-4000-8000-000000090206', 'a0000000-0000-4000-8000-000000000702', 'a0000000-0000-4000-8000-000000000806', 'a0000000-0000-4000-8000-000000000732', 'Email'),
  ('a0000000-0000-4000-8000-000000090207', 'a0000000-0000-4000-8000-000000000702', 'a0000000-0000-4000-8000-000000000807', 'a0000000-0000-4000-8000-000000000732', 'Tutor supervisor team receives and reviews application.'),
  -- Step 3 — Group interview
  ('a0000000-0000-4000-8000-000000090303', 'a0000000-0000-4000-8000-000000000702', 'a0000000-0000-4000-8000-000000000803', 'a0000000-0000-4000-8000-000000000733', 'Group interviews.'),
  ('a0000000-0000-4000-8000-000000090304', 'a0000000-0000-4000-8000-000000000702', 'a0000000-0000-4000-8000-000000000804', 'a0000000-0000-4000-8000-000000000733', 'Tutor supervisor team facilitates group interview.'),
  ('a0000000-0000-4000-8000-000000090306', 'a0000000-0000-4000-8000-000000000702', 'a0000000-0000-4000-8000-000000000806', 'a0000000-0000-4000-8000-000000000733', 'Zoom'),
  ('a0000000-0000-4000-8000-000000090307', 'a0000000-0000-4000-8000-000000000702', 'a0000000-0000-4000-8000-000000000807', 'a0000000-0000-4000-8000-000000000733', 'Tutor supervisor team takes notes for group interview.'),
  ('a0000000-0000-4000-8000-000000090308', 'a0000000-0000-4000-8000-000000000702', 'a0000000-0000-4000-8000-000000000808', 'a0000000-0000-4000-8000-000000000733', 'Notion'),
  ('a0000000-0000-4000-8000-000000090309', 'a0000000-0000-4000-8000-000000000702', 'a0000000-0000-4000-8000-000000000809', 'a0000000-0000-4000-8000-000000000733', 'Zoom Recording'),
  -- Step 4 — Decision processing
  ('a0000000-0000-4000-8000-000000090403', 'a0000000-0000-4000-8000-000000000702', 'a0000000-0000-4000-8000-000000000803', 'a0000000-0000-4000-8000-000000000734', 'Waits for offer decision.'),
  ('a0000000-0000-4000-8000-000000090407', 'a0000000-0000-4000-8000-000000000702', 'a0000000-0000-4000-8000-000000000807', 'a0000000-0000-4000-8000-000000000734', 'Tutor supervisor team reviews interview data.'),
  ('a0000000-0000-4000-8000-000000090408', 'a0000000-0000-4000-8000-000000000702', 'a0000000-0000-4000-8000-000000000808', 'a0000000-0000-4000-8000-000000000734', E'Zoom\nNotion'),
  -- Step 5 — Final decision
  ('a0000000-0000-4000-8000-000000090503', 'a0000000-0000-4000-8000-000000000702', 'a0000000-0000-4000-8000-000000000803', 'a0000000-0000-4000-8000-000000000735', 'Receives offer decision.'),
  ('a0000000-0000-4000-8000-000000090504', 'a0000000-0000-4000-8000-000000000702', 'a0000000-0000-4000-8000-000000000804', 'a0000000-0000-4000-8000-000000000735', 'Sends offer decision and next steps (if applicable).'),
  ('a0000000-0000-4000-8000-000000090506', 'a0000000-0000-4000-8000-000000000702', 'a0000000-0000-4000-8000-000000000806', 'a0000000-0000-4000-8000-000000000735', 'Email')
on conflict (id) do update set
  content = excluded.content,
  layer_id = excluded.layer_id,
  step_id = excluded.step_id;

delete from public.cell_triggers
where id in (
  'a0000000-0000-4000-8000-000000098021',
  'a0000000-0000-4000-8000-000000098022'
);

delete from public.cells
where id = 'a0000000-0000-4000-8000-000000090104';

insert into public.cell_triggers (id, source_cell_id, target_cell_id)
values
  ('a0000000-0000-4000-8000-000000098001', 'a0000000-0000-4000-8000-000000090107', 'a0000000-0000-4000-8000-000000090106'),
  ('a0000000-0000-4000-8000-000000098002', 'a0000000-0000-4000-8000-000000090107', 'a0000000-0000-4000-8000-000000090207'),
  ('a0000000-0000-4000-8000-000000098005', 'a0000000-0000-4000-8000-000000090103', 'a0000000-0000-4000-8000-000000090106'),
  ('a0000000-0000-4000-8000-000000098003', 'a0000000-0000-4000-8000-000000090207', 'a0000000-0000-4000-8000-000000090204'),
  ('a0000000-0000-4000-8000-000000098004', 'a0000000-0000-4000-8000-000000090204', 'a0000000-0000-4000-8000-000000090206'),
  ('a0000000-0000-4000-8000-000000098006', 'a0000000-0000-4000-8000-000000090206', 'a0000000-0000-4000-8000-000000090203'),
  ('a0000000-0000-4000-8000-000000098011', 'a0000000-0000-4000-8000-000000090103', 'a0000000-0000-4000-8000-000000090203'),
  ('a0000000-0000-4000-8000-000000098012', 'a0000000-0000-4000-8000-000000090203', 'a0000000-0000-4000-8000-000000090303'),
  ('a0000000-0000-4000-8000-000000098013', 'a0000000-0000-4000-8000-000000090303', 'a0000000-0000-4000-8000-000000090403'),
  ('a0000000-0000-4000-8000-000000098014', 'a0000000-0000-4000-8000-000000090403', 'a0000000-0000-4000-8000-000000090503'),
  ('a0000000-0000-4000-8000-000000098023', 'a0000000-0000-4000-8000-000000090304', 'a0000000-0000-4000-8000-000000090306'),
  ('a0000000-0000-4000-8000-000000098024', 'a0000000-0000-4000-8000-000000090303', 'a0000000-0000-4000-8000-000000090306'),
  ('a0000000-0000-4000-8000-000000098025', 'a0000000-0000-4000-8000-000000090307', 'a0000000-0000-4000-8000-000000090308'),
  ('a0000000-0000-4000-8000-000000098031', 'a0000000-0000-4000-8000-000000090307', 'a0000000-0000-4000-8000-000000090407'),
  ('a0000000-0000-4000-8000-000000098032', 'a0000000-0000-4000-8000-000000090407', 'a0000000-0000-4000-8000-000000090408'),
  ('a0000000-0000-4000-8000-000000098041', 'a0000000-0000-4000-8000-000000090407', 'a0000000-0000-4000-8000-000000090504'),
  ('a0000000-0000-4000-8000-000000098042', 'a0000000-0000-4000-8000-000000090504', 'a0000000-0000-4000-8000-000000090506'),
  ('a0000000-0000-4000-8000-000000098043', 'a0000000-0000-4000-8000-000000090506', 'a0000000-0000-4000-8000-000000090503')
on conflict (id) do update set
  source_cell_id = excluded.source_cell_id,
  target_cell_id = excluded.target_cell_id;

update public.cells
set picture = '/blueprint-images/application-interview/happy-path/regular-tutor/step-01-applies.png'
where id = 'a0000000-0000-4000-8000-000000090103';

update public.cells
set picture = '/blueprint-images/application-interview/happy-path/regular-tutor/step-02-group-interview-invitation.png'
where id = 'a0000000-0000-4000-8000-000000090203';

update public.cells
set picture = '/blueprint-images/application-interview/happy-path/regular-tutor/step-03-group-interviews.png'
where id = 'a0000000-0000-4000-8000-000000090303';

update public.cells
set picture = '/blueprint-images/application-interview/happy-path/regular-tutor/step-04-waits-for-offer-decision.png'
where id = 'a0000000-0000-4000-8000-000000090403';

update public.cells
set picture = '/blueprint-images/application-interview/happy-path/regular-tutor/step-05-receives-offer-decision.png'
where id = 'a0000000-0000-4000-8000-000000090503';

update public.cells
set picture = '/blueprint-images/shared/front-stage-tech/google-form-logo.png'
where id = 'a0000000-0000-4000-8000-000000090106';

update public.cells
set picture = '/blueprint-images/goal-setting/shared/front-stage-tech/zoom-logo.png'
where id = 'a0000000-0000-4000-8000-000000090306';

update public.cells
set picture = '/blueprint-images/shared/back-stage-tech/notion-logo.png'
where id = 'a0000000-0000-4000-8000-000000090308';

update public.cells
set picture = '/blueprint-images/shared/front-stage-tech/email-logo.png'
where id in (
  'a0000000-0000-4000-8000-000000090206',
  'a0000000-0000-4000-8000-000000090506'
);

update public.cells
set links = jsonb_build_array(
  jsonb_build_object(
    'type', 'tech_description',
    'label', 'Google Form Application',
    'description', 'The applicant completes and submits the tutor application through the Google Form created and managed by the tutor supervisor team.',
    'picture', '/blueprint-images/shared/front-stage-tech/google-form-logo.png'
  )
)
where id = 'a0000000-0000-4000-8000-000000090106';

update public.cells
set links = jsonb_build_array(
  jsonb_build_object(
    'type', 'tech_description',
    'label', 'Email',
    'description', 'Email is used as the mode of communication to set up interview date, time, and joining details.',
    'picture', '/blueprint-images/shared/front-stage-tech/email-logo.png'
  )
)
where id = 'a0000000-0000-4000-8000-000000090206';

update public.cells
set links = jsonb_build_array(
  jsonb_build_object(
    'type', 'tech_description',
    'label', 'Zoom',
    'description', 'The applicant and tutor supervisor team join a Zoom meeting for the group interview.',
    'picture', '/blueprint-images/goal-setting/shared/front-stage-tech/zoom-logo.png'
  )
)
where id = 'a0000000-0000-4000-8000-000000090306';

update public.cells
set links = jsonb_build_array(
  jsonb_build_object(
    'type', 'tech_description',
    'label', 'Notion',
    'description', 'The tutor supervisor team captures interview notes in Notion during the group interview.',
    'picture', '/blueprint-images/shared/back-stage-tech/notion-logo.png'
  )
)
where id = 'a0000000-0000-4000-8000-000000090308';

update public.cells
set links = jsonb_build_array(
  jsonb_build_object(
    'type', 'tech_description',
    'label', 'Zoom',
    'description', 'The tutor supervisor team may review the group interview Zoom recording as part of the offer decision process.',
    'picture', '/blueprint-images/goal-setting/shared/front-stage-tech/zoom-logo.png'
  ),
  jsonb_build_object(
    'type', 'tech_description',
    'label', 'Notion',
    'description', 'The tutor supervisor team may review interview notes in Notion as part of the offer decision process.',
    'picture', '/blueprint-images/shared/back-stage-tech/notion-logo.png'
  )
)
where id = 'a0000000-0000-4000-8000-000000090408';

update public.cells
set links = jsonb_build_array(
  jsonb_build_object(
    'type', 'tech_description',
    'label', 'Email',
    'description', 'The applicant receives an email from the tutor supervisor team with their offer decision and next steps, if applicable.',
    'picture', '/blueprint-images/shared/front-stage-tech/email-logo.png'
  )
)
where id = 'a0000000-0000-4000-8000-000000090506';

update public.cells
set links = jsonb_build_array(
  jsonb_build_object(
    'type', 'tech_description',
    'label', 'Zoom Recording',
    'description', 'Zoom recording captures the group interview so the tutor supervisor team can review it during the offer decision process.'
  )
)
where id = 'a0000000-0000-4000-8000-000000090309';
