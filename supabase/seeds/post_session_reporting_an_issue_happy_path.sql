-- Post-session → Reporting an Issue scenario — Happy Path
-- Stable keys map to fixed UUIDs in src/data/reportingAnIssueHappyPathFallback.ts

insert into public.paths (id, service_scenario_id, name, description, path_type)
values (
  'a0000000-0000-4000-8000-00000000080f',
  'a0000000-0000-4000-8000-000000000207',
  'Happy Path',
  'Tutor reports an issue after tutoring session.',
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
  where path_id = 'a0000000-0000-4000-8000-00000000080f'
);

delete from public.cells
where path_id = 'a0000000-0000-4000-8000-00000000080f';

delete from public.layers
where path_id = 'a0000000-0000-4000-8000-00000000080f';

insert into public.layers (id, path_id, name, row_position)
values
  ('a0000000-0000-4000-8000-000000000910', 'a0000000-0000-4000-8000-00000000080f', 'Visual', 0),
  ('a0000000-0000-4000-8000-000000000917', 'a0000000-0000-4000-8000-00000000080f', 'Lead Tutor', 1),
  ('a0000000-0000-4000-8000-000000000911', 'a0000000-0000-4000-8000-00000000080f', 'Regular Tutor', 2),
  ('a0000000-0000-4000-8000-000000000913', 'a0000000-0000-4000-8000-00000000080f', 'Front Stage Tech', 3),
  ('a0000000-0000-4000-8000-000000000912', 'a0000000-0000-4000-8000-00000000080f', 'Front Stage Actions', 4),
  ('a0000000-0000-4000-8000-000000000915', 'a0000000-0000-4000-8000-00000000080f', 'Back Stage Tech', 5),
  ('a0000000-0000-4000-8000-000000000914', 'a0000000-0000-4000-8000-00000000080f', 'Back Stage Actions', 6),
  ('a0000000-0000-4000-8000-000000000916', 'a0000000-0000-4000-8000-00000000080f', 'Support Actions', 7)
on conflict (id) do update set
  name = excluded.name,
  row_position = excluded.row_position,
  path_id = excluded.path_id;

insert into public.steps (id, service_scenario_id, name)
values
  ('a0000000-0000-4000-8000-000000000988', 'a0000000-0000-4000-8000-000000000207', 'Reach out'),
  ('a0000000-0000-4000-8000-000000000990', 'a0000000-0000-4000-8000-000000000207', 'Resolve concern'),
  ('a0000000-0000-4000-8000-000000000991', 'a0000000-0000-4000-8000-000000000207', 'Request assistance'),
  ('a0000000-0000-4000-8000-000000000993', 'a0000000-0000-4000-8000-000000000207', 'Follow up')
on conflict (id) do update set
  name = excluded.name,
  service_scenario_id = excluded.service_scenario_id;

delete from public.path_steps
where path_id = 'a0000000-0000-4000-8000-00000000080f';

insert into public.path_steps (path_id, step_id, column_position)
values
  ('a0000000-0000-4000-8000-00000000080f', 'a0000000-0000-4000-8000-000000000988', 1),
  ('a0000000-0000-4000-8000-00000000080f', 'a0000000-0000-4000-8000-000000000991', 2),
  ('a0000000-0000-4000-8000-00000000080f', 'a0000000-0000-4000-8000-000000000993', 3),
  ('a0000000-0000-4000-8000-00000000080f', 'a0000000-0000-4000-8000-000000000990', 4)
on conflict (path_id, step_id) do update set
  column_position = excluded.column_position;

