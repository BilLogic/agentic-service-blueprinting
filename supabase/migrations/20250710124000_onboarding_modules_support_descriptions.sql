-- Onboarding Modules Happy Path — Support Actions descriptions.

update public.cells
set description = 'The Dev Team builds the PLUS app features for opening onboarding modules, and the Design Team creates the screens and flows for that experience.'
where id in (
  'a0000000-0000-4000-8000-000000110109',
  'a0000000-0000-4000-8000-000000110209'
);

update public.cells
set description = 'Researchers help guide how onboarding lesson content is designed and delivered so tutors learn effectively.'
where id in (
  'a0000000-0000-4000-8000-000000110309',
  'a0000000-0000-4000-8000-000000110409',
  'a0000000-0000-4000-8000-000000110509'
);

update public.cells
set
  description = null,
  links = jsonb_build_array(
    jsonb_build_object(
      'type', 'tech_description',
      'label', 'Researchers help guide instructional implementation',
      'description', 'Researchers help guide how onboarding lesson content is designed and delivered so tutors learn effectively.'
    ),
    jsonb_build_object(
      'type', 'tech_description',
      'label', 'Dev Team',
      'description', 'The Dev Team builds the PLUS app features for opening onboarding modules, and the Design Team creates the screens and flows for that experience.'
    ),
    jsonb_build_object(
      'type', 'tech_description',
      'label', 'Design Team',
      'description', 'The Dev Team builds the PLUS app features for opening onboarding modules, and the Design Team creates the screens and flows for that experience.'
    )
  )
where id = 'a0000000-0000-4000-8000-000000110609';
