-- Before Students Join step 4: remove Lead Tutor → Front Stage Tech trigger.

delete from public.cell_triggers
where id = 'a0000000-0000-4000-8000-000000096046';
