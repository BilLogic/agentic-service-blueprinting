-- Tech Setup step 2 — remove Regular Tutor → Front Stage Actions connection.

delete from public.cell_triggers
where id = 'a0000000-0000-4000-8000-000000088021';
