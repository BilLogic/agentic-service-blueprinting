-- Onboarding Modules step 6 — keep Notion only on Back Stage Tech;
-- remove Back Stage Actions → Front Stage Tech connection.

update public.cells
set content = 'Notion'
where id = 'a0000000-0000-4000-8000-000000110608';

delete from public.cell_triggers
where id = 'a0000000-0000-4000-8000-000000089062';
