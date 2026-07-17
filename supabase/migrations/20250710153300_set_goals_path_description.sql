-- Set Goals path — update path description.

update public.paths
set description =
  'No prior personalized goals set and start of a new goal cycle.'
where id = 'a0000000-0000-4000-8000-000000000811';
