-- Tech Setup Happy Path — sentence-case capitalization fixes.

update public.cells
set content = 'Tutor supervisor team sends email for clearance checks'
where id = 'a0000000-0000-4000-8000-000000100104';

update public.cells
set content = 'Child protection laws'
where id in (
  'a0000000-0000-4000-8000-000000100109',
  'a0000000-0000-4000-8000-000000100209',
  'a0000000-0000-4000-8000-000000100309'
);

update public.cells
set content = 'CMU HR department'
where id = 'a0000000-0000-4000-8000-000000100204';

update public.cells
set content = 'Clearance obtainment guide'
where id = 'a0000000-0000-4000-8000-000000100206';

update public.cells
set content = 'Tutor supervisor team receives email with required clearances'
where id = 'a0000000-0000-4000-8000-000000100304';

update public.cells
set content = 'Sets up I-9 meeting with CMU HR department'
where id = 'a0000000-0000-4000-8000-000000100403';

update public.cells
set content = 'Employment laws'
where id in (
  'a0000000-0000-4000-8000-000000100409',
  'a0000000-0000-4000-8000-000000100509'
);

update public.cells
set content = 'Meets with CMU HR department for I-9 meeting'
where id = 'a0000000-0000-4000-8000-000000100503';

update public.cells
set content = 'CMU HR department reviews employment forms at an I-9 meeting'
where id = 'a0000000-0000-4000-8000-000000100504';

update public.cells
set content = 'Workday (employee view)'
where id = 'a0000000-0000-4000-8000-000000100606';

update public.cells
set content = 'PLUS supervisor team fills out corresponding paperwork for student employment in payroll software'
where id = 'a0000000-0000-4000-8000-000000100607';

update public.cells
set content = 'Workday (employer view)'
where id = 'a0000000-0000-4000-8000-000000100608';

update public.cells
set content = 'Join PLUS tutor Slack channel'
where id = 'a0000000-0000-4000-8000-000000100703';

update public.cells
set content = 'Tutor supervisor team sends invite to Slack workspace'
where id = 'a0000000-0000-4000-8000-000000100704';

update public.cells
set content = 'PLUS supervisor team provides login credentials to tutor'
where id = 'a0000000-0000-4000-8000-000000100804';

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
    'description', 'The tutor uses the provided credentials to log in to the PLUS app for the first time.'
  )
)
where id = 'a0000000-0000-4000-8000-000000100806';
