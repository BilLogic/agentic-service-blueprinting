-- Onboarding → Tech Setup scenario — Happy Path
-- Stable keys map to fixed UUIDs in src/data/techSetupHappyPathFallback.ts

insert into public.paths (id, service_scenario_id, name, description, path_type)
values (
  'a0000000-0000-4000-8000-000000000800',
  'a0000000-0000-4000-8000-000000000120',
  'Happy Path',
  'Tutor sets up technology and obtains clearances.',
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
  where path_id = 'a0000000-0000-4000-8000-000000000800'
);

delete from public.cells
where path_id = 'a0000000-0000-4000-8000-000000000800';

delete from public.layers
where path_id = 'a0000000-0000-4000-8000-000000000800';

insert into public.layers (id, path_id, name, row_position)
values
  (
    'a0000000-0000-4000-8000-000000000818',
    'a0000000-0000-4000-8000-000000000800',
    'Visual',
    0
  ),
  (
    'a0000000-0000-4000-8000-000000000831',
    'a0000000-0000-4000-8000-000000000800',
    'Regular Tutor',
    1
  ),
  (
    'a0000000-0000-4000-8000-000000000833',
    'a0000000-0000-4000-8000-000000000800',
    'Front Stage Tech',
    2
  ),
  (
    'a0000000-0000-4000-8000-000000000832',
    'a0000000-0000-4000-8000-000000000800',
    'Front Stage Actions',
    3
  ),
  (
    'a0000000-0000-4000-8000-000000000835',
    'a0000000-0000-4000-8000-000000000800',
    'Back Stage Tech',
    4
  ),
  (
    'a0000000-0000-4000-8000-000000000834',
    'a0000000-0000-4000-8000-000000000800',
    'Back Stage Actions',
    5
  ),
  (
    'a0000000-0000-4000-8000-000000000836',
    'a0000000-0000-4000-8000-000000000800',
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
    'a0000000-0000-4000-8000-000000000821',
    'a0000000-0000-4000-8000-000000000120',
    'Clearance email'
  ),
  (
    'a0000000-0000-4000-8000-000000000822',
    'a0000000-0000-4000-8000-000000000120',
    'Obtain clearances'
  ),
  (
    'a0000000-0000-4000-8000-000000000823',
    'a0000000-0000-4000-8000-000000000120',
    'Send clearances'
  ),
  (
    'a0000000-0000-4000-8000-000000000826',
    'a0000000-0000-4000-8000-000000000120',
    'I-9 meeting'
  ),
  (
    'a0000000-0000-4000-8000-000000000827',
    'a0000000-0000-4000-8000-000000000120',
    'Attend I-9 meeting'
  ),
  (
    'a0000000-0000-4000-8000-000000000824',
    'a0000000-0000-4000-8000-000000000120',
    'Payroll setup'
  ),
  (
    'a0000000-0000-4000-8000-000000000825',
    'a0000000-0000-4000-8000-000000000120',
    'Join Slack'
  ),
  (
    'a0000000-0000-4000-8000-000000000829',
    'a0000000-0000-4000-8000-000000000120',
    'PLUS app login'
  )
on conflict (id) do update set
  name = excluded.name,
  service_scenario_id = excluded.service_scenario_id;

insert into public.path_steps (path_id, step_id, column_position)
values
  ('a0000000-0000-4000-8000-000000000800', 'a0000000-0000-4000-8000-000000000821', 1),
  ('a0000000-0000-4000-8000-000000000800', 'a0000000-0000-4000-8000-000000000822', 2),
  ('a0000000-0000-4000-8000-000000000800', 'a0000000-0000-4000-8000-000000000823', 3),
  ('a0000000-0000-4000-8000-000000000800', 'a0000000-0000-4000-8000-000000000826', 4),
  ('a0000000-0000-4000-8000-000000000800', 'a0000000-0000-4000-8000-000000000827', 5),
  ('a0000000-0000-4000-8000-000000000800', 'a0000000-0000-4000-8000-000000000824', 6),
  ('a0000000-0000-4000-8000-000000000800', 'a0000000-0000-4000-8000-000000000825', 7),
  ('a0000000-0000-4000-8000-000000000800', 'a0000000-0000-4000-8000-000000000829', 8)
