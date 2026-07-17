-- Tech Setup Happy Path — PLUS App step 8 Figma link.

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
