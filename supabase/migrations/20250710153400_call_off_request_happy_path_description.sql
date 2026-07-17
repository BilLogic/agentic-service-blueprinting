-- Call-off Request Happy Path — update path description.

update public.paths
set description = 'Tutor calls off shift for upcoming session.'
where id = 'a0000000-0000-4000-8000-000000000808';
