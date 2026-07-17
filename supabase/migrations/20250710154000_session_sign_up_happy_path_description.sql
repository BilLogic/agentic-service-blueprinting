-- Session Sign Up Happy Path — update path description.

update public.paths
set description =
  'Tutor signs up for recurring sessions for the rest of the semester.'
where id = 'a0000000-0000-4000-8000-000000000805';
