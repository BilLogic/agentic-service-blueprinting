-- Tech Setup Happy Path — Front Stage Tech and Back Stage Tech pill descriptions.

update public.cells
set links = jsonb_build_array(
  jsonb_build_object(
    'type', 'tech_description',
    'label', 'Email',
    'description', 'The tutor receives an email from the Tutor Supervisor team with instructions and links for completing required tutor clearances.',
    'picture', '/blueprint-images/shared/front-stage-tech/email-logo.png'
  )
)
where id = 'a0000000-0000-4000-8000-000000100106';

update public.cells
set links = jsonb_build_array(
  jsonb_build_object(
    'type', 'tech_description',
    'label', 'Clearance Obtainment guide',
    'description', 'The tutor follows the clearance obtainment guide to complete required background checks and certifications through CMU HR.'
  )
)
where id = 'a0000000-0000-4000-8000-000000100206';

update public.cells
set links = jsonb_build_array(
  jsonb_build_object(
    'type', 'tech_description',
    'label', 'Email',
    'description', 'The tutor emails completed clearance documents to the Tutor Supervisor team for review.',
    'picture', '/blueprint-images/shared/front-stage-tech/email-logo.png'
  )
)
where id = 'a0000000-0000-4000-8000-000000100306';

update public.cells
set links = jsonb_build_array(
  jsonb_build_object(
    'type', 'tech_description',
    'label', 'Workday (Employee View)',
    'description', 'The tutor completes payroll onboarding tasks in Workday, including entering personal and employment information.',
    'picture', '/blueprint-images/shared/front-stage-tech/workday-logo.png'
  )
)
where id = 'a0000000-0000-4000-8000-000000100606';

update public.cells
set links = jsonb_build_array(
  jsonb_build_object(
    'type', 'tech_description',
    'label', 'Workday (Employer View)',
    'description', 'The PLUS Supervisor Team completes corresponding student employment paperwork in Workday on the employer side.',
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
    'description', 'The tutor receives an email from the PLUS Supervisor team with PLUS app login credentials and setup instructions.',
    'picture', '/blueprint-images/shared/front-stage-tech/email-logo.png'
  ),
  jsonb_build_object(
    'type', 'tech_description',
    'label', 'PLUS App',
    'description', 'The tutor uses the provided credentials to log in to the PLUS app for the first time.'
  )
)
where id = 'a0000000-0000-4000-8000-000000100806';
