-- Call-off Request Happy Path — tech pill descriptions.

update public.cells
set links = jsonb_build_array(
  jsonb_build_object(
    'type', 'tech_description',
    'label', 'Shift Swap Google Form',
    'description', 'The tutor submits an early call-off through the Shift Swap Google Form so the tutor supervisor team can review the request and find coverage.',
    'picture', '/blueprint-images/shared/front-stage-tech/google-form-logo.png'
  )
)
where id = 'a0000000-0000-4000-8000-000000170206';

update public.cells
set links = jsonb_build_array(
  jsonb_build_object(
    'type', 'tech_description',
    'label', 'Email',
    'description', 'When there are fewer than 12 hours before the session, the tutor emails the tutor supervisor team to request a call-off.',
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
    'description', 'The tutor supervisor team tracks coverage and records whether the call-off is excused or unexcused in a Google Spreadsheet.'
  )
)
where id = 'a0000000-0000-4000-8000-000000170508';

update public.cells
set links = jsonb_build_array(
  jsonb_build_object(
    'type', 'tech_description',
    'label', 'Email',
    'description', 'The tutor supervisor team emails the tutor with the excused or unexcused decision.',
    'picture', '/blueprint-images/shared/front-stage-tech/email-logo.png'
  )
)
where id = 'a0000000-0000-4000-8000-000000170606';
