-- Tech Setup Happy Path — PLUS App step 8 login screenshot.

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
    'picture', '/blueprint-images/tech-setup/happy-path/plus-app/step-08-login.png'
  )
)
where id = 'a0000000-0000-4000-8000-000000100806';
