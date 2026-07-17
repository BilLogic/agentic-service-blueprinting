-- Onboarding Modules: update Support Actions descriptions (steps 1–2 and 6).

update public.cells
set description = 'The Dev Team builds the PLUS app features onboarding modules, and the Design Team creates the screens and flows for that experience.'
where id in (
  'a0000000-0000-4000-8000-000000110109',
  'a0000000-0000-4000-8000-000000110209'
);

update public.cells
set description = E'Researchers help guide how onboarding lesson content is designed and delivered so tutors learn effectively.\n\nThe Dev Team builds the PLUS app features for onboarding modules, and the Design Team creates the screens and flows for that experience.'
where id = 'a0000000-0000-4000-8000-000000110609';