on conflict (path_id, step_id) do update set
  column_position = excluded.column_position;

insert into public.cells (id, path_id, layer_id, step_id, content)
values
  -- Visual row
  ('a0000000-0000-4000-8000-000000100110', 'a0000000-0000-4000-8000-000000000800', 'a0000000-0000-4000-8000-000000000818', 'a0000000-0000-4000-8000-000000000821', ''),
  ('a0000000-0000-4000-8000-000000100210', 'a0000000-0000-4000-8000-000000000800', 'a0000000-0000-4000-8000-000000000818', 'a0000000-0000-4000-8000-000000000822', ''),
  ('a0000000-0000-4000-8000-000000100310', 'a0000000-0000-4000-8000-000000000800', 'a0000000-0000-4000-8000-000000000818', 'a0000000-0000-4000-8000-000000000823', ''),
  ('a0000000-0000-4000-8000-000000100410', 'a0000000-0000-4000-8000-000000000800', 'a0000000-0000-4000-8000-000000000818', 'a0000000-0000-4000-8000-000000000826', ''),
  ('a0000000-0000-4000-8000-000000100510', 'a0000000-0000-4000-8000-000000000800', 'a0000000-0000-4000-8000-000000000818', 'a0000000-0000-4000-8000-000000000827', ''),
  ('a0000000-0000-4000-8000-000000100610', 'a0000000-0000-4000-8000-000000000800', 'a0000000-0000-4000-8000-000000000818', 'a0000000-0000-4000-8000-000000000824', ''),
  ('a0000000-0000-4000-8000-000000100710', 'a0000000-0000-4000-8000-000000000800', 'a0000000-0000-4000-8000-000000000818', 'a0000000-0000-4000-8000-000000000825', ''),
  ('a0000000-0000-4000-8000-000000100810', 'a0000000-0000-4000-8000-000000000800', 'a0000000-0000-4000-8000-000000000818', 'a0000000-0000-4000-8000-000000000829', ''),
  -- Step 1 — clearance email
  ('a0000000-0000-4000-8000-000000100103', 'a0000000-0000-4000-8000-000000000800', 'a0000000-0000-4000-8000-000000000831', 'a0000000-0000-4000-8000-000000000821', 'Receives email with steps for tutor clearances.'),
  ('a0000000-0000-4000-8000-000000100104', 'a0000000-0000-4000-8000-000000000800', 'a0000000-0000-4000-8000-000000000832', 'a0000000-0000-4000-8000-000000000821', 'Tutor supervisor team sends email for clearance checks.'),
  ('a0000000-0000-4000-8000-000000100106', 'a0000000-0000-4000-8000-000000000800', 'a0000000-0000-4000-8000-000000000833', 'a0000000-0000-4000-8000-000000000821', 'Email'),
  ('a0000000-0000-4000-8000-000000100109', 'a0000000-0000-4000-8000-000000000800', 'a0000000-0000-4000-8000-000000000836', 'a0000000-0000-4000-8000-000000000821', 'Child protection laws'),
  -- Step 2 — obtain clearances
  ('a0000000-0000-4000-8000-000000100203', 'a0000000-0000-4000-8000-000000000800', 'a0000000-0000-4000-8000-000000000831', 'a0000000-0000-4000-8000-000000000822', 'Obtains clearances.'),
  ('a0000000-0000-4000-8000-000000100204', 'a0000000-0000-4000-8000-000000000800', 'a0000000-0000-4000-8000-000000000832', 'a0000000-0000-4000-8000-000000000822', 'CMU HR Department sends over clearance materials.'),
  ('a0000000-0000-4000-8000-000000100206', 'a0000000-0000-4000-8000-000000000800', 'a0000000-0000-4000-8000-000000000833', 'a0000000-0000-4000-8000-000000000822', 'Clearance obtainment guide'),
  ('a0000000-0000-4000-8000-000000100209', 'a0000000-0000-4000-8000-000000000800', 'a0000000-0000-4000-8000-000000000836', 'a0000000-0000-4000-8000-000000000822', 'Child protection laws'),
  -- Step 3 — send clearances
  ('a0000000-0000-4000-8000-000000100303', 'a0000000-0000-4000-8000-000000000800', 'a0000000-0000-4000-8000-000000000831', 'a0000000-0000-4000-8000-000000000823', 'Sends clearances to CMU.'),
  ('a0000000-0000-4000-8000-000000100304', 'a0000000-0000-4000-8000-000000000800', 'a0000000-0000-4000-8000-000000000832', 'a0000000-0000-4000-8000-000000000823', 'Tutor supervisor team receives email with required clearances.'),
  ('a0000000-0000-4000-8000-000000100306', 'a0000000-0000-4000-8000-000000000800', 'a0000000-0000-4000-8000-000000000833', 'a0000000-0000-4000-8000-000000000823', 'Email'),
  ('a0000000-0000-4000-8000-000000100309', 'a0000000-0000-4000-8000-000000000800', 'a0000000-0000-4000-8000-000000000836', 'a0000000-0000-4000-8000-000000000823', 'Child protection laws'),
  -- Step 4 — schedule I-9 meeting
  ('a0000000-0000-4000-8000-000000100403', 'a0000000-0000-4000-8000-000000000800', 'a0000000-0000-4000-8000-000000000831', 'a0000000-0000-4000-8000-000000000826', 'Sets up I-9 meeting with CMU HR department.'),
  ('a0000000-0000-4000-8000-000000100406', 'a0000000-0000-4000-8000-000000000800', 'a0000000-0000-4000-8000-000000000833', 'a0000000-0000-4000-8000-000000000826', 'Workday'),
  ('a0000000-0000-4000-8000-000000100409', 'a0000000-0000-4000-8000-000000000800', 'a0000000-0000-4000-8000-000000000836', 'a0000000-0000-4000-8000-000000000826', 'Employment laws'),
  -- Step 5 — attend I-9 meeting
  ('a0000000-0000-4000-8000-000000100503', 'a0000000-0000-4000-8000-000000000800', 'a0000000-0000-4000-8000-000000000831', 'a0000000-0000-4000-8000-000000000827', 'Meets with CMU HR department for I-9 meeting.'),
  ('a0000000-0000-4000-8000-000000100504', 'a0000000-0000-4000-8000-000000000800', 'a0000000-0000-4000-8000-000000000832', 'a0000000-0000-4000-8000-000000000827', 'CMU HR department reviews employment forms at an I-9 meeting.'),
  ('a0000000-0000-4000-8000-000000100509', 'a0000000-0000-4000-8000-000000000800', 'a0000000-0000-4000-8000-000000000836', 'a0000000-0000-4000-8000-000000000827', 'Employment laws'),
  -- Step 6 — payroll setup
  ('a0000000-0000-4000-8000-000000100603', 'a0000000-0000-4000-8000-000000000800', 'a0000000-0000-4000-8000-000000000831', 'a0000000-0000-4000-8000-000000000824', 'Sets up payroll.'),
  ('a0000000-0000-4000-8000-000000100606', 'a0000000-0000-4000-8000-000000000800', 'a0000000-0000-4000-8000-000000000833', 'a0000000-0000-4000-8000-000000000824', 'Workday (employee view)'),
  ('a0000000-0000-4000-8000-000000100607', 'a0000000-0000-4000-8000-000000000800', 'a0000000-0000-4000-8000-000000000834', 'a0000000-0000-4000-8000-000000000824', 'PLUS supervisor team fills out corresponding paperwork for student employment in payroll software.'),
  ('a0000000-0000-4000-8000-000000100608', 'a0000000-0000-4000-8000-000000000800', 'a0000000-0000-4000-8000-000000000835', 'a0000000-0000-4000-8000-000000000824', 'Workday (employer view)'),
  -- Step 7 — join Slack
  ('a0000000-0000-4000-8000-000000100703', 'a0000000-0000-4000-8000-000000000800', 'a0000000-0000-4000-8000-000000000831', 'a0000000-0000-4000-8000-000000000825', 'Join PLUS tutor Slack channel.'),
  ('a0000000-0000-4000-8000-000000100704', 'a0000000-0000-4000-8000-000000000800', 'a0000000-0000-4000-8000-000000000832', 'a0000000-0000-4000-8000-000000000825', 'Tutor supervisor team sends invite to Slack workspace.'),
  ('a0000000-0000-4000-8000-000000100706', 'a0000000-0000-4000-8000-000000000800', 'a0000000-0000-4000-8000-000000000833', 'a0000000-0000-4000-8000-000000000825', E'Email\nSlack'),
  -- Step 8 — obtain PLUS app login
  ('a0000000-0000-4000-8000-000000100803', 'a0000000-0000-4000-8000-000000000800', 'a0000000-0000-4000-8000-000000000831', 'a0000000-0000-4000-8000-000000000829', 'Obtains login credentials for PLUS app.'),
  ('a0000000-0000-4000-8000-000000100804', 'a0000000-0000-4000-8000-000000000800', 'a0000000-0000-4000-8000-000000000832', 'a0000000-0000-4000-8000-000000000829', 'PLUS supervisor team provides login credentials to tutor.'),
  ('a0000000-0000-4000-8000-000000100806', 'a0000000-0000-4000-8000-000000000800', 'a0000000-0000-4000-8000-000000000833', 'a0000000-0000-4000-8000-000000000829', E'Email\nPLUS App')
