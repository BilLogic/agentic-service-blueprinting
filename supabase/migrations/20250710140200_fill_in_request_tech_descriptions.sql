-- Fill-in Request Happy Path — tech pill descriptions.

update public.cells
set links = jsonb_build_array(
  jsonb_build_object(
    'type', 'tech_description',
    'label', 'Shift Swap Google Form',
    'description', 'The call-off request is submitted through the Shift Swap Google Form, which lets the tutor supervisor team know they need to find coverage for that session.',
    'picture', '/blueprint-images/shared/front-stage-tech/google-form-logo.png'
  )
)
where id = 'a0000000-0000-4000-8000-000000150106';

update public.cells
set links = jsonb_build_array(
  jsonb_build_object(
    'type', 'tech_description',
    'label', 'Google Spreadsheet',
    'description', 'The tutor supervisor team reviews tutor availabilities in a Google Spreadsheet to identify who can fill in.'
  )
)
where id = 'a0000000-0000-4000-8000-000000150108';

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
    'description', 'The tutor supervisor team adds that tutor to the session in the PLUS app. Once added, the tutor accesses the session details in the PLUS app.'
  )
)
where id = 'a0000000-0000-4000-8000-000000150406';
