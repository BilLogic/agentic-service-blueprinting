-- Standard Scheduling step 2: remove Front Stage Actions → Regular Tutor trigger.

delete from public.cell_triggers
where id = 'a0000000-0000-4000-8000-000000093002';