on conflict (id) do update set
  content = excluded.content,
  layer_id = excluded.layer_id,
  step_id = excluded.step_id;

delete from public.cell_triggers
where source_cell_id in (
  select id from public.cells
  where path_id = 'a0000000-0000-4000-8000-000000000800'
)
or id like 'a0000000-0000-4000-8000-000000088%'
or id like 'a0000000-0000-4000-8000-000000086%';

insert into public.cell_triggers (id, source_cell_id, target_cell_id)
values
  ('a0000000-0000-4000-8000-000000088001', 'a0000000-0000-4000-8000-000000100104', 'a0000000-0000-4000-8000-000000100106'),
  ('a0000000-0000-4000-8000-000000088002', 'a0000000-0000-4000-8000-000000100106', 'a0000000-0000-4000-8000-000000100103'),
  ('a0000000-0000-4000-8000-000000088011', 'a0000000-0000-4000-8000-000000100103', 'a0000000-0000-4000-8000-000000100203'),
  ('a0000000-0000-4000-8000-000000088012', 'a0000000-0000-4000-8000-000000100203', 'a0000000-0000-4000-8000-000000100303'),
  ('a0000000-0000-4000-8000-000000088013', 'a0000000-0000-4000-8000-000000100303', 'a0000000-0000-4000-8000-000000100403'),
  ('a0000000-0000-4000-8000-000000088014', 'a0000000-0000-4000-8000-000000100403', 'a0000000-0000-4000-8000-000000100503'),
  ('a0000000-0000-4000-8000-000000088015', 'a0000000-0000-4000-8000-000000100503', 'a0000000-0000-4000-8000-000000100603'),
  ('a0000000-0000-4000-8000-000000088016', 'a0000000-0000-4000-8000-000000100603', 'a0000000-0000-4000-8000-000000100703'),
  ('a0000000-0000-4000-8000-000000088017', 'a0000000-0000-4000-8000-000000100703', 'a0000000-0000-4000-8000-000000100803'),
  ('a0000000-0000-4000-8000-000000088022', 'a0000000-0000-4000-8000-000000100204', 'a0000000-0000-4000-8000-000000100206'),
  ('a0000000-0000-4000-8000-000000088023', 'a0000000-0000-4000-8000-000000100206', 'a0000000-0000-4000-8000-000000100203'),
  ('a0000000-0000-4000-8000-000000088031', 'a0000000-0000-4000-8000-000000100303', 'a0000000-0000-4000-8000-000000100306'),
  ('a0000000-0000-4000-8000-000000088032', 'a0000000-0000-4000-8000-000000100306', 'a0000000-0000-4000-8000-000000100304'),
  ('a0000000-0000-4000-8000-000000088033', 'a0000000-0000-4000-8000-000000100403', 'a0000000-0000-4000-8000-000000100406'),
  ('a0000000-0000-4000-8000-000000088041', 'a0000000-0000-4000-8000-000000100503', 'a0000000-0000-4000-8000-000000100504'),
  ('a0000000-0000-4000-8000-000000088042', 'a0000000-0000-4000-8000-000000100603', 'a0000000-0000-4000-8000-000000100606'),
  ('a0000000-0000-4000-8000-000000088043', 'a0000000-0000-4000-8000-000000100607', 'a0000000-0000-4000-8000-000000100608'),
  ('a0000000-0000-4000-8000-000000088044', 'a0000000-0000-4000-8000-000000100608', 'a0000000-0000-4000-8000-000000100606'),
  ('a0000000-0000-4000-8000-000000088051', 'a0000000-0000-4000-8000-000000100704', 'a0000000-0000-4000-8000-000000100706'),
  ('a0000000-0000-4000-8000-000000088052', 'a0000000-0000-4000-8000-000000100706', 'a0000000-0000-4000-8000-000000100703'),
  ('a0000000-0000-4000-8000-000000088061', 'a0000000-0000-4000-8000-000000100804', 'a0000000-0000-4000-8000-000000100806'),
  ('a0000000-0000-4000-8000-000000088062', 'a0000000-0000-4000-8000-000000100806', 'a0000000-0000-4000-8000-000000100803')
