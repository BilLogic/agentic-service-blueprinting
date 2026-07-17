-- Onboarding Modules — step 6 Support Actions combined description.

update public.cells
set
  links = '[]'::jsonb,
  description = E'Researchers help guide how onboarding lesson content is designed and delivered so tutors learn effectively.\n\nThe Dev Team builds the PLUS app features for opening onboarding modules, and the Design Team creates the screens and flows for that experience.'
where id = 'a0000000-0000-4000-8000-000000110609';
