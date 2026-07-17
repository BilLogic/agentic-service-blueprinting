-- Call-off Request step 2: remove Regular Tutor → Back Stage Actions.

delete from public.cell_triggers
where id = 'a0000000-0000-4000-8000-000000095002';