on conflict (id) do update set
  source_cell_id = excluded.source_cell_id,
  target_cell_id = excluded.target_cell_id;

update public.cells
set links = jsonb_build_array(
  jsonb_build_object(
    'type', 'tech_description',
    'label', 'Email',
    'description', 'The tutor receives an email from the tutor supervisor team with instructions and links for completing required tutor clearances.',
    'picture', '/blueprint-images/shared/front-stage-tech/email-logo.png'
  )
)
where id = 'a0000000-0000-4000-8000-000000100106';

update public.cells
set links = jsonb_build_array(
  jsonb_build_object(
    'type', 'tech_description',
    'label', 'Clearance obtainment guide',
    'description', 'The tutor follows the clearance obtainment guide to complete required background checks and certifications through CMU HR.'
  )
)
where id = 'a0000000-0000-4000-8000-000000100206';

update public.cells
set links = jsonb_build_array(
  jsonb_build_object(
    'type', 'tech_description',
    'label', 'Email',
    'description', 'The tutor emails completed clearance documents to the tutor supervisor team for review.',
    'picture', '/blueprint-images/shared/front-stage-tech/email-logo.png'
  )
)
where id = 'a0000000-0000-4000-8000-000000100306';

update public.cells
set links = jsonb_build_array(
  jsonb_build_object(
    'type', 'tech_description',
    'label', 'Workday',
    'description', 'The tutor schedules an I-9 meeting with CMU HR through Workday.',
    'picture', '/blueprint-images/shared/front-stage-tech/workday-logo.png'
  )
)
where id = 'a0000000-0000-4000-8000-000000100406';

