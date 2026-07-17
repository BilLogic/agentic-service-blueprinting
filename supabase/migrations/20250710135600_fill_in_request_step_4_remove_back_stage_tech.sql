-- Fill-in Request step 4: remove Back Stage Tech (PLUS App) and its trigger.

delete from public.cell_triggers
where id = 'a0000000-0000-4000-8000-000000094007';

delete from public.cells
where id = 'a0000000-0000-4000-8000-000000150408';
