-- Reporting an Issue — Front Stage Tech pill descriptions (steps 1 and 4).

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
    'description', 'The tutor might receive Email from PLUS staff following up on the reported issue.',
    'picture', '/blueprint-images/shared/front-stage-tech/email-logo.png'
  ),
  jsonb_build_object(
    'type', 'tech_description',
    'label', 'Zoom',
    'description', 'PLUS Staff might request for tutor to join a Zoom meeting to discuss the reported issue.',
    'picture', '/blueprint-images/goal-setting/shared/front-stage-tech/zoom-logo.png'
  )
)
where id = 'a0000000-0000-4000-8000-0000001d0406';