update public.cells
set links = jsonb_build_array(
  jsonb_build_object(
    'type', 'tech_description',
    'label', 'Workday (employee view)',
    'description', 'The tutor completes payroll onboarding tasks in Workday, including entering personal and employment information.',
    'picture', '/blueprint-images/shared/front-stage-tech/workday-logo.png'
  )
)
where id = 'a0000000-0000-4000-8000-000000100606';

update public.cells
set links = jsonb_build_array(
  jsonb_build_object(
    'type', 'tech_description',
    'label', 'Workday (employer view)',
    'description', 'The PLUS supervisor team completes corresponding student employment paperwork in Workday on the employer side.',
    'picture', '/blueprint-images/shared/front-stage-tech/workday-logo.png'
  )
)
where id = 'a0000000-0000-4000-8000-000000100608';

update public.cells
set links = jsonb_build_array(
  jsonb_build_object(
    'type', 'tech_description',
    'label', 'Email',
    'description', 'The tutor receives an email invitation to join the PLUS tutor Slack workspace.',
    'picture', '/blueprint-images/shared/front-stage-tech/email-logo.png'
  ),
  jsonb_build_object(
    'type', 'tech_description',
    'label', 'Slack',
    'description', 'The tutor accepts the Slack invite and joins the PLUS tutor channel to connect with the tutoring team.',
    'picture', '/blueprint-images/shared/front-stage-tech/slack-logo.png'
  )
)
where id = 'a0000000-0000-4000-8000-000000100706';

