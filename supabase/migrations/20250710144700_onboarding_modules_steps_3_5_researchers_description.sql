-- Onboarding Modules steps 3–5: update Researchers Support Actions description.

update public.cells
set description = 'Researchers help guide how onboarding content is designed and delivered so tutors learn effectively.'
where id in (
  'a0000000-0000-4000-8000-000000110309',
  'a0000000-0000-4000-8000-000000110409',
  'a0000000-0000-4000-8000-000000110509'
);
