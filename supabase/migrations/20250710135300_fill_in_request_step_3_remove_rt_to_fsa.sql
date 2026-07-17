-- Fill-in Request step 3: remove Regular Tutor ↔ Front Stage Actions.

delete from public.cell_triggers
where id = 'a0000000-0000-4000-8000-000000094005';
