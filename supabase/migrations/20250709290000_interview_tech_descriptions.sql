-- Interview & Offer — Happy Path tech pill descriptions.

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
  ),
  jsonb_build_object(
    'type', 'tech_description',
    'label', 'Email',
    'description', 'The tutor supervisor team drafts decision letters in email to send to the candidates.',
    'picture', '/blueprint-images/shared/front-stage-tech/email-logo.png'
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
