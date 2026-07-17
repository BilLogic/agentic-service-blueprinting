-- Call-off Request: remove Back Stage Actions step 2 → step 5 connector.

delete from public.cell_triggers
where id = 'a0000000-0000-4000-8000-000000095004';
