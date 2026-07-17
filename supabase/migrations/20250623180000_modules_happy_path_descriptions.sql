-- Onboarding Modules and Lesson Modules happy path descriptions
update public.paths
set
  description = 'Tutor succesfully completes onboarding modules.'
where id = 'a0000000-0000-4000-8000-000000000801';

update public.paths
set
  description = 'Tutor succesfully completes lesson modules.'
where id = 'a0000000-0000-4000-8000-000000000802';