insert into public.cells (id, path_id, layer_id, step_id, content)
values
  ('a0000000-0000-4000-8000-0000001d0110', 'a0000000-0000-4000-8000-00000000080f', 'a0000000-0000-4000-8000-000000000910', 'a0000000-0000-4000-8000-000000000988', ''),
  ('a0000000-0000-4000-8000-0000001d0102', 'a0000000-0000-4000-8000-00000000080f', 'a0000000-0000-4000-8000-000000000917', 'a0000000-0000-4000-8000-000000000988', 'Reach out to PLUS staff with any concerns.'),
  ('a0000000-0000-4000-8000-0000001d0103', 'a0000000-0000-4000-8000-00000000080f', 'a0000000-0000-4000-8000-000000000911', 'a0000000-0000-4000-8000-000000000988', 'Reach out to PLUS staff with any concerns.'),
  ('a0000000-0000-4000-8000-0000001d0104', 'a0000000-0000-4000-8000-00000000080f', 'a0000000-0000-4000-8000-000000000912', 'a0000000-0000-4000-8000-000000000988', 'PLUS tutor supervisor team evaluates concern and reaches out as needed.'),
  ('a0000000-0000-4000-8000-0000001d0106', 'a0000000-0000-4000-8000-00000000080f', 'a0000000-0000-4000-8000-000000000913', 'a0000000-0000-4000-8000-000000000988', 'Slack, Email'),
  ('a0000000-0000-4000-8000-0000001d0210', 'a0000000-0000-4000-8000-00000000080f', 'a0000000-0000-4000-8000-000000000910', 'a0000000-0000-4000-8000-000000000990', ''),
  ('a0000000-0000-4000-8000-0000001d0207', 'a0000000-0000-4000-8000-00000000080f', 'a0000000-0000-4000-8000-000000000914', 'a0000000-0000-4000-8000-000000000990', 'PLUS supervisor team is able to resolve concern.'),
  ('a0000000-0000-4000-8000-0000001d0310', 'a0000000-0000-4000-8000-00000000080f', 'a0000000-0000-4000-8000-000000000910', 'a0000000-0000-4000-8000-000000000991', ''),
  ('a0000000-0000-4000-8000-0000001d0304', 'a0000000-0000-4000-8000-00000000080f', 'a0000000-0000-4000-8000-000000000912', 'a0000000-0000-4000-8000-000000000991', 'If needed, PLUS staff might request assistance.'),
  ('a0000000-0000-4000-8000-0000001d0410', 'a0000000-0000-4000-8000-00000000080f', 'a0000000-0000-4000-8000-000000000910', 'a0000000-0000-4000-8000-000000000993', ''),
  ('a0000000-0000-4000-8000-0000001d0402', 'a0000000-0000-4000-8000-00000000080f', 'a0000000-0000-4000-8000-000000000917', 'a0000000-0000-4000-8000-000000000993', 'Processes request and follows up on request.'),
  ('a0000000-0000-4000-8000-0000001d0403', 'a0000000-0000-4000-8000-00000000080f', 'a0000000-0000-4000-8000-000000000911', 'a0000000-0000-4000-8000-000000000993', 'Processes request and follows up on request.'),
  ('a0000000-0000-4000-8000-0000001d0406', 'a0000000-0000-4000-8000-00000000080f', 'a0000000-0000-4000-8000-000000000913', 'a0000000-0000-4000-8000-000000000993', 'Slack, Email, Zoom')
on conflict (id) do update set
  path_id = excluded.path_id,
  layer_id = excluded.layer_id,
  step_id = excluded.step_id,
  content = excluded.content;

