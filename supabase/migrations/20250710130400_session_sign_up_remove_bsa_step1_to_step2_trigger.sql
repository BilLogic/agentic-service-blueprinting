-- Session Sign Up: remove Back Stage Actions step 1 → step 2 trigger.

delete from public.cell_triggers
where id = 'a0000000-0000-4000-8000-000000092011';
