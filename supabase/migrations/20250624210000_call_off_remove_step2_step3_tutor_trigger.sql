-- Remove step 2 → step 3 Regular Tutor connection on Call-off Request happy path

delete from public.cell_triggers
where id = 'a0000000-0000-4000-8000-000000095003';