insert into public.cell_triggers (id, source_cell_id, target_cell_id)
values
  ('a0000000-0000-4000-8000-000000098070', 'a0000000-0000-4000-8000-0000001d0103', 'a0000000-0000-4000-8000-0000001d0106'),
  ('a0000000-0000-4000-8000-000000098074', 'a0000000-0000-4000-8000-0000001d0102', 'a0000000-0000-4000-8000-0000001d0106'),
  ('a0000000-0000-4000-8000-000000098076', 'a0000000-0000-4000-8000-0000001d0106', 'a0000000-0000-4000-8000-0000001d0104'),
  ('a0000000-0000-4000-8000-000000098078', 'a0000000-0000-4000-8000-0000001d0104', 'a0000000-0000-4000-8000-0000001d0304'),
  ('a0000000-0000-4000-8000-000000098081', 'a0000000-0000-4000-8000-0000001d0104', 'a0000000-0000-4000-8000-0000001d0207'),
  ('a0000000-0000-4000-8000-000000098077', 'a0000000-0000-4000-8000-0000001d0304', 'a0000000-0000-4000-8000-0000001d0406'),
  ('a0000000-0000-4000-8000-000000098073', 'a0000000-0000-4000-8000-0000001d0406', 'a0000000-0000-4000-8000-0000001d0403'),
  ('a0000000-0000-4000-8000-000000098075', 'a0000000-0000-4000-8000-0000001d0406', 'a0000000-0000-4000-8000-0000001d0402'),
  ('a0000000-0000-4000-8000-000000098079', 'a0000000-0000-4000-8000-0000001d0402', 'a0000000-0000-4000-8000-0000001d0207'),
  ('a0000000-0000-4000-8000-000000098080', 'a0000000-0000-4000-8000-0000001d0403', 'a0000000-0000-4000-8000-0000001d0207')
on conflict (id) do update set
  source_cell_id = excluded.source_cell_id,
  target_cell_id = excluded.target_cell_id;

update public.cells
set picture = '/blueprint-images/reporting-an-issue/happy-path/lead-tutor/step-01-reach-out.png'
where id = 'a0000000-0000-4000-8000-0000001d0102';

update public.cells
set picture = '/blueprint-images/reporting-an-issue/happy-path/lead-tutor/step-03-follow-up.png'
where id = 'a0000000-0000-4000-8000-0000001d0402';

update public.cells
set picture = '/blueprint-images/reporting-an-issue/happy-path/regular-tutor/step-01-reach-out.png'
where id = 'a0000000-0000-4000-8000-0000001d0103';

update public.cells
set picture = '/blueprint-images/reporting-an-issue/happy-path/regular-tutor/step-03-follow-up.png'
where id = 'a0000000-0000-4000-8000-0000001d0403';

update public.cells
set links = jsonb_build_array(
  jsonb_build_object(
    'type', 'tech_description',
    'label', 'Slack',
    'description', 'The tutor uses Slack to reach out to PLUS staff and share any session concerns after tutoring.',
    'picture', '/blueprint-images/shared/front-stage-tech/slack-logo.png'
  ),
  jsonb_build_object(
    'type', 'tech_description',
    'label', 'Email',
    'description', 'The tutor uses email to reach out to PLUS staff and report any session concerns after tutoring.',
    'picture', '/blueprint-images/shared/front-stage-tech/email-logo.png'
  )
)
where id = 'a0000000-0000-4000-8000-0000001d0106';

update public.cells
set links = jsonb_build_array(
  jsonb_build_object(
    'type', 'tech_description',
    'label', 'Slack',
    'description', 'The tutor might receive Slack message from PLUS staff following up on the reported issue.',
    'picture', '/blueprint-images/shared/front-stage-tech/slack-logo.png'
  ),
  jsonb_build_object(
    'type', 'tech_description',
    'label', 'Email',
    'description', 'The tutor might receive email from PLUS staff following up on the reported issue.',
    'picture', '/blueprint-images/shared/front-stage-tech/email-logo.png'
  ),
  jsonb_build_object(
    'type', 'tech_description',
    'label', 'Zoom',
    'description', 'PLUS staff might request for tutor to join a Zoom meeting to discuss the reported issue.',
    'picture', '/blueprint-images/goal-setting/shared/front-stage-tech/zoom-logo.png'
  )
)
where id = 'a0000000-0000-4000-8000-0000001d0406';

update public.cells
set links = jsonb_build_array(
  jsonb_build_object(
    'type', 'url',
    'label', 'Onboarding Module 2',
    'url', 'https://plus-tutors.notion.site/Module-2-Your-Role-at-PLUS-26fb7cca498280daac2fd7efc191708d'
  )
)
where id in (
  'a0000000-0000-4000-8000-0000001d0102',
  'a0000000-0000-4000-8000-0000001d0402'
);