update public.cells
set links = jsonb_build_array(
  jsonb_build_object(
    'type', 'tech_description',
    'label', 'Email',
    'description', 'The tutor receives an email from the PLUS supervisor team with PLUS app login credentials and setup instructions.',
    'picture', '/blueprint-images/shared/front-stage-tech/email-logo.png'
  ),
  jsonb_build_object(
    'type', 'tech_description',
    'label', 'PLUS App',
    'description', 'The tutor uses the provided credentials to log in to the PLUS app for the first time.',
    'picture', '/blueprint-images/tech-setup/happy-path/plus-app/step-08-login.png',
    'url', 'https://www.figma.com/design/W0qzhXWxFsMwSJzkdV2yal/Design-System---Web-App-Specs?node-id=115-5206&t=Fyqmb2RX2B0cj9sv-1'
  )
)
where id = 'a0000000-0000-4000-8000-000000100806';

update public.cells
set description = 'Child protection laws require PLUS tutors to complete mandated background checks and clearances before working with students.'
where id in (
  'a0000000-0000-4000-8000-000000100109',
  'a0000000-0000-4000-8000-000000100209',
  'a0000000-0000-4000-8000-000000100309'
);

update public.cells
set description = 'Employment laws identity and employment eligibility verification upon hiring.'
where id in (
  'a0000000-0000-4000-8000-000000100409',
  'a0000000-0000-4000-8000-000000100509'
);

update public.cells
set picture = '/blueprint-images/tech-setup/happy-path/regular-tutor/step-01-receives-clearance-email.png'
where id = 'a0000000-0000-4000-8000-000000100103';

update public.cells
set picture = '/blueprint-images/tech-setup/happy-path/regular-tutor/step-02-obtains-clearances.png'
where id = 'a0000000-0000-4000-8000-000000100203';

update public.cells
set picture = '/blueprint-images/tech-setup/happy-path/regular-tutor/step-03-sends-clearances.png'
where id = 'a0000000-0000-4000-8000-000000100303';

update public.cells
set picture = '/blueprint-images/tech-setup/happy-path/regular-tutor/step-04-sets-up-i9-meeting.png'
where id = 'a0000000-0000-4000-8000-000000100403';

update public.cells
set picture = '/blueprint-images/tech-setup/happy-path/regular-tutor/step-05-attends-i9-meeting.png'
where id = 'a0000000-0000-4000-8000-000000100503';

update public.cells
set picture = '/blueprint-images/tech-setup/happy-path/regular-tutor/step-06-sets-up-payroll.png'
where id = 'a0000000-0000-4000-8000-000000100603';

update public.cells
set picture = '/blueprint-images/tech-setup/happy-path/regular-tutor/step-07-joins-slack.png'
where id = 'a0000000-0000-4000-8000-000000100703';

update public.cells
set picture = '/blueprint-images/tech-setup/happy-path/regular-tutor/step-08-obtains-plus-app-login.png'
where id = 'a0000000-0000-4000-8000-000000100803';
