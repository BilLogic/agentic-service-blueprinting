-- Check Goals path — update path description.

update public.paths
set description = 'Goals already set, but deadline not reached.'
where id = 'a0000000-0000-4000-8000-000000000814';
