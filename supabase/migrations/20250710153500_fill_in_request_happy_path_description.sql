-- Fill-in Request Happy Path — update path description.

update public.paths
set description = 'Tutor is requested to fill in for a session.'
where id = 'a0000000-0000-4000-8000-000000000807';
